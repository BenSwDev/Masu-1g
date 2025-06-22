import type { ProfessionalStatus, IProfessionalProfile } from "@/lib/db/models/professional-profile"
import type { IUser } from "@/lib/db/models/user"

// Unified Professional interface for frontend components
export interface Professional {
  _id: string
  userId: IUser
  status: ProfessionalStatus
  isActive: boolean
  
  // Professional details
  specialization?: string
  experience?: string
  certifications?: string[]
  bio?: string
  profileImage?: string
  
  // Treatments and pricing
  treatments: Array<{
    treatmentId: string
    durationId?: string
    professionalPrice: number
    treatmentName?: string
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
  
  // Bank details
  bankDetails?: {
    bankName: string
    branchNumber: string
    accountNumber: string
  }
  
  // Documents
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
  
  // Admin notes and status
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

// Helper function to transform backend data to frontend interface
export function transformProfessionalData(rawProfessional: IProfessionalProfile & { userId: IUser }): Professional {
  return {
    _id: rawProfessional._id.toString(),
    userId: rawProfessional.userId,
    status: rawProfessional.status,
    isActive: rawProfessional.isActive,
    specialization: rawProfessional.specialization,
    experience: rawProfessional.experience,
    certifications: rawProfessional.certifications,
    bio: rawProfessional.bio,
    profileImage: rawProfessional.profileImage,
    treatments: (rawProfessional.treatments || []).map(t => ({
      treatmentId: t.treatmentId?.toString() || '',
      durationId: t.durationId?.toString(),
      professionalPrice: t.professionalPrice || 0,
      treatmentName: (t as any).treatmentName
    })),
    workAreas: (rawProfessional.workAreas || []).map(w => ({
      cityId: w.cityId?.toString() || '',
      cityName: w.cityName || '',
      distanceRadius: w.distanceRadius,
      coveredCities: w.coveredCities || []
    })),
    totalEarnings: rawProfessional.totalEarnings || 0,
    pendingPayments: rawProfessional.pendingPayments || 0,
    bankDetails: rawProfessional.bankDetails ? {
      bankName: rawProfessional.bankDetails.bankName,
      branchNumber: rawProfessional.bankDetails.branchNumber,
      accountNumber: rawProfessional.bankDetails.accountNumber
    } : undefined,
    documents: rawProfessional.documents,
    adminNotes: rawProfessional.adminNotes,
    rejectionReason: rawProfessional.rejectionReason,
    appliedAt: rawProfessional.appliedAt,
    approvedAt: rawProfessional.approvedAt,
    rejectedAt: rawProfessional.rejectedAt,
    lastActiveAt: rawProfessional.lastActiveAt,
    createdAt: rawProfessional.createdAt,
    updatedAt: rawProfessional.updatedAt
  }
}

// Props interfaces for components
export interface ProfessionalManagementProps {
  initialProfessionals: Professional[]
  totalPages: number
  currentPage: number
  initialSearch?: string
  initialStats?: StatsInfo
}

export interface ProfessionalEditModalProps {
  professional: Professional
  open: boolean
  onClose: () => void
  isCreatingNew?: boolean
}

export interface ProfessionalTabProps {
  professional: Professional
  onUpdate: (professional: Partial<Professional>) => void
  loading: boolean
  isCreatingNew?: boolean
  onCreated?: (professional: Professional) => void
}

// Stats interface
export interface StatsInfo {
  total: number
  active: number
  byStatus: Record<string, number>
}

// Pagination interface
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
} 