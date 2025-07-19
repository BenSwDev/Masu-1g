import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { logger } from "@/lib/logs/logger"
import dbConnect from "@/lib/db/mongoose"
import mongoose from "mongoose"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return NextResponse.json(
        { success: false, error: "common.unauthorized" },
        { status: 401 }
      )
    }

    const { bookingId } = await params
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json(
        { success: false, error: "Invalid booking ID" },
        { status: 400 }
      )
    }

    await dbConnect()

    // Import models
    const Booking = (await import("@/lib/db/models/booking")).default
    const ProfessionalProfile = (await import("@/lib/db/models/professional-profile")).default
    const User = (await import("@/lib/db/models/user")).default
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default

    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate('treatmentId')
      .populate('selectedDurationId')
      .lean()

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      )
    }

    // Extract booking criteria
    const treatmentId = booking.treatmentId._id.toString()
    const cityName = booking.bookingAddressSnapshot?.city
    const genderPreference = booking.therapistGenderPreference || "any"
    const durationId = booking.selectedDurationId?._id.toString()
    
    const bookingCriteria = {
      treatmentId,
      treatmentName: (booking.treatmentId as any)?.name || "טיפול",
      cityName: cityName || "לא צוין",
      genderPreference,
      durationId,
      durationName: booking.selectedDurationId ? 
        (booking.selectedDurationId as any)?.name || `${(booking.selectedDurationId as any)?.durationMinutes} דקות` : 
        "כל משך זמן"
    }

    // Get all active professionals
    const allProfessionals = await ProfessionalProfile.find({
      status: 'active',
      isActive: true
    })
      .populate({
        path: 'userId',
        select: 'name email phone gender roles notificationPreferences',
        match: { roles: 'professional' }
      })
      .populate('treatments.treatmentId')
      .lean()

    // Filter out professionals where userId is null (didn't match professional role)
    const validProfessionals = allProfessionals.filter(prof => prof.userId !== null)

    // Get notification responses for this booking
    const responses = await (ProfessionalResponse.find as any)({
      bookingId: new mongoose.Types.ObjectId(bookingId)
    }).lean()

    const responseMap = new Map()
    responses.forEach(response => {
      const profId = response.professionalId.toString()
      if (!responseMap.has(profId) || response.createdAt > responseMap.get(profId).createdAt) {
        responseMap.set(profId, response)
      }
    })

    // Analyze each professional
    const professionalAnalysis = validProfessionals.map(prof => {
      const user = prof.userId as any
      const profId = user._id.toString()
      
      // Check criteria matching
      const criteriaMatch = {
        // 1. Treatment matching
        treatmentMatch: {
          matches: prof.treatments.some(t => t.treatmentId._id.toString() === treatmentId),
          details: prof.treatments.find(t => t.treatmentId._id.toString() === treatmentId) ? 
            `מטפל בטיפול: ${bookingCriteria.treatmentName}` : 
            `לא מטפל בטיפול: ${bookingCriteria.treatmentName}`
        },
        
        // 2. City coverage
        cityMatch: {
          matches: prof.workAreas.some(area => 
            area.cityName === cityName || area.coveredCities?.includes(cityName)
          ),
          details: prof.workAreas.some(area => 
            area.cityName === cityName || area.coveredCities?.includes(cityName)
          ) ? 
            `מכסה את העיר: ${cityName}` : 
            `לא מכסה את העיר: ${cityName}`
        },
        
        // 3. Gender preference (from booking side)
        genderMatch: {
          matches: genderPreference === "any" || user.gender === genderPreference,
          details: genderPreference === "any" ? 
            "אין העדפת מין" : 
            (user.gender === genderPreference ? 
              `מין מתאים: ${genderPreference === "male" ? "זכר" : "נקבה"}` : 
              `מין לא מתאים: נדרש ${genderPreference === "male" ? "זכר" : "נקבה"}, מטפל הוא ${user.gender === "male" ? "זכר" : "נקבה"}`)
        },
        
        // 4. Duration support
        durationMatch: {
          matches: !durationId || prof.treatments.some(t => 
            t.treatmentId._id.toString() === treatmentId &&
            (!t.durationId || t.durationId.toString() === durationId)
          ),
          details: !durationId ? 
            "אין דרישת משך זמן ספציפי" : 
            (prof.treatments.some(t => 
              t.treatmentId._id.toString() === treatmentId &&
              (!t.durationId || t.durationId.toString() === durationId)
            ) ? 
              `תומך במשך זמן: ${bookingCriteria.durationName}` : 
              `לא תומך במשך זמן: ${bookingCriteria.durationName}`)
        }
      }

      // Overall suitability
      const isSuitable = criteriaMatch.treatmentMatch.matches && 
                        criteriaMatch.cityMatch.matches && 
                        criteriaMatch.genderMatch.matches && 
                        criteriaMatch.durationMatch.matches

      // Notification status
      const response = responseMap.get(profId)
      const notificationStatus = {
        sent: !!response,
        lastSent: response?.createdAt || null,
        status: response?.status || "not_sent",
        responseDate: response?.respondedAt || null
      }

      // User notification preferences
      const userNotificationMethods = user.notificationPreferences?.methods || ["sms"]
      const notificationPreferences = {
        methods: userNotificationMethods,
        email: !!user.email && userNotificationMethods.includes("email"),
        sms: !!user.phone && userNotificationMethods.includes("sms")
      }

      // Calculate expected professional payment
      let expectedPayment = {
        basePayment: 0,
        surcharges: 0,
        paymentBonus: 0,
        total: 0
      }

      try {
        // Find the professional's price for this specific treatment and duration
        const professionalTreatment = prof.treatments.find(pt => {
          const ptTreatmentId = pt.treatmentId._id.toString()
          const ptDurationId = pt.durationId?.toString()
          
          // For duration-based treatments, both treatmentId and durationId must match
          if (durationId && ptDurationId) {
            return ptTreatmentId === treatmentId && ptDurationId === durationId
          }
          
          // For fixed-price treatments, only treatmentId needs to match (and no durationId)
          return ptTreatmentId === treatmentId && !ptDurationId
        })

        if (professionalTreatment) {
          expectedPayment.basePayment = professionalTreatment.professionalPrice || 0
          
          // Add surcharges from booking if any
          if (booking.priceDetails?.surcharges?.length) {
            booking.priceDetails.surcharges.forEach((surcharge: any) => {
              if (surcharge.professionalShare) {
                let professionalAmount = 0
                
                if (surcharge.professionalShare.type === 'fixed') {
                  professionalAmount = surcharge.professionalShare.amount
                } else if (surcharge.professionalShare.type === 'percentage') {
                  professionalAmount = (surcharge.amount * surcharge.professionalShare.amount) / 100
                }
                
                expectedPayment.surcharges += professionalAmount
              }
            })
          }
          
          // Add payment bonus if exists
          if (booking.priceDetails?.paymentBonus) {
            expectedPayment.paymentBonus = booking.priceDetails.paymentBonus.amount
          }
          
          expectedPayment.total = expectedPayment.basePayment + expectedPayment.surcharges + expectedPayment.paymentBonus
        }
      } catch (error) {
        logger.warn("Failed to calculate expected payment for professional", { 
          error, 
          professionalId: profId,
          bookingId
        })
      }

      return {
        _id: profId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        profileId: prof._id.toString(),
        isSuitable,
        criteriaMatch,
        notificationStatus,
        notificationPreferences,
        expectedPayment,
        workAreas: prof.workAreas.map(area => ({
          cityName: area.cityName,
          coveredCities: area.coveredCities || [],
          radius: area.distanceRadius === 'unlimited' ? 'כל מרחק' : area.distanceRadius || '20km'
        })),
        treatments: prof.treatments.map(t => ({
          treatmentId: t.treatmentId._id.toString(),
          treatmentName: (t.treatmentId as any)?.name || "טיפול",
          durationId: t.durationId?.toString()
        }))
      }
    })

    // Sort by suitability first, then by name
    professionalAnalysis.sort((a, b) => {
      if (a.isSuitable && !b.isSuitable) return -1
      if (!a.isSuitable && b.isSuitable) return 1
      return a.name.localeCompare(b.name)
    })

    logger.info("Retrieved detailed suitable professionals analysis", {
      bookingId,
      totalProfessionals: professionalAnalysis.length,
      suitableProfessionals: professionalAnalysis.filter(p => p.isSuitable).length,
      adminId: session.user.id
    })

    return NextResponse.json({
      success: true,
      booking: {
        _id: bookingId,
        bookingNumber: booking.bookingNumber,
        criteria: bookingCriteria
      },
      professionals: professionalAnalysis,
      summary: {
        total: professionalAnalysis.length,
        suitable: professionalAnalysis.filter(p => p.isSuitable).length,
        notificationsSent: professionalAnalysis.filter(p => p.notificationStatus.sent).length
      }
    })

  } catch (error) {
    logger.error("Error in suitable-professionals-detailed endpoint:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 