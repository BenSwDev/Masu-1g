import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string or Date object into a localized string.
 * @param date The date to format.
 * @param language The language code (e.g., "en", "he", "ru") for localization. Defaults to "en-US".
 * @returns A localized date string (e.g., "Jan 01, 2023") or an empty string if the date is invalid.
 */
export function formatDate(date: Date | string, language = "en-US"): string {
  if (!date) return ""

  const d = typeof date === "string" ? new Date(date) : date

  if (isNaN(d.getTime())) {
    return ""
  }

  try {
    return d.toLocaleDateString(language, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch (error) {
    console.error(`[Utils] Error formatting date for language ${language}:`, error)
    // Fallback to default language if specific one fails
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }
}

/**
 * Formats a number into a localized currency string.
 * @param amount The amount to format.
 * @param currency The currency code (e.g., "ILS", "USD"). Defaults to "ILS".
 * @param language The language code (e.g., "en", "he", "ru") for localization. Defaults to "he-IL" for ILS, "en-US" for USD.
 * @returns A localized currency string (e.g., "₪100.00") or a fallback string if formatting fails.
 */
export function formatCurrency(
  amount: number | undefined | null,
  currency = "ILS",
  language = "en-US"
): string {
  // Handle undefined/null values
  if (amount === undefined || amount === null) {
    return `0.00 ${currency}`
  }

  // Ensure amount is a number
  const numericAmount = typeof amount === "number" ? amount : parseFloat(String(amount))
  if (isNaN(numericAmount)) {
    return `0.00 ${currency}`
  }

  let effectiveLanguage = language
  // Specific language defaults for certain currencies if a generic language like "en" is passed.
  if (language === "he" && currency === "ILS") effectiveLanguage = "he-IL"
  if (language === "en" && currency === "USD") effectiveLanguage = "en-US"
  if (language === "en" && currency === "EUR") effectiveLanguage = "de-DE" // Or any other Eurozone locale like "fr-FR"

  try {
    return new Intl.NumberFormat(effectiveLanguage, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount)
  } catch (error) {
    console.error(
      `[Utils] Error formatting currency ${currency} for language ${effectiveLanguage}:`,
      error
    )
    // Fallback for unsupported currencies or errors
    return `${numericAmount.toFixed(2)} ${currency}`
  }
}

// Israeli date formatting functions
export const formatDateIsraeli = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "תאריך לא תקין"

  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()

  return `${day}/${month}/${year}`
}

export const formatTimeIsraeli = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return "שעה לא תקינה"

  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")

  return `${hours}:${minutes}`
}

export const formatDateTimeIsraeli = (date: Date | string): string => {
  return `${formatDateIsraeli(date)} ${formatTimeIsraeli(date)}`
}
