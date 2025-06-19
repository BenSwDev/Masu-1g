import { unifiedNotificationService } from "./unified-notification-service"
import type { NotificationRecipient, NotificationData, NotificationResult } from "./notification-types"
import { User, type IUser, type INotificationPreferences } from "@/lib/db/models/user"
import { logger } from "@/lib/logs/logger"
import dbConnect from "@/lib/db/mongoose"

interface UserNotificationProfile {
  userId: string
  email: string
  phone?: string
  preferences: INotificationPreferences
  name?: string
}

/**
 * Smart Notification Service - respects user preferences
 * Always uses user's preferred communication methods and language
 */
export class SmartNotificationService {
  
  /**
   * Get user notification profile with preferences
   */
  private async getUserProfile(userId: string): Promise<UserNotificationProfile | null> {
    try {
      await dbConnect()
      const user = await User.findById(userId).select('email phone notificationPreferences name').lean() as IUser | null
      
      if (!user) {
        logger.warn(`User not found for notifications: ${userId}`)
        return null
      }

      // Ensure default preferences if not set
      const preferences: INotificationPreferences = user.notificationPreferences || {
        methods: ["email", "sms"],
        language: "he"
      }

      return {
        userId,
        email: user.email,
        phone: user.phone,
        preferences,
        name: user.name
      }
    } catch (error) {
      logger.error(`Failed to get user profile for notifications:`, { userId, error })
      return null
    }
  }

  /**
   * Create recipients based on user preferences
   */
  private createRecipientsFromProfile(profile: UserNotificationProfile): NotificationRecipient[] {
    const recipients: NotificationRecipient[] = []

    profile.preferences.methods.forEach(method => {
      if (method === "email") {
        recipients.push({
          type: "email",
          value: profile.email,
          name: profile.name,
          language: profile.preferences.language
        })
      } else if (method === "sms" && profile.phone) {
        recipients.push({
          type: "phone", 
          value: profile.phone,
          language: profile.preferences.language
        })
      }
    })

    return recipients
  }

  /**
   * Send notification to user respecting their preferences
   */
  async sendToUser(
    userId: string, 
    data: NotificationData
  ): Promise<NotificationResult[]> {
    const profile = await this.getUserProfile(userId)
    if (!profile) {
      return [{ success: false, error: "User not found or has no contact information" }]
    }

    const recipients = this.createRecipientsFromProfile(profile)
    if (recipients.length === 0) {
      logger.warn(`No valid notification methods for user: ${userId}`)
      return [{ success: false, error: "No valid notification methods configured" }]
    }

    logger.info(`Sending notification to user ${userId} via ${recipients.map(r => r.type).join(', ')}`)
    return await unifiedNotificationService.sendNotificationToMultiple(recipients, data)
  }

  /**
   * Send notification to multiple users respecting their individual preferences
   */
  async sendToMultipleUsers(
    userIds: string[], 
    data: NotificationData
  ): Promise<{ [userId: string]: NotificationResult[] }> {
    const results: { [userId: string]: NotificationResult[] } = {}
    
    // Process users in parallel
    const promises = userIds.map(async (userId) => {
      const userResults = await this.sendToUser(userId, data)
      return { userId, results: userResults }
    })

    const settled = await Promise.allSettled(promises)
    
    settled.forEach((result, index) => {
      const userId = userIds[index]
      if (result.status === 'fulfilled') {
        results[userId] = result.value.results
      } else {
        logger.error(`Failed to send notification to user ${userId}:`, result.reason)
        results[userId] = [{ success: false, error: "Failed to process notification" }]
      }
    })

    return results
  }

  /**
   * Send OTP respecting user preferences
   */
  async sendOTPToUser(
    userId: string,
    length: number = 6,
    expiryMinutes: number = 10
  ): Promise<{ code: string; expiryDate: Date; results: NotificationResult[] }> {
    const profile = await this.getUserProfile(userId)
    if (!profile) {
      const fallbackCode = Array.from({ length }, () => Math.floor(Math.random() * 10)).join("")
      const fallbackExpiry = new Date(Date.now() + expiryMinutes * 60 * 1000)
      return {
        code: fallbackCode,
        expiryDate: fallbackExpiry,
        results: [{ success: false, error: "User not found" }]
      }
    }

    const recipients = this.createRecipientsFromProfile(profile)
    if (recipients.length === 0) {
      const fallbackCode = Array.from({ length }, () => Math.floor(Math.random() * 10)).join("")
      const fallbackExpiry = new Date(Date.now() + expiryMinutes * 60 * 1000)
      return {
        code: fallbackCode,
        expiryDate: fallbackExpiry,
        results: [{ success: false, error: "No notification methods configured" }]
      }
    }

    // Use the first preferred method for OTP generation
    const primaryRecipient = recipients[0]
    const { code, expiryDate, result } = await unifiedNotificationService.sendOTP(
      primaryRecipient, 
      length, 
      expiryMinutes
    )

    // Send to all other configured methods as well
    const otherResults: NotificationResult[] = []
    if (recipients.length > 1) {
      const otpData: NotificationData = {
        type: "otp",
        code,
        expiresIn: expiryMinutes
      }
      
      const otherRecipients = recipients.slice(1)
      const additionalResults = await unifiedNotificationService.sendNotificationToMultiple(
        otherRecipients, 
        otpData
      )
      otherResults.push(...additionalResults)
    }

    return {
      code,
      expiryDate,
      results: [result, ...otherResults]
    }
  }

  /**
   * Send to guest user (no preferences, use defaults)
   */
  async sendToGuest(
    email: string, 
    phone: string | null, 
    data: NotificationData,
    language: "he" | "en" | "ru" = "he",
    name?: string
  ): Promise<NotificationResult[]> {
    const recipients: NotificationRecipient[] = []
    
    // Always send to email for guests
    recipients.push({
      type: "email",
      value: email,
      name,
      language
    })

    // Send to phone if provided
    if (phone) {
      recipients.push({
        type: "phone",
        value: phone, 
        language
      })
    }

    return await unifiedNotificationService.sendNotificationToMultiple(recipients, data)
  }

  /**
   * Send to professional with booking notifications
   */
  async sendToProfessional(
    professionalId: string,
    data: NotificationData
  ): Promise<NotificationResult[]> {
    // For professionals, always send both SMS and Email for critical booking notifications
    const profile = await this.getUserProfile(professionalId)
    if (!profile || !profile.phone) {
      return [{ success: false, error: "Professional not found or has no contact information" }]
    }

    const recipients: NotificationRecipient[] = [
      {
        type: "email",
        value: profile.email,
        name: profile.name,
        language: profile.preferences.language
      },
      {
        type: "phone",
        value: profile.phone,
        language: profile.preferences.language
      }
    ]

    logger.info(`Sending professional notification to ${professionalId} via email and SMS`)
    return await unifiedNotificationService.sendNotificationToMultiple(recipients, data)
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<INotificationPreferences>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await dbConnect()
      
      const updateData: any = {}
      if (preferences.methods) {
        updateData['notificationPreferences.methods'] = preferences.methods
      }
      if (preferences.language) {
        updateData['notificationPreferences.language'] = preferences.language
      }

      const result = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true }
      )

      if (!result) {
        return { success: false, error: "User not found" }
      }

      logger.info(`Updated notification preferences for user ${userId}`, preferences)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to update notification preferences:`, { userId, preferences, error })
      return { success: false, error: "Failed to update preferences" }
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<INotificationPreferences | null> {
    const profile = await this.getUserProfile(userId)
    return profile?.preferences || null
  }
}

// Export singleton instance
export const smartNotificationService = new SmartNotificationService() 