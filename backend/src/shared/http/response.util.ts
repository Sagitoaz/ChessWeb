export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface ApiMeta {
  requestId: string | null
  timestamp: string
  pagination?: {
    page: number
    pageSize: number
    total: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: ApiError | null
  meta: ApiMeta
}

export const successResponse = <T>(data: T, requestId: string | null): ApiResponse<T> => ({
  success: true,
  data,
  error: null,
  meta: {
    requestId,
    timestamp: new Date().toISOString(),
  },
})

export const notImplementedResponse = (
  requestId: string | null,
  owner: string,
  module: string,
  endpoint: string
): ApiResponse<null> => ({
  success: false,
  data: null,
  error: {
    code: 'NOT_IMPLEMENTED',
    message: 'Endpoint chua duoc trien khai',
    details: { owner, module, endpoint },
  },
  meta: {
    requestId,
    timestamp: new Date().toISOString(),
  },
})
