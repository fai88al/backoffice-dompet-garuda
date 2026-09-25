import type { FlagReason, TransactionDirection, TransactionStatus, TransactionType } from '@/types/api'

// Backend enum -> admin-facing wording. Record<> keys make tsc fail if backend adds a value.
export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  ONLINE_TRANSFER: 'Online Transfer',
  OFFLINE_TRANSFER: 'Offline Transfer',
  QR_PAYMENT_ONLINE: 'QR Payment',
  TOPUP: 'Top Up',
  POUCH_LOAD: 'Move to Offline Pouch',
  POUCH_REFUND: 'Refund from Offline Pouch',
}

export const TRANSACTION_DIRECTION_LABELS: Record<TransactionDirection, string> = {
  DEBIT: 'Money Out',
  CREDIT: 'Money In',
}

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  SUCCESS: 'Successful',
  PENDING: 'In Progress',
  FAILED: 'Failed',
  REVERSED: 'Refunded',
}

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  OVER_LIMIT: 'Over Spending Limit',
  BAD_SIGNATURE: 'Invalid Signature',
  COUNTER_REPLAY: 'Replayed Transaction',
  EXPIRED_CERT_LATE_SYNC: 'Synced After Certificate Expired',
  RECON_MISMATCH: 'Balance Mismatch',
  MALFORMED: 'Invalid Data Format',
}

// Generic statuses (sync batch, device, certificate). Transaction statuses use their own map above.
export const GENERAL_STATUS_LABELS: Record<string, string> = {
  DONE: 'Completed',
  REVOKED: 'Revoked',
  ...FLAG_REASON_LABELS,
}

// ponytail: falls back to the raw value so an unknown backend enum still renders.
export const labelFor = (map: Record<string, string>, key: string) => map[key] ?? key
