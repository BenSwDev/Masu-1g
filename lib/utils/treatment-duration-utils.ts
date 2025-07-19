/**
 * Utility functions for calculating treatment duration from booking data
 * Handles both populated and unpopulated treatment objects
 */

export interface BookingWithTreatment {
  selectedDurationId?: string
  treatmentId?: {
    _id?: string
    name?: string
    pricingType?: 'fixed' | 'duration_based'
    durations?: Array<{
      _id: string
      name: string
      durationMinutes: number
    }>
    defaultDurationMinutes?: number
  } | string
}

/**
 * Calculate treatment duration text from booking data
 * Works with both populated and unpopulated treatment objects
 * 
 * @param booking - Booking object with treatment data
 * @returns Duration text in Hebrew (e.g., "60 דקות", "זמן קבוע")
 */
export function calculateTreatmentDuration(booking: BookingWithTreatment): string {
  // If treatmentId is just a string (not populated), return default
  if (typeof booking.treatmentId === 'string') {
    return "לא צוין"
  }

  const treatment = booking.treatmentId
  if (!treatment) {
    return "לא צוין"
  }

  // Handle fixed pricing type
  if (treatment.pricingType === 'fixed') {
    return "זמן קבוע"
  }

  // Handle duration-based pricing
  if (treatment.pricingType === 'duration_based' && booking.selectedDurationId) {
    // Try to find the selected duration in the durations array
    const selectedDuration = treatment.durations?.find(
      duration => duration._id.toString() === booking.selectedDurationId?.toString()
    )
    
    if (selectedDuration) {
      return `${selectedDuration.durationMinutes} דקות`
    }
  }

  // Fallback to default duration if available
  if (treatment.defaultDurationMinutes) {
    return `${treatment.defaultDurationMinutes} דקות`
  }

  return "לא צוין"
}

/**
 * Calculate treatment duration in minutes (numeric value)
 * 
 * @param booking - Booking object with treatment data
 * @returns Duration in minutes, or null if not available
 */
export function calculateTreatmentDurationMinutes(booking: BookingWithTreatment): number | null {
  // If treatmentId is just a string (not populated), return null
  if (typeof booking.treatmentId === 'string') {
    return null
  }

  const treatment = booking.treatmentId
  if (!treatment) {
    return null
  }

  // Handle duration-based pricing
  if (treatment.pricingType === 'duration_based' && booking.selectedDurationId) {
    // Try to find the selected duration in the durations array
    const selectedDuration = treatment.durations?.find(
      duration => duration._id.toString() === booking.selectedDurationId?.toString()
    )
    
    if (selectedDuration) {
      return selectedDuration.durationMinutes
    }
  }

  // Fallback to default duration if available
  if (treatment.defaultDurationMinutes) {
    return treatment.defaultDurationMinutes
  }

  return null
} 