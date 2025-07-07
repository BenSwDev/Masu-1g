import mongoose from "mongoose"
import dbConnect from "@/lib/db/mongoose"
import ProfessionalProfile, { IProfessionalProfile } from "@/lib/db/models/professional-profile"
import Booking, { IBooking } from "@/lib/db/models/booking"
import User, { IUser } from "@/lib/db/models/user"
import { logger } from "@/lib/logs/logger"

export interface ProfessionalMatchResult {
  professional: IProfessionalProfile & { userId: IUser }
  matchScore: number
  matchReasons: string[]
  canMatch: boolean
  issues?: string[]
}

export interface MatchingCriteria {
  treatmentId: string
  cityName: string
  patientGender?: "male" | "female"
  therapistGenderPreference?: "male" | "female" | "any"
  durationId?: string
  bookingDateTime?: Date
  isFlexible?: boolean
  flexibilityHours?: number
}

/**
 * שירות התאמה מתקדם בין מטפלים להזמנות
 * מטפל בהתאמה דו-כיוונית, ניקוד התאמה, ותאימות מלאה
 */
export class ProfessionalMatchingService {
  
  /**
   * מוצא מטפלים מתאימים להזמנה עם ניקוד התאמה
   */
  static async findSuitableProfessionals(
    bookingId: string,
    options: {
      includePartialMatches?: boolean
      maxResults?: number
      minMatchScore?: number
    } = {}
  ): Promise<ProfessionalMatchResult[]> {
    try {
      await dbConnect()
      
      const booking = await Booking.findById(bookingId)
        .populate('treatmentId')
        .populate('userId')
        .lean()
        
      if (!booking) {
        throw new Error("הזמנה לא נמצאה")
      }

      const criteria: MatchingCriteria = {
        treatmentId: booking.treatmentId._id.toString(),
        cityName: booking.bookingAddressSnapshot?.city || "",
        patientGender: booking.recipientGender || (booking.userId as any)?.gender,
        therapistGenderPreference: booking.therapistGenderPreference,
        durationId: booking.selectedDurationId?.toString(),
        bookingDateTime: booking.bookingDateTime,
        isFlexible: booking.isFlexibleTime,
        flexibilityHours: booking.flexibilityRangeHours
      }

      return await this.findProfessionalsByCriteria(criteria, options)
      
    } catch (error) {
      logger.error("Error finding suitable professionals:", error)
      throw error
    }
  }

  /**
   * מוצא מטפלים לפי קריטריונים מותאמים אישית
   */
  static async findProfessionalsByCriteria(
    criteria: MatchingCriteria,
    options: {
      includePartialMatches?: boolean
      maxResults?: number
      minMatchScore?: number
    } = {}
  ): Promise<ProfessionalMatchResult[]> {
    try {
      await dbConnect()
      
      const {
        includePartialMatches = false,
        maxResults = 50,
        minMatchScore = includePartialMatches ? 0.3 : 0.7
      } = options

      // שאילתה בסיסית - מטפלים פעילים
      const query: any = {
        status: 'active',
        isActive: true
      }

      // מוצא מטפלים עם populate
      const professionals = await ProfessionalProfile.find(query)
        .populate({
          path: 'userId',
          select: 'name email phone gender roles',
          match: { roles: 'professional', isActive: true }
        })
        .populate('treatments.treatmentId')
        .populate('workAreas.cityId')
        .lean()

      // מסנן מטפלים שיש להם userId (למניעת null)
      const validProfessionals = professionals.filter(prof => prof.userId) as (IProfessionalProfile & { userId: IUser })[]

      // מחשב ניקוד התאמה לכל מטפל
      const matchResults: ProfessionalMatchResult[] = []

      for (const professional of validProfessionals) {
        const matchResult = await this.calculateMatch(professional, criteria)
        
        if (matchResult.matchScore >= minMatchScore) {
          matchResults.push(matchResult)
        }
      }

      // ממיין לפי ניקוד התאמה ומגביל תוצאות
      return matchResults
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, maxResults)
        
    } catch (error) {
      logger.error("Error finding professionals by criteria:", error)
      throw error
    }
  }

  /**
   * מחשב ניקוד התאמה בין מטפל להזמנה
   */
  static async calculateMatch(
    professional: IProfessionalProfile & { userId: IUser },
    criteria: MatchingCriteria
  ): Promise<ProfessionalMatchResult> {
    const matchReasons: string[] = []
    const issues: string[] = []
    let totalScore = 0
    let maxPossibleScore = 0
    let canMatch = true

    // 1. בדיקת טיפול (חובה - 30 נקודות)
    maxPossibleScore += 30
    const treatmentMatch = this.checkTreatmentMatch(professional, criteria)
    if (treatmentMatch.matches) {
      totalScore += 30
      matchReasons.push("מספק את הטיפול הנדרש")
    } else {
      canMatch = false
      issues.push("לא מספק את הטיפול הנדרש")
    }

    // 2. בדיקת איזור עבודה (חובה - 25 נקודות)
    maxPossibleScore += 25
    const locationMatch = this.checkLocationMatch(professional, criteria)
    if (locationMatch.matches) {
      totalScore += 25
      matchReasons.push(`מכסה את האזור: ${criteria.cityName}`)
    } else {
      canMatch = false
      issues.push(`לא מכסה את האזור: ${criteria.cityName}`)
    }

    // 3. בדיקת העדפת מין מצד המטפל (20 נקודות)
    maxPossibleScore += 20
    const professionalGenderPref = this.checkProfessionalGenderPreference(professional, criteria)
    if (professionalGenderPref.matches) {
      totalScore += 20
      matchReasons.push(professionalGenderPref.reason)
    } else {
      if (professionalGenderPref.blocking) {
        canMatch = false
        issues.push(professionalGenderPref.reason)
      } else {
        // לא חוסם אבל מפחית ניקוד
        totalScore += 10
        matchReasons.push("התאמה חלקית בהעדפת מין")
      }
    }

    // 4. בדיקת העדפת מין מצד הלקוח (15 נקודות)
    maxPossibleScore += 15
    const clientGenderPref = this.checkClientGenderPreference(professional, criteria)
    if (clientGenderPref.matches) {
      totalScore += 15
      matchReasons.push(clientGenderPref.reason)
    } else {
      if (clientGenderPref.blocking) {
        canMatch = false
        issues.push(clientGenderPref.reason)
      }
    }

    // 5. בדיקת זמינות זמן (10 נקודות)
    maxPossibleScore += 10
    if (criteria.bookingDateTime) {
      const timeMatch = this.checkTimeAvailability(professional, criteria)
      if (timeMatch.matches) {
        totalScore += 10
        matchReasons.push("זמין בזמן הנדרש")
      } else {
        // לא חוסם אבל מקטין ניקוד
        totalScore += 5
        matchReasons.push("יתכן שזמין (לא נבדק)")
      }
    } else {
      totalScore += 10 // אין בדיקת זמן - נקודות מלאות
    }

    const matchScore = totalScore / maxPossibleScore

    return {
      professional,
      matchScore,
      matchReasons,
      canMatch,
      issues: issues.length > 0 ? issues : undefined
    }
  }

  /**
   * בודק התאמת טיפול
   */
  private static checkTreatmentMatch(
    professional: IProfessionalProfile,
    criteria: MatchingCriteria
  ): { matches: boolean; reason?: string } {
    const hasBasicTreatment = professional.treatments.some(t => 
      t.treatmentId.toString() === criteria.treatmentId
    )

    if (!hasBasicTreatment) {
      return { matches: false, reason: "אינו מספק את הטיפול" }
    }

    // בדיקת משך זמן ספציפי אם נדרש
    if (criteria.durationId) {
      const hasDurationMatch = professional.treatments.some(t => 
        t.treatmentId.toString() === criteria.treatmentId &&
        (!t.durationId || t.durationId.toString() === criteria.durationId)
      )
      
      if (!hasDurationMatch) {
        return { matches: false, reason: "אינו מספק את משך הטיפול הנדרש" }
      }
    }

    return { matches: true, reason: "מספק את הטיפול הנדרש" }
  }

  /**
   * בודק התאמת מיקום
   */
  private static checkLocationMatch(
    professional: IProfessionalProfile,
    criteria: MatchingCriteria
  ): { matches: boolean; reason?: string } {
    const coversCity = professional.workAreas.some(area => {
      return area.cityName === criteria.cityName || 
             area.coveredCities.includes(criteria.cityName)
    })

    return {
      matches: coversCity,
      reason: coversCity ? 
        `מכסה את ${criteria.cityName}` : 
        `לא מכסה את ${criteria.cityName}`
    }
  }

  /**
   * בודק העדפת מין של המטפל
   */
  private static checkProfessionalGenderPreference(
    professional: IProfessionalProfile & { userId: IUser },
    criteria: MatchingCriteria
  ): { matches: boolean; blocking: boolean; reason: string } {
    const professionalPref = professional.genderPreference || "no_preference"
    const patientGender = criteria.patientGender

    if (professionalPref === "no_preference") {
      return {
        matches: true,
        blocking: false,
        reason: "המטפל ללא העדפת מין"
      }
    }

    if (!patientGender) {
      return {
        matches: true,
        blocking: false,
        reason: "מין המטופל לא מוגדר"
      }
    }

    const wantsMale = professionalPref === "male_only"
    const wantsFemale = professionalPref === "female_only"
    const isMalePatient = patientGender === "male"
    const isFemalePatient = patientGender === "female"

    if ((wantsMale && isMalePatient) || (wantsFemale && isFemalePatient)) {
      return {
        matches: true,
        blocking: false,
        reason: `התאמה מושלמת - המטפל מעדיף ${professionalPref === "male_only" ? "גברים" : "נשים"}`
      }
    }

    return {
      matches: false,
      blocking: true,
      reason: `אי-התאמה - המטפל מעדיף ${professionalPref === "male_only" ? "גברים" : "נשים"} בלבד`
    }
  }

  /**
   * בודק העדפת מין של הלקוח
   */
  private static checkClientGenderPreference(
    professional: IProfessionalProfile & { userId: IUser },
    criteria: MatchingCriteria
  ): { matches: boolean; blocking: boolean; reason: string } {
    const clientPref = criteria.therapistGenderPreference
    const professionalGender = professional.userId.gender

    if (!clientPref || clientPref === "any") {
      return {
        matches: true,
        blocking: false,
        reason: "הלקוח ללא העדפת מין"
      }
    }

    if (!professionalGender) {
      return {
        matches: true,
        blocking: false,
        reason: "מין המטפל לא מוגדר"
      }
    }

    const matches = clientPref === professionalGender

    return {
      matches,
      blocking: !matches,
      reason: matches ? 
        `התאמה מושלמת - הלקוח מעדיף ${clientPref === "male" ? "מטפל" : "מטפלת"}` :
        `אי-התאמה - הלקוח מעדיף ${clientPref === "male" ? "מטפל" : "מטפלת"}`
    }
  }

  /**
   * בודק זמינות זמן (פונקציה פשוטה - ניתן להרחיב)
   */
  private static checkTimeAvailability(
    professional: IProfessionalProfile,
    criteria: MatchingCriteria
  ): { matches: boolean; reason?: string } {
    // כרגע מחזיר true תמיד - ניתן להוסיף לוגיקה מתקדמת
    // של בדיקת שעות עבודה, הזמנות קיימות וכו'
    return {
      matches: true,
      reason: "זמינות לא נבדקה (מניח זמינות)"
    }
  }

  /**
   * מוודא תאימות בין מטפל ספציפי להזמנה
   */
  static async validateMatch(
    professionalId: string,
    bookingId: string
  ): Promise<{ isValid: boolean; issues: string[]; matchScore?: number }> {
    try {
      await dbConnect()
      
      const [professional, booking] = await Promise.all([
        ProfessionalProfile.findOne({ userId: professionalId })
          .populate('userId')
          .lean(),
        Booking.findById(bookingId)
          .populate('treatmentId')
          .populate('userId')
          .lean()
      ])

      if (!professional || !booking) {
        return {
          isValid: false,
          issues: ["מטפל או הזמנה לא נמצאו"]
        }
      }

      const criteria: MatchingCriteria = {
        treatmentId: booking.treatmentId._id.toString(),
        cityName: booking.bookingAddressSnapshot?.city || "",
        patientGender: booking.recipientGender || (booking.userId as any)?.gender,
        therapistGenderPreference: booking.therapistGenderPreference,
        durationId: booking.selectedDurationId?.toString(),
        bookingDateTime: booking.bookingDateTime,
        isFlexible: booking.isFlexibleTime,
        flexibilityHours: booking.flexibilityRangeHours
      }

      const matchResult = await this.calculateMatch(professional as any, criteria)

      return {
        isValid: matchResult.canMatch,
        issues: matchResult.issues || [],
        matchScore: matchResult.matchScore
      }
      
    } catch (error) {
      logger.error("Error validating professional match:", error)
      return {
        isValid: false,
        issues: ["שגיאה בבדיקת התאמה"]
      }
    }
  }

  /**
   * מקבל המלצות מטפלים מלאות להזמנה
   */
  static async getRecommendations(
    bookingId: string,
    limit: number = 10
  ): Promise<{
    perfect: ProfessionalMatchResult[]
    good: ProfessionalMatchResult[]
    partial: ProfessionalMatchResult[]
    total: number
  }> {
    const allMatches = await this.findSuitableProfessionals(bookingId, {
      includePartialMatches: true,
      maxResults: 50,
      minMatchScore: 0.3
    })

    const perfect = allMatches.filter(m => m.matchScore >= 0.9)
    const good = allMatches.filter(m => m.matchScore >= 0.7 && m.matchScore < 0.9)
    const partial = allMatches.filter(m => m.matchScore >= 0.3 && m.matchScore < 0.7)

    return {
      perfect: perfect.slice(0, limit),
      good: good.slice(0, limit),
      partial: partial.slice(0, limit),
      total: allMatches.length
    }
  }
} 