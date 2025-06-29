/**
 * UNIFIED SUBSCRIPTION TYPES - SINGLE SOURCE OF TRUTH
 * Following ROLE OF ONE principle - one interface per subscription concept
 */

import type { Types } from "mongoose"

/**
 * Core Subscription Interface
 */
export interface Subscription {
  _id: string
  name: string
  description?: string
  price: number
  quantity: number
  bonusQuantity: number
  validityMonths: number
  treatments: string[]
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * User Subscription Status
 */
export type UserSubscriptionStatus = 
  | "active" 
  | "expired" 
  | "depleted" 
  | "cancelled" 
  | "pending_payment"

/**
 * Core User Subscription Interface
 */
export interface UserSubscription {
  _id: string
  code: string
  userId?: string
  subscriptionId: string
  treatmentId: string
  selectedDurationId?: string
  purchaseDate: string
  expiryDate: string
  totalQuantity: number
  remainingQuantity: number
  status: UserSubscriptionStatus
  paymentMethodId?: string
  paymentId?: string
  paymentAmount: number
  pricePerSession?: number
  guestInfo?: {
    name: string
    email?: string
    phone: string
  }
  createdAt?: string
  updatedAt?: string
}

/**
 * Populated User Subscription (with resolved references)
 */
export interface PopulatedUserSubscription extends Omit<UserSubscription, 'userId' | 'subscriptionId' | 'treatmentId' | 'paymentMethodId'> {
  userId?: {
    _id: string
    name: string
    email?: string
    phone?: string
  } | null
  subscriptionId: {
    _id: string
    name: string
    description?: string
    price: number
    duration: number
    treatments: string[]
    isActive: boolean
  }
  treatmentId: {
    _id: string
    name: string
    price: number
    durations: Array<{
      _id: string
      minutes: number
      price: number
    }>
  }
  paymentMethodId?: {
    _id: string
    cardName: string
    cardNumber: string
  } | null
  selectedDurationDetails?: {
    minutes: number
    price: number
  }
}

/**
 * Database Interface (extends Mongoose Document)
 */
export interface IUserSubscriptionDocument {
  _id: Types.ObjectId
  code: string
  userId?: Types.ObjectId
  subscriptionId: Types.ObjectId
  treatmentId: Types.ObjectId
  selectedDurationId?: Types.ObjectId
  purchaseDate: Date
  expiryDate: Date
  totalQuantity: number
  remainingQuantity: number
  status: UserSubscriptionStatus
  paymentMethodId?: Types.ObjectId
  paymentId?: string
  paymentAmount: number
  pricePerSession?: number
  guestInfo?: {
    name: string
    email?: string
    phone: string
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * Subscription Purchase Data
 */
export interface SubscriptionPurchaseData {
  subscriptionId: string
  treatmentId: string
  selectedDurationId?: string
  paymentMethodId?: string
  guestInfo?: {
    name: string
    email?: string
    phone: string
  }
}

/**
 * Subscription Response Interfaces
 */
export interface SubscriptionResponse {
  success: boolean
  subscription?: Subscription
  error?: string
}

export interface UserSubscriptionResponse {
  success: boolean
  userSubscription?: UserSubscription
  error?: string
}

export interface UserSubscriptionListResponse {
  success: boolean
  userSubscriptions?: PopulatedUserSubscription[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  error?: string
}

/**
 * Subscription Filters
 */
export interface SubscriptionFilters {
  userId?: string
  subscriptionId?: string
  treatmentId?: string
  status?: UserSubscriptionStatus[]
  search?: string
  page?: number
  limit?: number
}

/**
 * Utility Functions
 */
export function isSubscriptionActive(subscription: UserSubscription): boolean {
  const now = new Date()
  const expiry = new Date(subscription.expiryDate)
  return subscription.status === 'active' && 
         subscription.remainingQuantity > 0 && 
         expiry > now
}

export function canUseSubscription(subscription: UserSubscription): boolean {
  return isSubscriptionActive(subscription) && subscription.remainingQuantity > 0
}

export function getSubscriptionDisplayStatus(status: UserSubscriptionStatus): string {
  const statusMap: Record<UserSubscriptionStatus, string> = {
    active: "פעיל",
    expired: "פג תוקף",
    depleted: "מוצה",
    cancelled: "בוטל",
    pending_payment: "ממתין לתשלום"
  }
  
  return statusMap[status] || status
} 