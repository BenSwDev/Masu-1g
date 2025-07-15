import type { ProfessionalStatus, ITreatmentPricing, IWorkArea, IBankDetails, IProfessionalDocument, IFinancialTransaction } from "@/lib/db/models/professional-profile"
import type { IUser } from "@/lib/db/models/user"

// Professional interface for frontend use - matches the database model exactly
export interface Professional {
  _id: string
  userId: IUser | string // Allow flexibility for updates
  status: ProfessionalStatus
  isActive: boolean
  
  // Professional details
  specialization?: string
  experience?: string
  certifications?: string[]
  bio?: string
  profileImage?: string
  genderPreference?: "no_preference" | "male_only" | "female_only"
  
  // Treatments and pricing
  treatments: Array<{
    treatmentId: string
    durationId?: string
    professionalPrice: number
    treatmentName?: string // Added for frontend display
  }>
  
  // Work areas
  workAreas: Array<{
    cityId: string
    cityName: string
    distanceRadius: "20km" | "40km" | "60km" | "80km" | "unlimited"
    coveredCities: string[]
  }>
  
  // Financial tracking
  totalEarnings: number
  pendingPayments: number
  financialTransactions?: Array<{
    type: "payment" | "adjustment" | "withdrawal" | "bonus" | "penalty"
    amount: number
    description: string
    date: Date
    bookingId?: string
    adminUserId?: string
    adminNote?: string
  }>
  
  // Bank details and documents
  bankDetails?: {
    bankName: string
    branchNumber: string
    accountNumber: string
  }
  documents?: Array<{
    id: string
    type: string
    name: string
    status: "pending" | "approved" | "rejected"
    uploadDate: Date
    approvedDate?: Date
    rejectedDate?: Date
    rejectionReason?: string
    fileUrl?: string
  }>
  
  // Admin notes
  adminNotes?: string
  rejectionReason?: string
  
  // Timestamps
  appliedAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  lastActiveAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Professional with populated user data (for API responses)
type ProfessionalWithUser = Professional

// Professional creation data
interface CreateProfessionalData {
  name: string
  email: string
  phone: string
  gender: "male" | "female"
  birthDate?: string
}

// Professional update data
interface UpdateProfessionalData {
  specialization?: string
  experience?: string
  certifications?: string[]
  bio?: string
  profileImage?: string
  adminNotes?: string
  rejectionReason?: string
}

// Professional search/filter options
interface ProfessionalSearchOptions {
  page?: number
  limit?: number
  search?: string
  status?: ProfessionalStatus
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

// Professional statistics
export interface ProfessionalStats {
  total: number
  active: number
  byStatus: Record<string, number>
}

// Pagination info
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

// Professional management props
export interface ProfessionalManagementProps {
  initialProfessionals: Professional[]
  totalPages: number
  currentPage: number
  initialSearch?: string
  initialStats?: ProfessionalStats
}

// Professional tab props
export interface ProfessionalTabProps {
  professional: Professional
  onUpdate: (professional: Partial<Professional>) => void
  loading?: boolean
  isCreatingNew?: boolean
  onCreated?: (professional: Professional) => void
} 