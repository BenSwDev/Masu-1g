"use server"

import { hashPassword, validatePassword, validateEmail, validatePhone } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import { UserQueries } from "@/lib/db/query-builders"
import { logger } from "@/lib/logs/logger"
import { normalizePhoneNumber, createPhoneVariations } from "@/lib/phone-utils"

export async function registerUser(formData: FormData) {
  const requestId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Registration process started`)
    await dbConnect()
    logger.info(`[${requestId}] Database connection established`)

    // Extract form data
    const name = formData.get("fullName") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const password = formData.get("password") as string
    const gender = formData.get("gender") as string
    const role = formData.get("role") as string

    logger.info(`[${requestId}] Registration attempt for email: ${email.substring(0, 3)}***${email.split("@")[1]}`)
    if (phone) {
      logger.info(`[${requestId}] Phone provided: ${phone.substring(0, 3)}***${phone.substring(phone.length - 3)}`)
    }

    // Format phone number if provided
    let formattedPhone: string | undefined
    if (phone) {
      formattedPhone = normalizePhoneNumber(phone)

      // Validate phone number format
      if (formattedPhone && !validatePhone(formattedPhone)) {
        logger.warn(`[${requestId}] Invalid phone format: ${formattedPhone}`)
          return { success: false, message: "invalidPhone" }
      }
    }

    // Parse date of birth with validation
    const day = formData.get("day") as string
    const month = formData.get("month") as string
    const year = formData.get("year") as string

    let dateOfBirth: Date | undefined
    if (day && month && year) {
      const birthDate = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
      // Validate that the date is reasonable (not in future, not too old)
      const now = new Date()
      const minAge = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate()) // 120 years ago
      const maxAge = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate()) // 13 years ago

      if (birthDate >= minAge && birthDate <= maxAge) {
        dateOfBirth = birthDate
        logger.info(`[${requestId}] Valid date of birth provided: ${dateOfBirth.toISOString().split("T")[0]}`)
      } else {
        logger.warn(`[${requestId}] Invalid date of birth: ${birthDate.toISOString().split("T")[0]}`)
        return { success: false, message: "invalidDateOfBirth" }
      }
    }

    // Validate input - email is now optional
    if (!name || !password || !formattedPhone) {
      logger.warn(`[${requestId}] Registration failed: Missing required fields`)
      return { success: false, message: "missingFields" }
    }

    // Validate email format only if provided
    if (email && !validateEmail(email)) {
      logger.warn(`[${requestId}] Registration failed: Invalid email format`)
      return { success: false, message: "invalidEmail" }
    }

    // Validate phone if provided
    if (formattedPhone && !validatePhone(formattedPhone)) {
      logger.warn(`[${requestId}] Registration failed: Invalid phone format`)
      return { success: false, message: "invalidPhone" }
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      logger.warn(
        `[${requestId}] Registration failed: Password validation failed with ${passwordValidation.errors.length} errors`,
      )
      return { success: false, message: "weakPassword", errors: passwordValidation.errors }
    }
    logger.info(`[${requestId}] Password validation passed`)

    // Check if user already exists using optimized queries
    logger.info(`[${requestId}] Checking if user already exists`)
    const existingUser = formattedPhone ? await User.findOne({ phone: formattedPhone }) : null

    if (existingUser && !existingUser.roles.includes("guest")) {
      logger.warn(`[${requestId}] Registration failed: Phone already exists for registered user`)
      return { success: false, message: "phoneExists" }
    }
    
    // If existing user is a guest, upgrade them to registered user
    if (existingUser && existingUser.roles.includes("guest")) {
      logger.info(`[${requestId}] Upgrading guest user to registered user`)
      
      // Hash password
      const hashedPassword = await hashPassword(password)
      
      // Update existing guest user
      existingUser.name = name
      existingUser.email = email ? email.toLowerCase() : existingUser.email
      existingUser.password = hashedPassword
      existingUser.gender = gender as any
      existingUser.dateOfBirth = dateOfBirth
      existingUser.roles = role === "professional" ? ["professional"] : ["member"]
      existingUser.activeRole = undefined
      
      await existingUser.save()
      logger.info(`[${requestId}] Guest user successfully upgraded to registered user with ID: ${existingUser._id}`)
      
      return { success: true, message: "userUpgraded" }
    }
    
    logger.info(`[${requestId}] User does not exist, proceeding with registration`)

    // Hash password
    logger.info(`[${requestId}] Hashing password`)
    const hashedPassword = await hashPassword(password)

    // Create new user
    logger.info(`[${requestId}] Creating new user with role: ${role || "member"}`)
    const user = new User({
      name,
      email: email.toLowerCase(),
      phone: formattedPhone,
      password: hashedPassword,
      gender,
      dateOfBirth,
      roles: role === "professional" ? ["professional"] : ["member"], // Set role based on checkbox
    })

    await user.save()
    logger.info(`[${requestId}] User successfully created with ID: ${user._id}`)

    return { success: true, message: "userRegistered" }
  } catch (error) {
    logger.error(`[${requestId}] Registration error:`, error)
    return { success: false, message: "registrationFailed" }
  }
}

export async function checkUserExists(phone: string) {
  const requestId = `check_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Checking if user exists with phone: ${phone.substring(0, 3)}***${phone.substring(phone.length - 3)}`)
    await dbConnect()
    const exists = await UserQueries.phoneExists(phone)
    logger.info(`[${requestId}] User exists check result: ${exists ? "User found" : "User not found"}`)
    return { exists: !!exists }
  } catch (error) {
    logger.error(`[${requestId}] Check user error:`, error)
    return { exists: false }
  }
}

// פונקציה חדשה לניהול משתמשים לפי טלפון
export async function findOrCreateUserByPhone(phone: string, guestInfo?: {
  name: string
  email?: string
  gender?: "male" | "female" | "other"
  dateOfBirth?: Date
}) {
  const requestId = `find_create_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Finding or creating user by phone: ${phone.substring(0, 3)}***${phone.substring(phone.length - 3)}`)
    await dbConnect()

    // נרמול טלפון
    const cleaned = normalizePhoneNumber(phone)

    // בדיקה אם משתמש קיים
    const existingUser = await User.findOne({ phone: cleaned })
    
    if (existingUser) {
      logger.info(`[${requestId}] User found with phone, returning existing user`)
      return { 
        success: true, 
        userId: existingUser._id.toString(),
        isNewUser: false,
        userType: existingUser.roles.includes("guest") ? "guest" : "registered"
      }
    }

    // אם לא קיים ויש guestInfo - צור אורח חדש
    if (guestInfo) {
      logger.info(`[${requestId}] Creating new guest user`)
      const guestUser = new User({
        name: guestInfo.name,
        email: guestInfo.email,
        phone: cleaned,
        gender: guestInfo.gender || "other",
        dateOfBirth: guestInfo.dateOfBirth,
        roles: ["guest"],
        activeRole: "guest",
        emailVerified: null,
        phoneVerified: null,
      })

      await guestUser.save()
      logger.info(`[${requestId}] Guest user created successfully with ID: ${guestUser._id}`)

      return { 
        success: true, 
        userId: guestUser._id.toString(),
        isNewUser: true,
        userType: "guest"
      }
    }

    // אם אין guestInfo - החזר שאין משתמש
    return { 
      success: false, 
      error: "User not found and no guest info provided" 
    }

  } catch (error: any) {
    logger.error(`[${requestId}] Find or create user error:`, error)
    
    // Handle duplicate key error (race condition)
    if (error.code === 11000 && error.message.includes("phone")) {
      logger.info(`[${requestId}] Duplicate phone detected, attempting to find existing user`)
      try {
        const cleaned = normalizePhoneNumber(phone)
        const existingUser = await User.findOne({ phone: cleaned })
        
        if (existingUser) {
          logger.info(`[${requestId}] Found existing user after duplicate error`)
          return { 
            success: true, 
            userId: existingUser._id.toString(),
            isNewUser: false,
            userType: existingUser.roles.includes("guest") ? "guest" : "registered"
          }
        } else {
          logger.error(`[${requestId}] User not found after duplicate error - this should not happen`)
          return { success: false, error: "User creation failed due to race condition" }
        }
      } catch (retryError) {
        logger.error(`[${requestId}] Failed to find existing user on retry:`, retryError)
        return { success: false, error: "Failed to find existing user after duplicate error" }
      }
    }
    
    return { success: false, error: "Failed to find or create user" }
  }
}
