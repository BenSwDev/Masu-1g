import type { IBooking } from "@/lib/db/models/booking"
import type { IProfessionalProfile } from "@/lib/db/models/professional-profile"
import type { ITreatment } from "@/lib/db/models/treatment"
import { logger } from "@/lib/logs/logger"

export interface ProfessionalPaymentCalculation {
  baseProfessionalPayment: number
  surchargesProfessionalPayment: number
  totalProfessionalPayment: number
  calculationDetails: {
    treatmentFound: boolean
    treatmentPrice: number
    surcharges: Array<{
      description: string
      amount: number
    }>
  }
}

/**
 * Calculates the professional payment for a booking based on:
 * 1. Professional's configured price for the treatment
 * 2. Professional's share of surcharges
 * 3. Any overrides specified in booking
 */
export function calculateProfessionalPaymentForBooking(
  booking: IBooking,
  professional: IProfessionalProfile,
  treatment?: ITreatment
): ProfessionalPaymentCalculation {
  
  const result: ProfessionalPaymentCalculation = {
    baseProfessionalPayment: 0,
    surchargesProfessionalPayment: 0,
    totalProfessionalPayment: 0,
    calculationDetails: {
      treatmentFound: false,
      treatmentPrice: 0,
      surcharges: []
    }
  }

  try {
    // Find the professional's price for this treatment
    const treatmentId = booking.treatmentId?.toString()
    const selectedDurationId = booking.selectedDurationId?.toString()
    
    if (!treatmentId) {
      logger.warn("No treatment ID found in booking", { bookingId: booking._id })
      return result
    }

    // Look for matching treatment in professional's treatments array
    const professionalTreatment = professional.treatments.find(pt => {
      const ptTreatmentId = pt.treatmentId?.toString()
      const ptDurationId = pt.durationId?.toString()
      
      // For duration-based treatments, both treatmentId and durationId must match
      if (selectedDurationId && ptDurationId) {
        return ptTreatmentId === treatmentId && ptDurationId === selectedDurationId
      }
      
      // For fixed-price treatments, only treatmentId needs to match (and no durationId)
      return ptTreatmentId === treatmentId && !ptDurationId
    })

    if (!professionalTreatment) {
      logger.warn("Professional treatment not found", { 
        treatmentId, 
        selectedDurationId,
        professionalId: professional._id,
        professionalTreatments: professional.treatments.map(t => ({
          treatmentId: t.treatmentId?.toString(),
          durationId: t.durationId?.toString()
        }))
      })
      return result
    }

    // Found the treatment, set base payment
    result.baseProfessionalPayment = professionalTreatment.professionalPrice || 0
    result.calculationDetails.treatmentFound = true
    result.calculationDetails.treatmentPrice = professionalTreatment.professionalPrice || 0

    // Calculate surcharges professional payment
    if (booking.priceDetails?.surcharges?.length) {
      booking.priceDetails.surcharges.forEach(surcharge => {
        if (surcharge.professionalShare) {
          let professionalAmount = 0
          
          if (surcharge.professionalShare.type === 'fixed') {
            professionalAmount = surcharge.professionalShare.amount
          } else if (surcharge.professionalShare.type === 'percentage') {
            professionalAmount = (surcharge.amount * surcharge.professionalShare.amount) / 100
          }
          
          result.surchargesProfessionalPayment += professionalAmount
          result.calculationDetails.surcharges.push({
            description: surcharge.description,
            amount: professionalAmount
          })
        }
      })
    }

    // Calculate total
    result.totalProfessionalPayment = result.baseProfessionalPayment + result.surchargesProfessionalPayment

    logger.info("Professional payment calculated", {
      bookingId: booking._id,
      professionalId: professional._id,
      treatmentId,
      selectedDurationId,
      baseProfessionalPayment: result.baseProfessionalPayment,
      surchargesProfessionalPayment: result.surchargesProfessionalPayment,
      totalProfessionalPayment: result.totalProfessionalPayment
    })

    return result

  } catch (error) {
    logger.error("Error calculating professional payment", {
      error,
      bookingId: booking._id,
      professionalId: professional._id
    })
    return result
  }
}

/**
 * Updates booking price details with calculated professional payment
 * Respects any existing professionalPaymentOverride set by admin
 */
export function updateBookingWithProfessionalPayment(
  booking: IBooking,
  paymentCalculation: ProfessionalPaymentCalculation
): void {
  if (!booking.priceDetails) {
    logger.error("No price details found in booking", { bookingId: booking._id })
    return
  }

  booking.priceDetails.baseProfessionalPayment = paymentCalculation.baseProfessionalPayment
  booking.priceDetails.surchargesProfessionalPayment = paymentCalculation.surchargesProfessionalPayment
  
  // Use override if it exists, otherwise use calculated amount
  const finalProfessionalPayment = booking.priceDetails.professionalPaymentOverride !== undefined
    ? booking.priceDetails.professionalPaymentOverride
    : paymentCalculation.totalProfessionalPayment
    
  booking.priceDetails.totalProfessionalPayment = finalProfessionalPayment
  
  // Calculate office commission (customer paid - professional receives)
  const customerPaid = booking.priceDetails.finalAmount || 0
  const professionalReceives = finalProfessionalPayment
  booking.priceDetails.totalOfficeCommission = customerPaid - professionalReceives

  logger.info("Booking updated with professional payment", {
    bookingId: booking._id,
    customerPaid,
    professionalReceives,
    officeCommission: booking.priceDetails.totalOfficeCommission,
    hasOverride: booking.priceDetails.professionalPaymentOverride !== undefined,
    overrideAmount: booking.priceDetails.professionalPaymentOverride
  })
}

/**
 * Helper function to get professional payment amount for a specific treatment
 * Used by the admin interface when showing potential assignments
 */
export function getProfessionalPaymentForTreatment(
  professional: IProfessionalProfile,
  treatmentId: string,
  durationId?: string
): number {
  const professionalTreatment = professional.treatments.find(pt => {
    const ptTreatmentId = pt.treatmentId?.toString()
    const ptDurationId = pt.durationId?.toString()
    
    if (durationId && ptDurationId) {
      return ptTreatmentId === treatmentId && ptDurationId === durationId
    }
    
    return ptTreatmentId === treatmentId && !ptDurationId
  })

  return professionalTreatment?.professionalPrice || 0
} 