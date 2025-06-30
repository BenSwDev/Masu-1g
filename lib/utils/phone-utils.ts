/**
 * UNIFIED PHONE UTILITIES - SINGLE SOURCE OF TRUTH
 * Following ROLE OF ONE principle - one file for all phone-related utilities
 */

/**
 * Normalize phone number to standard format
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return ""
  
  // Remove any non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "")
  
  // If already in international format, return as-is
  if (cleaned.startsWith("+")) {
    return cleaned
  }
  
  // If starts with 972, add +
  if (cleaned.startsWith("972")) {
    return `+${cleaned}`
  }
  
  // If starts with 0 (Israeli local format), convert to international
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `+972${cleaned.substring(1)}`
  }
  
  // If 9 digits without leading 0, assume Israeli
  if (cleaned.length === 9 && !cleaned.startsWith("0")) {
    return `+972${cleaned}`
  }
  
  // For local formatting, handle Israeli numbers
  let localCleaned = phone.replace(/\D/g, "")
  
  // Handle Israeli phone numbers for local display
  if (localCleaned.startsWith("972")) {
    // +972 format
    localCleaned = "0" + localCleaned.substring(3)
  } else if (localCleaned.startsWith("0")) {
    // Already in 0XX format
    // Keep as is
  } else if (localCleaned.length === 9) {
    // Missing leading 0
    localCleaned = "0" + localCleaned
  }
  
  return localCleaned
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return ""
  
  // Remove any non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "")
  
  // If it starts with +972, format as Israeli number
  if (cleaned.startsWith("+972")) {
    const number = cleaned.substring(4)
    if (number.length === 9) {
      return `${number.substring(0, 3)}-${number.substring(3, 6)}-${number.substring(6)}`
    }
  }
  
  // If it starts with 972, format as Israeli number
  if (cleaned.startsWith("972")) {
    const number = cleaned.substring(3)
    if (number.length === 9) {
      return `${number.substring(0, 3)}-${number.substring(3, 6)}-${number.substring(6)}`
    }
  }
  
  // If it's a 10-digit Israeli number starting with 0
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`
  }
  
  // If it's a 9-digit Israeli number without leading 0
  if (cleaned.length === 9 && !cleaned.startsWith("0")) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`
  }
  
  // Return as-is if doesn't match Israeli format
  return phone
}

/**
 * Validate Israeli phone number
 */
export function validateIsraeliPhone(phone: string): boolean {
  if (!phone) return false
  
  const normalized = normalizePhoneNumber(phone)
  
  // Check if it's a valid Israeli number (+972 followed by 9 digits)
  const israeliPattern = /^\+972[5-9]\d{8}$/
  return israeliPattern.test(normalized)
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

/**
 * Extract country code from phone number
 */
export function extractCountryCode(phone: string): string {
  if (!phone) return ""
  
  const cleaned = phone.replace(/[^\d+]/g, "")
  
  if (cleaned.startsWith("+972")) return "+972"
  if (cleaned.startsWith("972")) return "+972"
  if (cleaned.startsWith("+1")) return "+1"
  if (cleaned.startsWith("+44")) return "+44"
  
  return ""
} 