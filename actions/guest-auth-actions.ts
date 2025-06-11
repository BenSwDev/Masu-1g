"use server"

import { hashPassword, validateEmail, validatePhone } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

interface UserConflictResult {
  hasConflict: boolean
  type?: "both_match" | "email_match" | "phone_match" | "cross_match" | "partial_match"
  primaryUser?: any
  emailUser?: any
  phoneUser?: any
}

/**
 * Enhanced phone variations generator - handles more Israeli phone formats
 */
function generatePhoneVariations(phone: string): string[] {
  if (!phone) return []

  // Clean and normalize the phone number
  let cleaned = phone.replace(/[^\d+]/g, "")
  const variations = new Set<string>()

  // Handle different starting formats
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("00972")) {
      // International format without +
      cleaned = "+" + cleaned.substring(2)
    } else if (cleaned.startsWith("972")) {
      // Country code without +
      cleaned = "+" + cleaned
    } else if (cleaned.startsWith("0")) {
      // Israeli number starting with 0
      cleaned = "+972" + cleaned.substring(1)
    } else if (cleaned.length === 9 && /^[5-9]/.test(cleaned)) {
      // Israeli mobile number without 0
      cleaned = "+972" + cleaned
    } else {
      // Default: assume Israeli number
      cleaned = "+972" + cleaned
    }
  }

  // Handle +972 numbers that might have 0 after country code
  if (cleaned.startsWith("+9720")) {
    cleaned = "+972" + cleaned.substring(5)
  }

  // Get the base number components
  const countryCode = "+972"
  const nationalNumber = cleaned.replace(countryCode, "").replace(/\D/g, "")

  // Generate all possible variations
  variations.add(cleaned) // Original cleaned
  variations.add(`${countryCode}${nationalNumber}`) // Without leading zero
  variations.add(`${countryCode}0${nationalNumber}`) // With leading zero
  variations.add(`972${nationalNumber}`) // Without + but with country code
  variations.add(`9720${nationalNumber}`) // Without + but with country code and zero
  variations.add(`0${nationalNumber}`) // Local format with zero
  variations.add(nationalNumber) // Just the number

  // Remove empty strings and return as array
  return Array.from(variations).filter(v => v.length >= 9)
}

/**
 * Enhanced conflict detection with more sophisticated scenarios
 */
async function detectUserConflicts(email: string, phone?: string): Promise<UserConflictResult> {
  const result: UserConflictResult = { hasConflict: false }
  
  // Check email conflicts (case-insensitive)
  const emailUser = await User.findOne({ 
    email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    isGuest: { $ne: true },
    parentUserId: { $exists: false } // Exclude merged guests
  }).lean()
  
  let phoneUser = null
  if (phone) {
    // Enhanced phone search with all variations
    const phoneVariations = generatePhoneVariations(phone)
    phoneUser = await User.findOne({
      phone: { $in: phoneVariations },
      isGuest: { $ne: true },
      parentUserId: { $exists: false } // Exclude merged guests
    }).lean()
  }
  
  // Enhanced conflict analysis
  if (emailUser && phoneUser) {
    if (emailUser._id.toString() === phoneUser._id.toString()) {
      // Perfect match - same user with both email and phone
      result.hasConflict = true
      result.type = "both_match"
      result.primaryUser = emailUser
    } else {
      // Complex cross-conflict: email belongs to user A, phone to user B
      result.hasConflict = true
      result.type = "cross_match"
      result.emailUser = emailUser
      result.phoneUser = phoneUser
    }
  } else if (emailUser && !phoneUser) {
    // Email exists but phone is either new or not provided
    if (phone) {
      // Email exists, phone is new - likely same user with updated phone
      result.hasConflict = true
      result.type = "email_match"
      result.primaryUser = emailUser
    } else {
      // Email exists, no phone provided - definitely same user
      result.hasConflict = true
      result.type = "email_match"
      result.primaryUser = emailUser
    }
  } else if (!emailUser && phoneUser) {
    // Phone exists but email is new - could be same user with new email
    result.hasConflict = true
    result.type = "phone_match"
    result.primaryUser = phoneUser
  }
  
  // Additional edge case: Check for similar emails or phone typos
  if (!result.hasConflict && email && phone) {
    const similarEmailUser = await User.findOne({
      email: { 
        $regex: new RegExp(`^${email.split('@')[0]}.*@${email.split('@')[1]}$`, 'i') 
      },
      isGuest: { $ne: true },
      parentUserId: { $exists: false }
    }).lean()
    
    if (similarEmailUser && similarEmailUser.email !== email.toLowerCase()) {
      result.hasConflict = true
      result.type = "partial_match"
      result.primaryUser = similarEmailUser
    }
  }
  
  return result
}

export interface CreateGuestUserPayload {
  name: string
  email: string
  phone?: string
  gender?: "male" | "female" | "other"
  dateOfBirth?: Date
}

export interface GuestUserResult {
  success: boolean
  guestUserId?: string
  existingUserId?: string
  guestSessionId?: string
  error?: string
  shouldMerge?: boolean
  conflictType?: "none" | "email_match" | "phone_match" | "both_match" | "cross_match" | "partial_match"
  conflictDetails?: {
    emailConflictUserId?: string
    phoneConflictUserId?: string
    conflictResolution?: "merge" | "create_new" | "manual_resolve"
    isExistingSession?: boolean
  }
}

/**
 * Create a guest user for purchase flows
 * Enhanced with better conflict handling and validation
 */
export async function createGuestUser(payload: CreateGuestUserPayload): Promise<GuestUserResult> {
  const requestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Creating guest user for: ${payload.email}`)
    await dbConnect()

    const { name, email, phone, gender, dateOfBirth } = payload

    // Enhanced validation
    if (!name?.trim() || !email?.trim()) {
      return { success: false, error: "missingFields" }
    }

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    if (!validateEmail(trimmedEmail)) {
      return { success: false, error: "invalidEmail" }
    }

    // Enhanced phone validation and formatting
    let formattedPhone: string | undefined
    if (phone?.trim()) {
      const phoneVariations = generatePhoneVariations(phone.trim())
      const validPhone = phoneVariations.find(p => validatePhone(p))
      
      if (validPhone) {
        formattedPhone = validPhone
      } else {
        return { success: false, error: "invalidPhone" }
      }
    }

    // Advanced conflict detection with enhanced scenarios
    const conflictResult = await detectUserConflicts(trimmedEmail, formattedPhone)
    
    let shouldMerge = false
    let existingUserId: string | undefined
    let conflictType: GuestUserResult["conflictType"] = "none"
    let conflictDetails: GuestUserResult["conflictDetails"] = {}

    if (conflictResult.hasConflict) {
      logger.info(`[${requestId}] User conflict detected: ${conflictResult.type}`)
      
      switch (conflictResult.type) {
        case "both_match":
          // Perfect match - definitely same user
          shouldMerge = true
          existingUserId = conflictResult.primaryUser!._id.toString()
          conflictType = "both_match"
          conflictDetails.conflictResolution = "merge"
          break
          
        case "email_match":
          // Email exists - very likely same user, safe to merge
          shouldMerge = true
          existingUserId = conflictResult.primaryUser!._id.toString()
          conflictType = "email_match"
          conflictDetails.emailConflictUserId = conflictResult.primaryUser!._id.toString()
          conflictDetails.conflictResolution = "merge"
          break
          
        case "phone_match":
          // Phone exists - likely same user, safe to merge
          shouldMerge = true
          existingUserId = conflictResult.primaryUser!._id.toString()
          conflictType = "phone_match"
          conflictDetails.phoneConflictUserId = conflictResult.primaryUser!._id.toString()
          conflictDetails.conflictResolution = "merge"
          break
          
        case "cross_match":
          // Complex conflict - create new account to avoid data corruption
          logger.warn(`[${requestId}] Cross-user conflict detected - creating separate guest account`)
          conflictType = "cross_match"
          conflictDetails.emailConflictUserId = conflictResult.emailUser!._id.toString()
          conflictDetails.phoneConflictUserId = conflictResult.phoneUser!._id.toString()
          conflictDetails.conflictResolution = "create_new"
          break
          
        case "partial_match":
          // Partial match - proceed with caution
          logger.info(`[${requestId}] Partial match detected - creating new account with logging`)
          conflictType = "partial_match"
          conflictDetails.emailConflictUserId = conflictResult.primaryUser?._id.toString()
          conflictDetails.conflictResolution = "create_new"
          break
      }
    }

    // Check for duplicate guest sessions
    if (formattedPhone) {
      const existingGuest = await User.findOne({
        email: trimmedEmail,
        phone: formattedPhone,
        isGuest: true,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).lean()

      if (existingGuest) {
        logger.info(`[${requestId}] Found existing guest session within 24h`)
        return {
          success: true,
          guestUserId: existingGuest._id.toString(),
          guestSessionId: existingGuest.guestSessionId!,
          existingUserId,
          shouldMerge,
          conflictType,
          conflictDetails: { ...conflictDetails, isExistingSession: true },
        }
      }
    }

    // Create guest user with enhanced data
    const guestSessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    const guestUser = new User({
      name: trimmedName,
      email: trimmedEmail,
      phone: formattedPhone,
      gender: gender || "other",
      dateOfBirth,
      roles: ["member"],
      isGuest: true,
      guestSessionId,
      // Generate a secure temporary password for guest
      password: await hashPassword(`guest_${guestSessionId}_${Date.now()}_${Math.random()}`),
    })

    await guestUser.save()
    logger.info(`[${requestId}] Guest user created: ${guestUser._id}`)

    return {
      success: true,
      guestUserId: guestUser._id.toString(),
      guestSessionId,
      existingUserId,
      shouldMerge,
      conflictType,
      conflictDetails,
    }
  } catch (error) {
    logger.error(`[${requestId}] Error creating guest user:`, error)
    
    // Handle specific MongoDB errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 11000) {
        // Duplicate key error
        if (error.message?.includes('email')) {
          return { success: false, error: "emailExists" }
        }
        if (error.message?.includes('phone')) {
          return { success: false, error: "phoneExists" }
        }
      }
    }
    
    return { success: false, error: "guestCreationFailed" }
  }
}

/**
 * Merge guest user with existing user after successful purchase
 * Enhanced to handle complex conflict scenarios
 */
export async function mergeGuestWithExistingUser(
  guestUserId: string,
  existingUserId: string,
  purchaseData?: any
): Promise<{ success: boolean; error?: string; mergeType?: string }> {
  const requestId = `merge_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Merging guest ${guestUserId} with existing user ${existingUserId}`)
    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(guestUserId) || !mongoose.Types.ObjectId.isValid(existingUserId)) {
      return { success: false, error: "invalidUserIds" }
    }

    const session = await mongoose.startSession()
    
    await session.withTransaction(async () => {
      // Get both users
      const guestUser = await User.findById(guestUserId).session(session)
      const existingUser = await User.findById(existingUserId).session(session)

      if (!guestUser || !existingUser || !guestUser.isGuest) {
        throw new Error("Invalid users for merge")
      }

      // Detailed merge operation with conflict detection
      let mergeType = "standard"
      
      // Check for potential data conflicts before merging
      if (guestUser.email !== existingUser.email || guestUser.phone !== existingUser.phone) {
        logger.info(`[${requestId}] Data mismatch detected during merge - proceeding with caution`)
        mergeType = "data_mismatch"
        
        // Update existing user with guest data if guest has more complete info
        if (guestUser.phone && !existingUser.phone) {
          existingUser.phone = guestUser.phone
          await existingUser.save({ session })
          logger.info(`[${requestId}] Updated existing user with guest phone`)
        }
        
        if (guestUser.name && guestUser.name.length > existingUser.name.length) {
          existingUser.name = guestUser.name
          await existingUser.save({ session })
          logger.info(`[${requestId}] Updated existing user with more complete name`)
        }
      }

      // Update all purchases/bookings/subscriptions/vouchers to point to existing user
      const collections = [
        { model: mongoose.model('Booking'), field: 'userId' },
        { model: mongoose.model('UserSubscription'), field: 'userId' },
        { model: mongoose.model('GiftVoucher'), field: 'purchaserUserId' },
        { model: mongoose.model('GiftVoucher'), field: 'ownerUserId' },
      ]

      let updatedRecords = 0
      for (const { model, field } of collections) {
        const result = await model.updateMany(
          { [field]: guestUserId },
          { $set: { [field]: existingUserId } },
          { session }
        )
        updatedRecords += result.modifiedCount || 0
      }

      // Mark guest user as merged and set parent reference
      guestUser.parentUserId = new mongoose.Types.ObjectId(existingUserId)
      await guestUser.save({ session })

      logger.info(`[${requestId}] Successfully merged guest user with existing user`, {
        mergeType,
        updatedRecords,
        guestId: guestUserId,
        existingId: existingUserId
      })
    })

    await session.endSession()
    return { success: true, mergeType }
  } catch (error) {
    logger.error(`[${requestId}] Error merging guest user:`, error)
    return { success: false, error: "mergeFailed" }
  }
}

/**
 * Update guest user details during purchase flow
 */
export async function updateGuestUser(
  guestUserId: string,
  updateData: {
    firstName?: string
    lastName?: string
    name?: string
    email?: string
    phone?: string
    dateOfBirth?: Date
    address?: string
    notes?: string
  }
): Promise<{ success: boolean; user?: IUser; error?: string }> {
  const requestId = `update_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Updating guest user: ${guestUserId}`)
    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(guestUserId)) {
      return { success: false, error: "invalidUserId" }
    }

    const guestUser = await User.findById(guestUserId)
    if (!guestUser || !guestUser.isGuest) {
      return { success: false, error: "invalidGuestUser" }
    }

    // Update the fields
    if (updateData.firstName && updateData.lastName) {
      updateData.name = `${updateData.firstName} ${updateData.lastName}`
    }

    Object.assign(guestUser, updateData)
    await guestUser.save()

    logger.info(`[${requestId}] Successfully updated guest user`)
    return { 
      success: true, 
      user: guestUser.toObject() 
    }
  } catch (error) {
    logger.error(`[${requestId}] Error updating guest user:`, error)
    return { 
      success: false, 
      error: "updateFailed" 
    }
  }
}

/**
 * Convert guest user to real user (when no existing user found)
 */
export async function convertGuestToRealUser(guestUserId: string): Promise<{ success: boolean; error?: string }> {
  const requestId = `convert_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Converting guest user to real user: ${guestUserId}`)
    await dbConnect()

    if (!mongoose.Types.ObjectId.isValid(guestUserId)) {
      return { success: false, error: "invalidUserId" }
    }

    const guestUser = await User.findById(guestUserId)
    if (!guestUser || !guestUser.isGuest) {
      return { success: false, error: "invalidGuestUser" }
    }

    // Convert guest to real user
    guestUser.isGuest = false
    guestUser.guestSessionId = undefined
    await guestUser.save()

    logger.info(`[${requestId}] Successfully converted guest user to real user`)
    return { success: true }
  } catch (error) {
    logger.error(`[${requestId}] Error converting guest user:`, error)
    return { success: false, error: "conversionFailed" }
  }
}

/**
 * Clean up guest users that are older than 24 hours and haven't completed purchase
 */
export async function cleanupExpiredGuestUsers(): Promise<{ success: boolean; deletedCount?: number }> {
  try {
    await dbConnect()
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const result = await User.deleteMany({
      isGuest: true,
      parentUserId: { $exists: false }, // Not merged
      createdAt: { $lt: oneDayAgo }
    })

    logger.info(`Cleaned up ${result.deletedCount} expired guest users`)
    return { success: true, deletedCount: result.deletedCount }
  } catch (error) {
    logger.error("Error cleaning up guest users:", error)
    return { success: false }
  }
} 