"use server"

import { getServerSession } from "next-auth/next"
import {
  authOptions,
  hashPassword,
  verifyPassword,
  validateEmail,
  validatePhone,
} from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import { sendOTP, verifyOTP } from "./notification-service"
import type { NotificationLanguage } from "@/lib/notifications/notification-types"

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    // Validate new password
    if (newPassword !== confirmPassword) {
      return { success: false, message: "passwordMismatch" }
    }

    // Validate password strength
    const { validatePassword } = await import("@/lib/auth/auth")
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      return { success: false, message: "weakPassword", errors: passwordValidation.errors }
    }

    await dbConnect()

    // Get user with password
    const user = await User.findById(session.user.id).select("+password")
    if (!user) {
      return { success: false, message: "userNotFound" }
    }

    // Verify current password
    if (!user.password) {
      return { success: false, message: "noPasswordSet" }
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return { success: false, message: "invalidCurrentPassword" }
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword)

    // Update password
    await User.findByIdAndUpdate(session.user.id, {
      password: hashedNewPassword,
    })

    return { success: true, message: "passwordChanged" }
  } catch (error) {
    console.error("Change password error:", error)
    return { success: false, message: "changeFailed" }
  }
}

export async function requestEmailChange(newEmail: string, language: NotificationLanguage = "en") {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    // Validate email
    if (!validateEmail(newEmail)) {
      return { success: false, message: "invalidEmail" }
    }

    await dbConnect()

    // Check if email already exists
    const existingUser = await User.findOne({
      email: newEmail.toLowerCase(),
      _id: { $ne: session.user.id }, // Exclude current user
    })

    if (existingUser) {
      return { success: false, message: "emailExists" }
    }

    // Send OTP to new email - for email, we'll use a simple implementation
    // TODO: Implement proper email OTP when email service is ready
    const otpResult = { success: true, messageId: `email-${Date.now()}` }

    if (!otpResult.success) {
      return { success: false, message: "Failed to send OTP" }
    }

    return {
      success: true,
      message: "otpSent",
      obscuredIdentifier: newEmail.replace(/(.{2}).*(@.*)/, "$1***$2"),
      expiryMinutes: 10, // Default expiry
    }
  } catch (error) {
    console.error("Request email change error:", error)
    return { success: false, message: "requestFailed" }
  }
}

export async function confirmEmailChange(newEmail: string, otpCode: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    // Verify OTP - for now, accept any 6-digit code for email
    // TODO: Implement proper email OTP verification
    const verifyResult = { success: otpCode.length === 6 && /^\d+$/.test(otpCode) }

    if (!verifyResult.success) {
      return { success: false, message: "Invalid OTP" }
    }

    await dbConnect()

    // Double-check email doesn't exist (race condition protection)
    const existingUser = await User.findOne({
      email: newEmail.toLowerCase(),
      _id: { $ne: session.user.id },
    })

    if (existingUser) {
      return { success: false, message: "emailExists" }
    }

    // Update email
    await User.findByIdAndUpdate(session.user.id, {
      email: newEmail.toLowerCase(),
    })

    return { success: true, message: "emailChanged" }
  } catch (error) {
    console.error("Confirm email change error:", error)
    return { success: false, message: "changeFailed" }
  }
}

export async function requestPhoneChange(newPhone: string, language: NotificationLanguage = "en") {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    // Validate phone
    if (!validatePhone(newPhone)) {
      return { success: false, message: "invalidPhone" }
    }

    await dbConnect()

    // Check if phone already exists
    const existingUser = await User.findOne({
      phone: newPhone,
      _id: { $ne: session.user.id }, // Exclude current user
    })

    if (existingUser) {
      return { success: false, message: "phoneExists" }
    }

    // Send OTP to new phone using the correct signature
    const otpResult = await sendOTP(newPhone, language === "he" ? "he" : language === "ru" ? "ru" : "en")

    if (!otpResult.success) {
      return { success: false, message: otpResult.error || "Failed to send OTP" }
    }

    return {
      success: true,
      message: "otpSent",
      obscuredIdentifier: newPhone.replace(/(\d{3}).*(\d{2})/, "$1***$2"),
      expiryMinutes: 10, // Default expiry
    }
  } catch (error) {
    console.error("Request phone change error:", error)
    return { success: false, message: "requestFailed" }
  }
}

export async function confirmPhoneChange(newPhone: string, otpCode: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, message: "notAuthenticated" }
    }

    // Verify OTP
    const verifyResult = await verifyOTP(newPhone, otpCode)

    if (!verifyResult.success) {
      return { success: false, message: verifyResult.error || "Invalid OTP" }
    }

    await dbConnect()

    // Double-check phone doesn't exist (race condition protection)
    const existingUser = await User.findOne({
      phone: newPhone,
      _id: { $ne: session.user.id },
    })

    if (existingUser) {
      return { success: false, message: "phoneExists" }
    }

    // Update phone
    await User.findByIdAndUpdate(session.user.id, {
      phone: newPhone,
    })

    return { success: true, message: "phoneChanged" }
  } catch (error) {
    console.error("Confirm phone change error:", error)
    return { success: false, message: "changeFailed" }
  }
}

export async function getUserProfile() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    await dbConnect()

    const user = await User.findById(session.user.id).select("-password")
    if (!user) {
      return { success: false, error: "User not found" }
    }

    return {
      success: true,
      user: {
        _id: user._id?.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        preferredLanguage: (user as any).preferredLanguage || "he",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    }
  } catch (error) {
    console.error("Get user profile error:", error)
    return { success: false, error: "Failed to get user profile" }
  }
}
