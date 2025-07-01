import type { ObjectId } from "mongodb"

export type GiftVoucherStatus = 
  | "active" 
  | "pending_payment" 
  | "pending_send" 
  | "sent"
  | "fully_used" 
  | "partially_used" 
  | "expired" 
  | "cancelled"

export interface IGiftVoucher {
  _id: ObjectId
  code: string
  type: "treatment" | "monetary"
  treatmentId?: ObjectId
  monetaryValue?: number
  isRedeemed: boolean
  redeemedAt?: Date
  redeemedBy?: ObjectId
  purchasedBy: ObjectId
  recipientName?: string
  recipientEmail?: string
  recipientPhone?: string
  message?: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface GiftVoucherPlain {
  _id: string
  code: string
  type: "treatment" | "monetary"
  voucherType: "treatment" | "monetary"
  status: GiftVoucherStatus
  treatmentId?: string
  monetaryValue?: number
  paymentAmount?: number
  isRedeemed: boolean
  redeemedAt?: string
  redeemedBy?: string
  purchasedBy: string
  recipientName?: string
  recipientEmail?: string
  recipientPhone?: string
  message?: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  amount?: number
  isGift?: boolean
  purchaseDate?: string
  validFrom?: string
  validUntil?: string
}

export type GiftVoucher = GiftVoucherPlain 