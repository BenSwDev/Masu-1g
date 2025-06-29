/**
 * Phone number utilities for consistent handling across the application
 */

/**
 * Normalizes a phone number to a consistent format
 * @param phone - The phone number to normalize
 * @returns Normalized phone number in international format (+972xxxxxxxxx)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return ""

  // Remove all non-digit characters except the plus sign
  let cleaned = phone.replace(/[^\d+]/g, "")

  // If there's no plus sign, assume it's a local number
  if (!cleaned.startsWith("+")) {
    // Handle Israeli numbers specifically
    if (cleaned.startsWith("0")) {
      // Israeli number starting with 0 (e.g., 0525131777)
      cleaned = "+972" + cleaned.substring(1)
    } else if (cleaned.length === 9 && /^[5-9]/.test(cleaned)) {
      // Israeli mobile number without 0 (e.g., 525131777)
      cleaned = "+972" + cleaned
    } else if (cleaned.length === 10 && cleaned.startsWith("972")) {
      // Number with 972 but no plus (e.g., 972525131777)
      cleaned = "+" + cleaned
    } else {
      // Default: assume Israeli number and add +972
      cleaned = "+972" + cleaned
    }
  } else {
    // Handle +972 numbers that might have 0 after country code
    if (cleaned.startsWith("+9720")) {
      // Remove the 0 after +972 (e.g., +9720525131777 -> +972525131777)
      cleaned = "+972" + cleaned.substring(5)
    }
  }

  return cleaned
}

/**
 * Validates if a phone number is in a valid format
 * @param phone - The phone number to validate
 * @returns True if the phone number is valid
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false

  const normalized = normalizePhoneNumber(phone)

  // For Israeli numbers, validate format
  if (normalized.startsWith("+972")) {
    const nationalNumber = normalized.substring(4)
    // Must be 9 digits and start with 5-9
    return nationalNumber.length === 9 && /^[5-9]/.test(nationalNumber)
  }

  // For other countries, basic validation (starts with + and has at least 8 digits)
  return /^\+\d{8,15}$/.test(normalized)
}

/**
 * Creates phone number variations for database searching
 * This helps find users even if phone numbers were stored in different formats
 * @param phone - The phone number to create variations for
 * @returns Array of phone number variations
 */
export function createPhoneVariations(phone: string): string[] {
  if (!phone) return []

  const normalized = normalizePhoneNumber(phone)
  const variations = [normalized]

  // For Israeli numbers, create additional variations
  if (normalized.startsWith("+972")) {
    const nationalNumber = normalized.substring(4)
    
    // Add variation with leading zero
    variations.push(`+9720${nationalNumber}`)
    
    // Add variation without country code (for legacy data)
    variations.push(`0${nationalNumber}`)
    variations.push(nationalNumber)
  }

  return [...new Set(variations)] // Remove duplicates
}

/**
 * Formats a phone number for display purposes
 * @param phone - The phone number to format
 * @returns Formatted phone number string
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return ""

  const normalized = normalizePhoneNumber(phone)

  // For Israeli numbers, format as +972 XX-XXX-XXXX
  if (normalized.startsWith("+972")) {
    const nationalNumber = normalized.substring(4)
    if (nationalNumber.length === 9) {
      return `+972 ${nationalNumber.substring(0, 2)}-${nationalNumber.substring(2, 5)}-${nationalNumber.substring(5)}`
    }
  }

  return normalized
}

/**
 * Obscures a phone number for privacy (shows only first 3 and last 3 digits)
 * @param phone - The phone number to obscure
 * @returns Obscured phone number
 */
export function obscurePhoneNumber(phone: string): string {
  if (!phone) return ""

  const normalized = normalizePhoneNumber(phone)
  
  if (normalized.length > 6) {
    return `${normalized.substring(0, 3)}***${normalized.substring(normalized.length - 3)}`
  }
  
  return normalized
} 
