import { API_BASE_URL } from '@/config';
import type { BatchSubmitResponse, BundleMeta, Role } from '@/types';

export interface SubmitBundlePayload {
  designer_id: string;
  business_line: string;
  category: string;
  optional_notes?: string;
  title?: string;
  client_submit_id: string;
  bundles: BundleMeta[];
  files: Record<string, File>;
  replaces_task_id?: string;
}

export async function submitBundlesBatch(
  payload: SubmitBundlePayload
): Promise<BatchSubmitResponse> {
  const formData = new FormData();

  formData.append('designer_id', payload.designer_id);
  formData.append('business_line', payload.business_line);
  formData.append('category', payload.category);
  formData.append('optional_notes', payload.optional_notes || '');
  formData.append('title', payload.title || '');
  formData.append('client_submit_id', payload.client_submit_id);
  formData.append('bundles', JSON.stringify(payload.bundles));
  if (payload.replaces_task_id) {
    formData.append('replaces_task_id', payload.replaces_task_id);
  }

  for (const [fieldName, file] of Object.entries(payload.files)) {
    formData.append(fieldName, file);
  }

  const res = await fetch(`${API_BASE_URL}/api/bundles/batch`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg =
      body?.message ||
      body?.detail ||
      (await res.text().catch(() => 'Unknown error'));
    throw new Error(msg);
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
  title?: string;
  upload_time: string;
  has_annotation: boolean;
  optional_notes?: string;
  files: Record<
    string,
    { filename: string; mime: string; sha256: string; bytes: number }[]
  >;
  deleted_at?: string;
  deleted_by?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface AuditResponse {
  total: number;
  offset: number;
  limit: number;
  bundles: AuditBundle[];
}

export interface TagsConfig {
  business_lines: string[];
  categories: string[];
}

export async function fetchTags(): Promise<TagsConfig> {
  const res = await fetch(`${API_BASE_URL}/api/tags`);
  if (!res.ok) throw new Error(`Tags fetch failed (${res.status})`);
  return res.json();
}

export async function updateTags(tags: TagsConfig): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tags),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `Tags update failed (${res.status})`);
  }
}

export async function fetchAuditBundles(
  params: {
    designer_id?: string;
    category?: string;
    include_deleted?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<AuditResponse> {
  const searchParams = new URLSearchParams();
  if (params.designer_id) searchParams.set('designer_id', params.designer_id);
  if (params.category) searchParams.set('category', params.category);
  if (params.include_deleted) searchParams.set('include_deleted', 'true');
  if (params.limit !== undefined)
    searchParams.set('limit', String(params.limit));
  if (params.offset !== undefined)
    searchParams.set('offset', String(params.offset));

  const res = await fetch(`${API_BASE_URL}/api/audit/bundles?${searchParams}`);
  if (!res.ok) {
    throw new Error(`Audit fetch failed (${res.status})`);
  }
  return res.json();
}

export interface PatchBundlePayload {
  title?: string;
  business_line?: string;
  category?: string;
  optional_notes?: string;
}

export async function patchBundle(
  taskId: string,
  payload: PatchBundlePayload,
  actor?: string
): Promise<AuditBundle> {
  const sp = new URLSearchParams();
  if (actor) sp.set('actor', actor);
  const res = await fetch(
    `${API_BASE_URL}/api/audit/bundles/${encodeURIComponent(taskId)}?${sp}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `Bundle patch failed (${res.status})`);
  }
  return res.json();
}

export async function deleteBundle(
  taskId: string,
  actor?: string
): Promise<AuditBundle> {
  const sp = new URLSearchParams();
  if (actor) sp.set('actor', actor);
  const res = await fetch(
    `${API_BASE_URL}/api/audit/bundles/${encodeURIComponent(taskId)}?${sp}`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `Bundle delete failed (${res.status})`);
  }
  return res.json();
}

export async function fetchBrands(): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/api/brands`);
  if (!res.ok) throw new Error(`Brands fetch failed (${res.status})`);
  const body = await res.json();
  return body.brands ?? [];
}

export async function updateBrands(brands: string[]): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/api/brands`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brands }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `Brands update failed (${res.status})`);
  }
  const body = await res.json();
  return body.brands ?? [];
}

export interface SubmitShowcasePayload {
  uploader: string;
  brand: string;
  purpose?: string;
  client_submit_id: string;
  files: File[];
  replaces_id?: string;
}

export interface SubmitShowcaseResponse {
  showcase_id: string;
  submit_id: string;
}

export async function submitShowcase(
  payload: SubmitShowcasePayload
): Promise<SubmitShowcaseResponse> {
  const formData = new FormData();
  formData.append('uploader', payload.uploader);
  formData.append('brand', payload.brand);
  formData.append('purpose', payload.purpose ?? '');
  formData.append('client_submit_id', payload.client_submit_id);
  if (payload.replaces_id) {
    formData.append('replaces_id', payload.replaces_id);
  }
  for (const file of payload.files) {
    formData.append('files', file, file.name);
  }

  const res = await fetch(`${API_BASE_URL}/api/showcases/batch`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.detail ||
        (await res.text().catch(() => `Showcase submit failed (${res.status})`))
    );
  }
  return res.json();
}

export interface ShowcaseFileMeta {
  filename: string;
  original_filename: string;
  mime: string;
  kind: 'image' | 'video';
  sha256: string;
  bytes: number;
}

export interface Showcase {
  showcase_id: string;
  submit_id: string;
  uploader: string;
  brand: string;
  purpose: string;
  upload_time: string;
  files: ShowcaseFileMeta[];
  deleted_at?: string;
  deleted_by?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface ShowcaseListResponse {
  total: number;
  offset: number;
  limit: number;
  showcases: Showcase[];
}

export async function fetchShowcases(
  params: {
    uploader?: string;
    brand?: string;
    include_deleted?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ShowcaseListResponse> {
  const sp = new URLSearchParams();
  if (params.uploader) sp.set('uploader', params.uploader);
  if (params.brand) sp.set('brand', params.brand);
  if (params.include_deleted) sp.set('include_deleted', 'true');
  if (params.limit !== undefined) sp.set('limit', String(params.limit));
  if (params.offset !== undefined) sp.set('offset', String(params.offset));

  const res = await fetch(`${API_BASE_URL}/api/showcases?${sp}`);
  if (!res.ok) throw new Error(`Showcases fetch failed (${res.status})`);
  return res.json();
}

export interface PatchShowcasePayload {
  brand?: string;
  purpose?: string;
}

export async function patchShowcase(
  showcaseId: string,
  payload: PatchShowcasePayload,
  actor?: string
): Promise<Showcase> {
  const sp = new URLSearchParams();
  if (actor) sp.set('actor', actor);
  const res = await fetch(
    `${API_BASE_URL}/api/showcases/${encodeURIComponent(showcaseId)}?${sp}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `Showcase patch failed (${res.status})`);
  }
  return res.json();
}

export async function deleteShowcase(
  showcaseId: string,
  actor?: string
): Promise<Showcase> {
  const sp = new URLSearchParams();
  if (actor) sp.set('actor', actor);
  const res = await fetch(
    `${API_BASE_URL}/api/showcases/${encodeURIComponent(showcaseId)}?${sp}`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `Showcase delete failed (${res.status})`);
  }
  return res.json();
}
