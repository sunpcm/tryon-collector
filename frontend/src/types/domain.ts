// Core domain types for Tryon Collector
// Mirrors docs/api_contract.md and docs/phase_plan.md section 4.2

export type Role = 'product' | 'tryon' | 'retouched' | 'annotated';

export const ROLES: readonly Role[] = [
  'product',
  'tryon',
  'retouched',
  'annotated',
];

export const REQUIRED_ROLES: readonly Role[] = [
  'product',
  'tryon',
  'retouched',
];

export const ROLE_LABELS: Record<Role, string> = {
  product: '产品图',
  tryon: '试穿图',
  retouched: '精修图',
  annotated: '标注图',
};

export interface FileMeta {
  id: string;
  name: string;
  size: number;
  type: string; // MIME
  blobUrl: string;
  file?: File; // original File reference (avoids blobUrl → File conversion on submit)
}

export interface MatrixCell {
  main?: FileMeta;
  candidates: FileMeta[];
}

export interface MatrixRow {
  groupKey: string;
  cells: Record<Role, MatrixCell>;
  status: 'ready' | 'incomplete' | 'overflow';
}

export interface ClusterResult {
  matrix: MatrixRow[];
  unassigned: FileMeta[];
}

export interface ClusterConfig {
  groupKeyRegex?: RegExp;
  roleKeywords?: Record<Role, string[]>;
}

export interface BundleMeta {
  group_key: string;
  files: Record<Role, string>; // role -> form field name
}

export interface BatchSubmitResponse {
  submit_id: string;
  accepted: Array<{ group_key: string; task_id: string }>;
  rejected: Array<{ group_key: string; reason: string; detail?: string }>;
}

export type RowSubmitStatus = 'pending' | 'uploading' | 'accepted' | 'rejected';
