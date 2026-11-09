export interface ApiResponse<T = unknown> {
  success: boolean;
  code: number;
  message: string | string[];
  data: T | null;
  timestamp: string;
  path: string;
}
