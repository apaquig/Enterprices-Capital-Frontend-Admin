export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
  errors?: any[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
