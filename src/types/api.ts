export type UserStatus = 'ACTIVE' | 'SUSPENDED'

export interface User {
  userId: string
  fullName: string
  phone: string
  status: UserStatus
  onlineBalance: number
  deviceCount: number
  createdAt: string
}

export interface UserDeviceSummary {
  deviceId: string
  status: DeviceStatus
  registeredAt: string
}

export interface UserDetail extends User {
  devices: UserDeviceSummary[]
}

export interface CreateUserRequest {
  fullName: string
  phone: string
}

export type DeviceStatus = 'ACTIVE' | 'SUSPENDED' | 'LOCKED'

export interface ActiveCertificate {
  certificateId: string
  issuedAmount: number
  expiresAt: string
  status: string
}

export interface Device {
  deviceId: string
  userId: string
  userPhone: string
  status: DeviceStatus
  lastCounter: number
  registeredAt: string
  activeCertificate: ActiveCertificate | null
}

export type DeviceDetail = Device

export interface RegisterDeviceRequest {
  userId: string
  publicKey: string
  label?: string
}

export interface RegisterDeviceResponse {
  deviceId: string
  userId: string
  deviceLabel: string
  pouchAccountId: string
  registeredAt: string
  deviceToken: string
}

export interface TopUpRequest {
  amount: number
  reference: string
}

export interface TopUpResponse {
  userId: string
  onlineBalance: number
  transactionId: number
  reference: string
}

export type SyncBatchStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'

export interface SyncBatch {
  batchId: string
  deviceId: string
  status: SyncBatchStatus
  syncedAfterExpiry: boolean
  receivedAt: string
  processedAt: string | null
  errorReason: string | null
}

export type FlagReason =
  | 'OVER_LIMIT'
  | 'BAD_SIGNATURE'
  | 'COUNTER_REPLAY'
  | 'EXPIRED_CERT_LATE_SYNC'
  | 'RECON_MISMATCH'
  | 'MALFORMED'

export interface FlaggedTransaction {
  flagId: number
  reason: FlagReason
  detail: string
  createdAt: string
  offlineTxnId: string | null
  batchId: string | null
  certificateId: string | null
}

export type CertificateStatus = 'ACTIVE' | 'SETTLED' | 'EXPIRED' | 'REVOKED'

export interface Certificate {
  certificateId: string
  deviceId: string
  userPhone: string
  issuedAmount: number
  status: CertificateStatus
  issuedAt: string
  expiresAt: string
  settledAt: string | null
}
