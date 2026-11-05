export type ID = string | number

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export type Status = 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled'