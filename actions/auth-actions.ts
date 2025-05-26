"use server"

import { hashPassword, validatePassword, validateEmail, validatePhone } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import { UserQueries } from "@/lib/db/query-builders"
import { logger } from "@/lib/logs/logger"

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

      // Validate Israeli mobile number format
      if (cleaned.startsWith("+972")) {
        const nationalNumber = cleaned.substring(4)
        if (nationalNumber.length !== 9 || !/^[5-9]/.test(nationalNumber)) {
          logger.warn(`[${requestId}] Invalid Israeli mobile format: ${cleaned}`)
          return { success: false, message: "invalidPhone" }
        }
      }

      formattedPhone = cleaned
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

    // Validate input
    if (!name || !email || !password) {
      logger.warn(`[${requestId}] Registration failed: Missing required fields`)
      return { success: false, message: "missingFields" }
    }

    // Validate email format
    if (!validateEmail(email)) {
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
    const [emailExists, phoneExists] = await Promise.all([
      UserQueries.emailExists(email),
      formattedPhone ? UserQueries.phoneExists(formattedPhone) : Promise.resolve(false),
    ])

    if (emailExists) {
      logger.warn(`[${requestId}] Registration failed: Email already exists`)
      return { success: false, message: "emailExists" }
    }

    if (phoneExists) {
      logger.warn(`[${requestId}] Registration failed: Phone already exists`)
      return { success: false, message: "phoneExists" }
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

export async function checkUserExists(email: string) {
  const requestId = `check_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

  try {
    logger.info(`[${requestId}] Checking if user exists with email: ${email.substring(0, 3)}***${email.split("@")[1]}`)
    await dbConnect()
    const exists = await UserQueries.emailExists(email)
    logger.info(`[${requestId}] User exists check result: ${exists ? "User found" : "User not found"}`)
    return { exists: !!exists }
  } catch (error) {
    logger.error(`[${requestId}] Check user error:`, error)
    return { exists: false }
  }
}
