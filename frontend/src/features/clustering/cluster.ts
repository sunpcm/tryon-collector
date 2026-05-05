import type {
  FileMeta,
  Role,
  MatrixCell,
  MatrixRow,
  ClusterResult,
  ClusterConfig,
} from '@/types';
import { ROLES, REQUIRED_ROLES } from '@/types';

const DEFAULT_GROUP_KEY_REGEX = /(?<groupKey>[A-Z0-9]{4,}[-_]?\d{2,})/i;

const DEFAULT_ROLE_KEYWORDS: Record<Role, string[]> = {
  product: ['product', '原图', '商品图', 'ref', 'reference', 'raw'],
  tryon: ['tryon', 'try-on', '试穿', 'ai', 'gen'],
  retouched: ['retouched', '精修', 'final', 'fixed', 'pr'],
  annotated: ['annotated', '涂鸦', '标注', 'mark', 'prompt'],
};

// Remove the groupKey portion from the filename to isolate the role segment.
// e.g. "SKU12345-product.jpg" with groupKey "SKU12345" → "-product.jpg"
function stripGroupKey(fileName: string, groupKey: string): string {
  const idx = fileName.toLowerCase().indexOf(groupKey.toLowerCase());
  if (idx === -1) return fileName;
  return fileName.slice(0, idx) + fileName.slice(idx + groupKey.length);
}

function isChinese(s: string): boolean {
  return /[一-鿿]/.test(s);
}

function keywordMatches(text: string, keyword: string): boolean {
  const lower = text.toLowerCase();
  const kw = keyword.toLowerCase();
  if (isChinese(kw)) {
    return lower.includes(kw);
  }
  // Latin keywords: match as a whole segment between separators (start/end/_/-/. / )
  // e.g. "product" in "-product.jpg" ✓, "pr" in "-product.jpg" ✗
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|[\\s_\\-.])${escaped}(?:[\\s_\\-.]|$)`, 'i');
  return re.test(text);
}

function detectRole(
  roleSegment: string,
  keywords: Record<Role, string[]>
): Role | null {
  // Sort keywords by length descending so longer keywords match first
  const sorted: Array<{ kw: string; role: Role }> = [];
  for (const role of ROLES) {
    for (const kw of keywords[role]) {
      sorted.push({ kw, role });
    }
  }
  sorted.sort((a, b) => b.kw.length - a.kw.length);

  for (const { kw, role } of sorted) {
    if (keywordMatches(roleSegment, kw)) {
      return role;
    }
  }
  return null;
}

function extractGroupKey(fileName: string, regex: RegExp): string | null {
  const match = fileName.match(regex);
  return match?.groups?.groupKey ?? null;
}

function extractTrailingNumber(fileName: string): number {
  const match = fileName.match(/(\d+)(?=\.\w+$)/);
  return match ? parseInt(match[1], 10) : Infinity;
}

function sortCandidates(files: FileMeta[]): FileMeta[] {
  return [...files].sort(
    (a, b) => extractTrailingNumber(a.name) - extractTrailingNumber(b.name)
  );
}

function buildRow(
  groupKey: string,
  roleFiles: Map<Role, FileMeta[]>
): MatrixRow {
  const cells = {} as Record<Role, MatrixCell>;

  for (const role of ROLES) {
    const files = roleFiles.get(role) ?? [];
    const sorted = sortCandidates(files);
    cells[role] = {
      main: sorted[0],
      candidates: sorted,
    };
  }

  const missingRequired = REQUIRED_ROLES.some(r => !cells[r].main);
  const hasOverflow = ROLES.some(r => (roleFiles.get(r)?.length ?? 0) > 1);

  let status: MatrixRow['status'];
  if (missingRequired) {
    status = 'incomplete';
  } else if (hasOverflow) {
    status = 'overflow';
  } else {
    status = 'ready';
  }

  return { groupKey, cells, status };
}

export function cluster(
  files: FileMeta[],
  config?: ClusterConfig
): ClusterResult {
  const regex = config?.groupKeyRegex ?? DEFAULT_GROUP_KEY_REGEX;
  const keywords = config?.roleKeywords ?? DEFAULT_ROLE_KEYWORDS;

  const grouped = new Map<string, Map<Role, FileMeta[]>>();
  const unassigned: FileMeta[] = [];

  for (const file of files) {
    const groupKey = extractGroupKey(file.name, regex);
    if (!groupKey) {
      unassigned.push(file);
      continue;
    }

    const roleSegment = stripGroupKey(file.name, groupKey);
    const role = detectRole(roleSegment, keywords);

    if (!role) {
      unassigned.push(file);
      continue;
    }

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, new Map());
    }
    const roleMap = grouped.get(groupKey)!;
    if (!roleMap.has(role)) {
      roleMap.set(role, []);
    }
    roleMap.get(role)!.push(file);
  }

  const matrix: MatrixRow[] = [];
  for (const [groupKey, roleFiles] of grouped) {
    matrix.push(buildRow(groupKey, roleFiles));
  }

  // Sort rows by groupKey for stable display
  matrix.sort((a, b) => a.groupKey.localeCompare(b.groupKey));

  return { matrix, unassigned };
}
