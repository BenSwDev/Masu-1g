"use server"

import { validateEmail, validatePhone } from "@/lib/auth/auth"
import { unifiedNotificationService } from "@/lib/notifications/unified-notification-service"
import type { EmailRecipient, PhoneRecipient, NotificationLanguage } from "@/lib/notifications/notification-types"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import PasswordResetToken from "@/lib/db/models/password-reset-token"
import { sendOTP, verifyOTP } from "@/actions/notification-service"
import { randomBytes } from "crypto"

/**
 * Generate and send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  language: NotificationLanguage = "en",
): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  try {
    // TODO: Remove debug log


    // Validate email
    if (!validateEmail(email)) {
      return {
        success: false,
        message: "Invalid email address",
        error: "INVALID_EMAIL",
      }
    }

    // Connect to database
    await dbConnect()

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      // For security, don't reveal if email exists or not
      return {
        success: true,
        message: "If an account with this email exists, you will receive a password reset link",
      }
    }

    // TODO: Remove debug log


    // Delete any existing reset tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id })

    // Generate secure reset token
    const resetToken = randomBytes(32).toString("hex")
    const expiryDate = new Date()
    expiryDate.setHours(expiryDate.getHours() + 1) // 1 hour expiry

    // Save token to database
    const passwordResetToken = new PasswordResetToken({
      token: resetToken,
      userId: user._id,
      expiryDate,
      used: false,
    })

    await passwordResetToken.save()
    // TODO: Remove debug log


    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    // Create recipient object
    const recipient: EmailRecipient = {
      type: "email",
      value: email,
      language,
      name: user.name,
    }

    // Send password reset email
    // TODO: Remove debug log

    const result = await unifiedNotificationService.sendPasswordReset(recipient, resetUrl, 60)
    // TODO: Remove debug log


    if (!result.success) {
      console.error("Failed to send password reset email:", result.error)
      return {
        success: false,
        message: "Failed to send password reset email",
        error: "SEND_FAILED",
      }
    }

    // TODO: Remove debug log


    return {
      success: true,
      message: "If an account with this email exists, you will receive a password reset link",
    }
  } catch (error) {
    console.error("Error sending password reset email:", error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR",
    }
  }
}

/**
 * Verify reset token and get user info
 */
export async function verifyResetToken(token: string): Promise<{
  success: boolean
  message: string
  userId?: string
  error?: string
}> {
  try {
    // TODO: Remove debug log


    // Connect to database
    await dbConnect()

    // Find token in database WITHOUT populating userId
    const tokenData = await PasswordResetToken.findOne({ token })

    if (!tokenData) {
      // TODO: Remove debug log

      return {
        success: false,
        message: "Invalid or expired reset token",
        error: "INVALID_TOKEN",
      }
    }

    console.log("Token found in database:", {
      token: tokenData.token,
      userId: tokenData.userId.toString(),
      expiryDate: tokenData.expiresAt,
    })

    // Check if token has expired
    const now = new Date()
    if (now > tokenData.expiresAt) {
      // TODO: Remove debug log

      await PasswordResetToken.deleteOne({ _id: tokenData._id })
      return {
        success: false,
        message: "Reset token has expired",
        error: "TOKEN_EXPIRED",
      }
    }

    // Token existence already validates it hasn't been used (deleted after use)

    // Verify user still exists
    const user = await User.findById(tokenData.userId)
    if (!user) {
      // TODO: Remove debug log

      await PasswordResetToken.deleteOne({ _id: tokenData._id })
      return {
        success: false,
        message: "User not found",
        error: "USER_NOT_FOUND",
      }
    }

    // TODO: Remove debug log

    return {
      success: true,
      message: "Token is valid",
      userId: tokenData.userId.toString(), // Convert ObjectId to string
    }
  } catch (error) {
    console.error("Error verifying reset token:", error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR",
    }
  }
}

/**
 * Reset password with token
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  try {
    // TODO: Remove debug log


    // Verify token first
    const tokenVerification = await verifyResetToken(token)
    if (!tokenVerification.success || !tokenVerification.userId) {
      return {
        success: false,
        message: tokenVerification.message,
        error: tokenVerification.error,
      }
    }

    // TODO: Remove debug log


    // Validate password
    const { validatePassword, hashPassword } = await import("@/lib/auth/auth")
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: "Password does not meet requirements",
        error: "WEAK_PASSWORD",
      }
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Connect to database
    await dbConnect()

    // Update user password using the string userId
    const updateResult = await User.findByIdAndUpdate(tokenVerification.userId, {
      password: hashedPassword,
    })

    if (!updateResult) {
      // TODO: Remove debug log

      return {
        success: false,
        message: "Failed to update password",
        error: "UPDATE_FAILED",
      }
    }

    // TODO: Remove debug log


    // Delete token after successful use
    await PasswordResetToken.findOneAndDelete({ token })

    // TODO: Remove debug log


    return {
      success: true,
      message: "Password has been reset successfully",
    }
  } catch (error) {
    console.error("Error resetting password:", error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR",
    }
  }
}

/**
 * Clean up expired tokens (can be called periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await dbConnect()
    const now = new Date()
    const result = await PasswordResetToken.deleteMany({
      expiresAt: { $lt: now },
    })
    // TODO: Remove debug log

  } catch (error) {
    console.error("Error cleaning up expired tokens:", error)
  }
}

/**
 * Send password reset via phone (OTP) - NEW FUNCTION
 */
export async function sendPasswordResetOTP(
  phone: string,
  language: NotificationLanguage = "en",
): Promise<{
  success: boolean
  message: string
  obscuredIdentifier?: string
  expiryMinutes?: number
  error?: string
}> {
  try {
    // Validate phone
    if (!validatePhone(phone)) {
      return {
        success: false,
        message: "Invalid phone number",
        error: "INVALID_PHONE",
      }
    }

    // Connect to database
    await dbConnect()

    // Check if user exists with this phone
    const user = await User.findOne({ phone })

    if (!user) {
      // For security, don't reveal if phone exists or not
      return {
        success: true,
        message: "If an account with this phone exists, you will receive an OTP",
      }
    }

    // Send OTP for password reset
    const otpResult = await sendOTP(phone, language)

    if (!otpResult.success) {
      return {
        success: false,
        message: "Failed to send OTP",
        error: "SEND_FAILED",
      }
    }

    return {
      success: true,
      message: "If an account with this phone exists, you will receive an OTP",
      obscuredIdentifier: otpResult.obscuredIdentifier,
      expiryMinutes: 10, // Fixed value since the function sets 10 minutes expiry
    }
  } catch (error) {
    console.error("Error sending password reset OTP:", error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR",
    }
  }
}

/**
 * Reset password with phone OTP - NEW FUNCTION
 */
export async function resetPasswordWithOTP(
  phone: string,
  otpCode: string,
  newPassword: string,
): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  try {
    // Verify OTP first
    const otpVerification = await verifyOTP(phone, otpCode)
    if (!otpVerification.success) {
      return {
        success: false,
        message: otpVerification.error || "OTP verification failed",
        error: "OTP_VERIFICATION_FAILED",
      }
    }

    // Validate password
    const { validatePassword, hashPassword } = await import("@/lib/auth/auth")
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return {
        success: false,
        message: "Password does not meet requirements",
        error: "WEAK_PASSWORD",
      }
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Connect to database
    await dbConnect()

    // Update user password
    const updateResult = await User.findOneAndUpdate(
      { phone },
      { password: hashedPassword }
    )

    if (!updateResult) {
      return {
        success: false,
        message: "Failed to update password",
        error: "UPDATE_FAILED",
      }
    }

    return {
      success: true,
      message: "Password has been reset successfully",
    }
  } catch (error) {
    console.error("Error resetting password with OTP:", error)
    return {
      success: false,
      message: "An unexpected error occurred",
      error: "UNKNOWN_ERROR",
    }
  }
}
