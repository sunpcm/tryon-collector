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
