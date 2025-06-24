"use server"

import { validateEmail } from "@/lib/auth/auth"
import { unifiedNotificationService } from "@/lib/notifications/unified-notification-service"
import type { EmailRecipient, NotificationLanguage } from "@/lib/notifications/notification-types"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import PasswordResetToken from "@/lib/db/models/password-reset-token"
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
    const result = await unifiedNotificationService.sendPasswordReset(recipient, resetUrl, 60)

    if (!result.success) {
      console.error("Failed to send password reset email:", result.error)
      return {
        success: false,
        message: "Failed to send password reset email",
        error: "SEND_FAILED",
      }
    }

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
    // Connect to database
    await dbConnect()

    // Find token in database WITHOUT populating userId
    const tokenData = await PasswordResetToken.findOne({ token })

    if (!tokenData) {
      return {
        success: false,
        message: "Invalid or expired reset token",
        error: "INVALID_TOKEN",
      }
    }


    // Check if token has expired
    const now = new Date()
    if (now > tokenData.expiryDate) {
      await PasswordResetToken.deleteOne({ _id: tokenData._id })
      return {
        success: false,
        message: "Reset token has expired",
        error: "TOKEN_EXPIRED",
      }
    }

    // Check if token was already used
    if (tokenData.used) {
      return {
        success: false,
        message: "Reset token has already been used",
        error: "TOKEN_USED",
      }
    }

    // Verify user still exists
    const user = await User.findById(tokenData.userId)
    if (!user) {
      await PasswordResetToken.deleteOne({ _id: tokenData._id })
      return {
        success: false,
        message: "User not found",
        error: "USER_NOT_FOUND",
      }
    }

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

    // Verify token first
    const tokenVerification = await verifyResetToken(token)
    if (!tokenVerification.success || !tokenVerification.userId) {
      return {
        success: false,
        message: tokenVerification.message,
        error: tokenVerification.error,
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

    // Update user password using the string userId
    const updateResult = await User.findByIdAndUpdate(tokenVerification.userId, {
      password: hashedPassword,
    })

    if (!updateResult) {
      return {
        success: false,
        message: "Failed to update password",
        error: "UPDATE_FAILED",
      }
    }

      
    // Mark token as used
    await PasswordResetToken.findOneAndUpdate({ token }, { used: true })


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
      expiryDate: { $lt: now },
    })
  } catch (error) {
    console.error("Error cleaning up expired tokens:", error)
  }
}
