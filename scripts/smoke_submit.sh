#!/usr/bin/env bash
# smoke_submit.sh — Phase 1 acceptance: submit one real bundle, verify storage output.
# Usage: bash scripts/smoke_submit.sh [API_BASE]
# Default API_BASE: http://127.0.0.1:8000

set -euo pipefail

API="${1:-http://127.0.0.1:8000}"
SUBMIT_ID="$(python3 -c 'import uuid; print(uuid.uuid4())')"
GROUP_KEY="SMOKE$(date +%s)"
STORAGE_ROOT="${STORAGE_ROOT:-storage}"

# Create temp images (minimal valid JPEG header)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
for role in product tryon retouched; do
  printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00' > "$TMP/${role}.jpg"
done

BUNDLES="[{\"group_key\":\"${GROUP_KEY}\",\"files\":{\"product\":\"file_${GROUP_KEY}_product\",\"tryon\":\"file_${GROUP_KEY}_tryon\",\"retouched\":\"file_${GROUP_KEY}_retouched\"}}]"

echo "→ Submitting bundle group_key=${GROUP_KEY} submit_id=${SUBMIT_ID}"

RESPONSE=$(curl -sf -X POST "${API}/api/bundles/batch" \
  -F "designer_id=smoke-test" \
  -F "business_line=春季女装" \
  -F "category=连衣裙" \
  -F "optional_notes=" \
  -F "client_submit_id=${SUBMIT_ID}" \
  -F "bundles=${BUNDLES}" \
  -F "file_${GROUP_KEY}_product=@${TMP}/product.jpg;type=image/jpeg" \
  -F "file_${GROUP_KEY}_tryon=@${TMP}/tryon.jpg;type=image/jpeg" \
  -F "file_${GROUP_KEY}_retouched=@${TMP}/retouched.jpg;type=image/jpeg")

echo "← Response: ${RESPONSE}"

TASK_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['accepted'][0]['task_id'])")
DEST="${STORAGE_ROOT}/raw_ingestion/${TASK_ID}"

echo "→ Checking storage at ${DEST}"
[ -d "$DEST" ] || { echo "FAIL: directory not found: ${DEST}"; exit 1; }
[ -f "${DEST}/metadata.json" ] || { echo "FAIL: metadata.json missing"; exit 1; }

python3 - <<PYEOF
import json, sys
meta = json.loads(open("${DEST}/metadata.json").read())
required = ["task_id","submit_id","designer_id","business_line","category","group_key","upload_time","has_annotation","files"]
missing = [k for k in required if k not in meta]
if missing:
    print(f"FAIL: metadata.json missing fields: {missing}")
    sys.exit(1)
for role in ["product","tryon","retouched"]:
    if role not in meta["files"]:
        print(f"FAIL: files.{role} missing from metadata")
        sys.exit(1)
    fm = meta["files"][role]
    for field in ["filename","mime","sha256","bytes"]:
        if field not in fm:
            print(f"FAIL: files.{role}.{field} missing")
            sys.exit(1)
print("OK: metadata.json fields complete")
PYEOF

echo "✓ smoke_submit PASSED — task_id=${TASK_ID}"
