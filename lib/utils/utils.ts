import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  if (!date) return ""

  const d = typeof date === "string" ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return ""
  }

  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatCurrency(amount: number, currency = "ILS"): string {
  // Determine locale based on currency or use a generic one
  let locale = "he-IL" // Default for ILS
  if (currency === "USD") {
    locale = "en-US"
  } else if (currency === "EUR") {
    locale = "de-DE" // Example for Euro, can be any Eurozone country
  }
  // Add more currency/locale mappings as needed

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    console.error("Error formatting currency:", error)
    // Fallback for unsupported currencies or errors
    return `${amount.toFixed(2)} ${currency}`
  }
}

interface ActionResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string | Record<string, string[]> | { _errors?: string[] } // Adjusted for Zod-like errors
}

export function sendSuccess<T>(message: string, data?: T): ActionResponse<T> {
  return {
    success: true,
    message,
    data,
  }
}

export function sendError(
  message: string,
  errorDetails?: string | Record<string, string[]> | { _errors?: string[] },
): ActionResponse<null> {
  return {
    success: false,
    message,
    error: errorDetails || message,
  }
}
