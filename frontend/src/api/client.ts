import { API_BASE_URL } from '@/config';
import type { BatchSubmitResponse, BundleMeta, Role } from '@/types';

export interface SubmitBundlePayload {
  designer_id: string;
  business_line: string;
  category: string;
  optional_notes?: string;
  client_submit_id: string;
  bundles: BundleMeta[];
  files: Record<string, File>; // field name -> File
}

export async function submitBundlesBatch(
  payload: SubmitBundlePayload
): Promise<BatchSubmitResponse> {
  const formData = new FormData();

  formData.append('designer_id', payload.designer_id);
  formData.append('business_line', payload.business_line);
  formData.append('category', payload.category);
  formData.append('optional_notes', payload.optional_notes || '');
  formData.append('client_submit_id', payload.client_submit_id);
  formData.append('bundles', JSON.stringify(payload.bundles));

  for (const [fieldName, file] of Object.entries(payload.files)) {
    formData.append(fieldName, file);
  }

  const res = await fetch(`${API_BASE_URL}/api/bundles/batch`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`Submit failed (${res.status}): ${text}`);
  }

  return res.json();
}

export function buildFileFieldName(groupKey: string, role: Role): string {
  return `file_${groupKey}_${role}`;
}

export interface AuditBundle {
  task_id: string;
  submit_id: string;
  designer_id: string;
  business_line: string;
  category: string;
  group_key: string;
  upload_time: string;
  has_annotation: boolean;
  optional_notes?: string;
  files: Record<string, { filename: string; mime: string; sha256: string; bytes: number }>;
}

export interface AuditResponse {
  total: number;
  offset: number;
  limit: number;
  bundles: AuditBundle[];
}

export async function fetchAuditBundles(params: {
  designer_id?: string;
  category?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<AuditResponse> {
  const searchParams = new URLSearchParams();
  if (params.designer_id) searchParams.set('designer_id', params.designer_id);
  if (params.category) searchParams.set('category', params.category);
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset));

  const res = await fetch(`${API_BASE_URL}/api/audit/bundles?${searchParams}`);
  if (!res.ok) {
    throw new Error(`Audit fetch failed (${res.status})`);
  }
  return res.json();
}
