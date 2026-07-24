import { getToken, clearAuth } from '@/lib/auth'
import type {
  User,
  UserDetail,
  CreateUserRequest,
  TopUpRequest,
  TopUpResponse,
  Device,
  DeviceDetail,
  DeviceStatus,
  RegisterDeviceRequest,
  RegisterDeviceResponse,
  SyncBatch,
  FlaggedTransaction,
  Certificate,
} from '@/types/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.dompetgaruda.com'
const LOGIN_PATH = '/admin/auth/login'

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  // A 401 from the login endpoint means wrong credentials, not an expired
  // session — let it fall through so the login page can show its own error
  // instead of force-redirecting and wiping the form.
  if (res.status === 401 && path !== LOGIN_PATH) {
    clearAuth()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; type: string; username: string; role: string }>(
        '/admin/auth/login',
        { method: 'POST', body: JSON.stringify({ username, password }) }
      ),
  },
  users: {
    list: () => request<User[]>('/admin/users'),
    get: (userId: string) => request<UserDetail>(`/admin/users/${userId}`),
    create: (data: CreateUserRequest) =>
      request<User>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
    topUp: (userId: string, data: TopUpRequest) =>
      request<TopUpResponse>(`/admin/users/${userId}/topup`, {
        method: 'POST', body: JSON.stringify(data),
      }),
  },
  devices: {
    list: () => request<Device[]>('/admin/devices'),
    get: (deviceId: string) => request<DeviceDetail>(`/admin/devices/${deviceId}`),
    register: (data: RegisterDeviceRequest) =>
      request<RegisterDeviceResponse>('/admin/devices', {
        method: 'POST', body: JSON.stringify(data),
      }),
    updateStatus: (deviceId: string, status: DeviceStatus) =>
      request<Device>(`/admin/devices/${deviceId}/status`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      }),
  },
  sync: {
    list: (limit = 50) => request<SyncBatch[]>(`/admin/sync?limit=${limit}`),
  },
  flagged: {
    list: (resolved = false) =>
      request<FlaggedTransaction[]>(`/admin/flagged?resolved=${resolved}`),
    resolve: (flagId: number) =>
      request<FlaggedTransaction>(`/admin/flagged/${flagId}/resolve`, {
        method: 'PATCH',
      }),
  },
  certificates: {
    list: (status?: string) =>
      request<Certificate[]>(`/admin/certificates${status ? `?status=${status}` : ''}`),
  },
}
