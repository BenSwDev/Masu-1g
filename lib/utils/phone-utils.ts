/**
 * UNIFIED PHONE UTILITIES - SINGLE SOURCE OF TRUTH
 * Following ROLE OF ONE principle - one function per phone operation
 */

/**
 * Normalize phone number to standard format
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return ""
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "")
  
  // Handle Israeli phone numbers
  if (cleaned.startsWith("972")) {
    // +972 format
    cleaned = "0" + cleaned.substring(3)
  } else if (cleaned.startsWith("0")) {
    // Already in 0XX format
    // Keep as is
  } else if (cleaned.length === 9) {
    // Missing leading 0
    cleaned = "0" + cleaned
  }
  
  return cleaned
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return ""
  
  const normalized = normalizePhoneNumber(phone)
  
  // Format Israeli mobile numbers: 0XX-XXX-XXXX
  if (normalized.length === 10 && normalized.startsWith("05")) {
    return `${normalized.substring(0, 3)}-${normalized.substring(3, 6)}-${normalized.substring(6)}`
  }
  
  // Format Israeli landline numbers: 0X-XXX-XXXX
  if (normalized.length === 9 || normalized.length === 10) {
    if (normalized.startsWith("02") || normalized.startsWith("03") || normalized.startsWith("04") || 
        normalized.startsWith("08") || normalized.startsWith("09")) {
      return `${normalized.substring(0, 2)}-${normalized.substring(2, 5)}-${normalized.substring(5)}`
    }
  }
  
  // Fallback: return as is
  return normalized
}

/**
 * Validate Israeli phone number
 */
export function validateIsraeliPhone(phone: string): boolean {
  if (!phone) return false
  
  const normalized = normalizePhoneNumber(phone)
  
  // Israeli mobile: 05X-XXXXXXX (10 digits total)
  if (/^05[0-9]\d{7}$/.test(normalized)) {
    return true
  }
  
  // Israeli landline: 0[2-4,8-9]-XXXXXXX (9-10 digits)
  if (/^0[2-4,8-9]\d{6,7}$/.test(normalized)) {
    return true
  }
  
  return false
}

/**
 * Convert phone to international format
 */
export function toInternationalFormat(phone: string): string {
  if (!phone) return ""
  
  const normalized = normalizePhoneNumber(phone)
  
  if (normalized.startsWith("0") && normalized.length >= 9) {
    return "+972" + normalized.substring(1)
  }
  
  return phone
}

/**
 * Extract phone number from various formats
 */
export function extractPhoneNumber(input: string): string {
  if (!input) return ""
  
  // Remove common prefixes and formatting
  const cleaned = input
    .replace(/^\+972/, "0")
    .replace(/\s+/g, "")
    .replace(/[-()]/g, "")
  
  return normalizePhoneNumber(cleaned)
}

/**
 * Check if phone number is mobile
 */
export function isMobileNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone)
  return /^05[0-9]\d{7}$/.test(normalized)
}

/**
 * Check if phone number is landline
 */
export function isLandlineNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone)
  return /^0[2-4,8-9]\d{6,7}$/.test(normalized)
}

/**
 * Get phone number type
 */
export function getPhoneType(phone: string): "mobile" | "landline" | "unknown" {
  if (isMobileNumber(phone)) return "mobile"
  if (isLandlineNumber(phone)) return "landline"
  return "unknown"
}

/**
 * Mask phone number for privacy
 */
export function maskPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone)
  
  if (normalized.length >= 6) {
    const start = normalized.substring(0, 3)
    const end = normalized.substring(normalized.length - 2)
    const middle = "*".repeat(normalized.length - 5)
    return `${start}${middle}${end}`
  }
  
  return normalized
} 