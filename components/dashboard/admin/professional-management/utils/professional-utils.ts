import type { ProfessionalStatus } from "@/lib/db/models/professional-profile"
import type { Professional } from "@/lib/types/professional"
import { Badge } from "@/components/common/ui/badge"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"

/**
 * Get status badge configuration for professional status
 */
export function getStatusBadgeConfig(status: ProfessionalStatus) {
  const statusConfig = {
    active: { 
      variant: "default" as const, 
      text: "פעיל", 
      color: "bg-green-100 text-green-800 border-green-200" 
    },
    pending_admin_approval: { 
      variant: "secondary" as const, 
      text: "ממתין לאישור", 
      color: "bg-orange-100 text-orange-800 border-orange-200" 
    },
    pending_user_action: { 
      variant: "outline" as const, 
      text: "ממתין למשתמש", 
      color: "bg-blue-100 text-blue-800 border-blue-200" 
    },
    rejected: { 
      variant: "destructive" as const, 
      text: "נדחה", 
      color: "bg-red-100 text-red-800 border-red-200" 
    },
    suspended: { 
      variant: "destructive" as const, 
      text: "מושהה", 
      color: "bg-gray-100 text-gray-800 border-gray-200" 
    }
  }

  return statusConfig[status] || statusConfig.active
}

/**
 * Get status color for text/icons
 */
export function getStatusColor(status: ProfessionalStatus) {
  const colors = {
    active: "text-green-600",
    pending_admin_approval: "text-orange-600",
    pending_user_action: "text-blue-600",
    rejected: "text-red-600",
    suspended: "text-gray-600"
  }
  
  return colors[status] || colors.active
}

/**
 * Get status text in Hebrew
 */
export function getStatusText(status: ProfessionalStatus) {
  const statusTexts = {
    active: "פעיל",
    pending_admin_approval: "ממתין לאישור אדמין",
    pending_user_action: "ממתין לפעולת משתמש",
    rejected: "נדחה",
    suspended: "מושהה"
  }
  
  return statusTexts[status] || "לא ידוע"
}

/**
 * Format date for display
 */
export function formatDate(date?: Date | string) {
  if (!date) return "-"
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString("he-IL", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch {
    return "-"
  }
}

/**
 * Format datetime for display
 */
export function formatDateTime(date?: Date | string) {
  if (!date) return "-"
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleString("he-IL", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return "-"
  }
}

/**
 * Get professional name safely
 */
export function getProfessionalName(professional: Professional): string {
  if (typeof professional.userId === 'object' && professional.userId.name) {
    return professional.userId.name
  }
  return "לא זמין"
}

/**
 * Get professional email safely
 */
export function getProfessionalEmail(professional: Professional): string {
  if (typeof professional.userId === 'object' && professional.userId.email) {
    return professional.userId.email
  }
  return "לא זמין"
}

/**
 * Get professional phone safely
 */
export function getProfessionalPhone(professional: Professional): string {
  if (typeof professional.userId === 'object' && professional.userId.phone) {
    return formatPhoneForDisplay(professional.userId.phone)
  }
  return "לא זמין"
}

/**
 * Get professional gender text
 */
export function getProfessionalGender(professional: Professional): string {
  if (typeof professional.userId === 'object' && professional.userId.gender) {
    return professional.userId.gender === 'male' ? 'זכר' : 'נקבה'
  }
  return "לא זמין"
}

/**
 * Get professional treatments count
 */
export function getProfessionalTreatmentsCount(professional: Professional): number {
  return professional.treatments?.length || 0
}

/**
 * Get professional work areas count
 */
export function getProfessionalWorkAreasCount(professional: Professional): number {
  return professional.workAreas?.length || 0
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0
  }).format(amount)
}

/**
 * Get professional ID safely
 */
export function getProfessionalId(professional: Professional): string {
  return professional._id || ""
}

/**
 * Check if professional data is loading
 */
export function isProfessionalDataLoading(professional: Professional): boolean {
  return !professional._id || typeof professional.userId === 'string'
}

/**
 * Calculate professional stats from array
 */
export function calculateProfessionalStats(professionals: Professional[]) {
  const stats = {
    total: professionals.length,
    active: 0,
    pending: 0,
    rejected: 0,
    suspended: 0,
    byStatus: {} as Record<string, number>
  }

  professionals.forEach(professional => {
    const status = professional.status
    
    if (status === 'active') {
      stats.active++
    } else if (status === 'pending_admin_approval' || status === 'pending_user_action') {
      stats.pending++
    } else if (status === 'rejected') {
      stats.rejected++
    } else if (status === 'suspended') {
      stats.suspended++
    }

    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
  })

  return stats
}

/**
 * Sort professionals by field
 */
export function sortProfessionals(
  professionals: Professional[], 
  sortBy: string, 
  sortOrder: "asc" | "desc"
): Professional[] {
  return [...professionals].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy) {
      case "name":
        aValue = getProfessionalName(a)
        bValue = getProfessionalName(b)
        break
      case "email":
        aValue = getProfessionalEmail(a)
        bValue = getProfessionalEmail(b)
        break
      case "status":
        aValue = a.status
        bValue = b.status
        break
      case "appliedAt":
        aValue = new Date(a.appliedAt)
        bValue = new Date(b.appliedAt)
        break
      case "createdAt":
        aValue = new Date(a.createdAt)
        bValue = new Date(b.createdAt)
        break
      default:
        aValue = a.createdAt
        bValue = b.createdAt
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1
    return 0
  })
}

/**
 * Filter professionals by search term
 */
export function filterProfessionals(
  professionals: Professional[], 
  searchTerm: string
): Professional[] {
  if (!searchTerm.trim()) return professionals

  const search = searchTerm.toLowerCase()
  
  return professionals.filter(professional => {
    const name = getProfessionalName(professional).toLowerCase()
    const email = getProfessionalEmail(professional).toLowerCase()
    const phone = getProfessionalPhone(professional).toLowerCase()
    
    return name.includes(search) || 
           email.includes(search) || 
           phone.includes(search)
  })
}

/**
 * Get professional full display data
 */
export function getProfessionalDisplayData(professional: Professional) {
  return {
    id: getProfessionalId(professional),
    name: getProfessionalName(professional),
    email: getProfessionalEmail(professional),
    phone: getProfessionalPhone(professional),
    gender: getProfessionalGender(professional),
    status: professional.status,
    statusText: getStatusText(professional.status),
    statusColor: getStatusColor(professional.status),
    treatmentsCount: getProfessionalTreatmentsCount(professional),
    workAreasCount: getProfessionalWorkAreasCount(professional),
    totalEarnings: formatCurrency(professional.totalEarnings || 0),
    pendingPayments: formatCurrency(professional.pendingPayments || 0),
    appliedAt: formatDate(professional.appliedAt),
    approvedAt: formatDate(professional.approvedAt),
    isLoading: isProfessionalDataLoading(professional)
  }
} 