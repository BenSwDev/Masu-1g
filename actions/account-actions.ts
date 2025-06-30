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

    // Send OTP to new email
    const otpResult = await sendOTP(newEmail, "email", language)

    if (!otpResult.success) {
      return { success: false, message: otpResult.message }
    }

    return {
      success: true,
      message: "otpSent",
      obscuredIdentifier: otpResult.obscuredIdentifier,
      expiryMinutes: otpResult.expiryMinutes,
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

    // Verify OTP
    const verifyResult = await verifyOTP(newEmail, "email", otpCode)

    if (!verifyResult.success) {
      return { success: false, message: verifyResult.message }
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

    // Send OTP to new phone
    const otpResult = await sendOTP(newPhone, "phone", language)

    if (!otpResult.success) {
      return { success: false, message: otpResult.message }
    }

    return {
      success: true,
      message: "otpSent",
      obscuredIdentifier: otpResult.obscuredIdentifier,
      expiryMinutes: otpResult.expiryMinutes,
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
    const verifyResult = await verifyOTP(newPhone, "phone", otpCode)

    if (!verifyResult.success) {
      return { success: false, message: verifyResult.message }
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
