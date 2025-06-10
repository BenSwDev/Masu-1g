import type { Types } from "mongoose"
import type { IReview } from "@/lib/db/models/review"

export interface PopulatedReview extends Omit<IReview, 'userId' | 'professionalId' | 'treatmentId' | 'bookingId'> {
  _id: string
  bookingId: {
    _id: string
    bookingNumber: string
    bookingDateTime: Date
    status: string
    bookedByUserName?: string
    bookedByUserEmail?: string
    bookedByUserPhone?: string
    recipientName?: string
    recipientPhone?: string
    recipientEmail?: string
  }
  userId: {
    _id: string
    name: string
    email: string
    phone?: string
  }
  professionalId: {
    _id: string
    name: string
    email: string
    phone?: string
  }
  treatmentId: {
    _id: string
    name: string
    duration?: number
  }
  rating: number
  comment?: string
  professionalResponse?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateReviewData {
  bookingId: string
  rating: number
  comment?: string
}

export interface UpdateReviewData {
  professionalResponse?: string
}

export interface ReviewFilters {
  search?: string
  rating?: number
  hasResponse?: boolean
  professional?: string
  treatment?: string
  dateRange?: string
  page?: number
  limit?: number
} 