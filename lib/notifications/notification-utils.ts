/**
 * Utility functions for notifications
 */

import { logger } from "@/lib/logs/logger"

/**
 * Generate a random OTP code of specified length
 * @param length Length of the OTP code (default: 6)
 * @returns A string containing the OTP code
 */
export function generateOTPCode(length = 6): string {
  const digits = "0123456789"
  let otp = ""

  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)]
  }

  return otp
}

/**
 * Calculate expiration time for OTP codes
 * @param minutes Minutes until expiration (default: 10)
 * @returns Date object representing expiration time
 */
export function calculateOTPExpiry(minutes = 10): Date {
  const expiryDate = new Date()
  expiryDate.setMinutes(expiryDate.getMinutes() + minutes)
  return expiryDate
}

/**
 * Format a phone number for display
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "")

  // Format based on length and first digits
  if (cleaned.startsWith("972") || cleaned.startsWith("+972")) {
    // Israeli format
    const withoutCountry = cleaned.replace(/^(972|\+972)/, "0")
    if (withoutCountry.length === 10) {
      return withoutCountry.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")
    }
  } else if (cleaned.startsWith("1") || cleaned.startsWith("+1")) {
    // US format
    const withoutCountry = cleaned.replace(/^(1|\+1)/, "")
    if (withoutCountry.length === 10) {
      return withoutCountry.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3")
    }
  }

  // Default: just add spaces for readability
  return cleaned.replace(/(\d{3})(?=\d)/g, "$1 ").trim()
}

/**
 * Obscure an email address for privacy
 * @param email The email address to obscure
 * @returns Obscured email (e.g., j***e@example.com)
 */
export function obscureEmail(email: string): string {
  if (!email || !email.includes("@")) return email

  const [username, domain] = email.split("@")
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`
  }

  return `${username[0]}***${username[username.length - 1]}@${domain}`
}

/**
 * Obscure a phone number for privacy
 * @param phone The phone number to obscure
 * @returns Obscured phone number (e.g., ***-***-1234)
 */
export function obscurePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length <= 4) return phone

  const lastFour = digits.slice(-4)
  return `***-***-${lastFour}`
}

// Development mode utilities
let devNotifications: {
  email: { [key: string]: { code: string; timestamp: number } };
  phone: { [key: string]: { code: string; timestamp: number } };
} = {
  email: {},
  phone: {},
};

export function getDevOTP(identifier: string, type: "email" | "phone"): string | null {
  const notifications = devNotifications[type];
  const notification = notifications[identifier];
  
  if (!notification) {
    logger.debug(`No OTP found for ${type}: ${identifier}`);
    return null;
  }
  
  // Check if OTP is expired (10 minutes)
  const now = Date.now();
  if (now - notification.timestamp > 10 * 60 * 1000) {
    logger.debug(`OTP expired for ${type}: ${identifier}`);
    delete notifications[identifier];
    return null;
  }
  
  logger.debug(`Found valid OTP for ${type}: ${identifier}`);
  return notification.code;
}

export function storeDevOTP(identifier: string, type: "email" | "phone", code: string): void {
  devNotifications[type][identifier] = {
    code,
    timestamp: Date.now(),
  };
  logger.debug(`Stored OTP for ${type}: ${identifier}`);
}

export function clearDevOTP(identifier: string, type: "email" | "phone"): void {
  delete devNotifications[type][identifier];
  logger.debug(`Cleared OTP for ${type}: ${identifier}`);
}

// Enhanced logging for development
export function logNotification(type: "email" | "sms", recipient: string, content: any): void {
  if (process.env.NODE_ENV === "development") {
    console.log("\n=== Development Mode Notification ===");
    console.log(`Type: ${type.toUpperCase()}`);
    console.log(`Recipient: ${recipient}`);
    console.log("Content:", content);
    
    if (content.code) {
      console.log("\n🔑 OTP Code:", content.code);
      console.log("⚠️  This code is valid for 10 minutes");
      console.log("📝 Use this code to verify in development mode");
    }
    
    console.log("===================================\n");
  }
}
