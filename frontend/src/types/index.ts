// 通用类型定义

/**
 * API 响应类型
 */
export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  success: boolean;
}

/**
 * 分页数据类型
 */
export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 用户类型示例
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 组件通用 Props 类型
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}
