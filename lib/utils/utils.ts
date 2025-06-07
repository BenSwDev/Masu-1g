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
    console.warn(`[Utils] Invalid date provided to formatDate: ${date}`)
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
export function formatCurrency(amount: number, currency = "ILS", language = "en-US"): string {
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
    }).format(amount)
  } catch (error) {
    console.error(`[Utils] Error formatting currency ${currency} for language ${effectiveLanguage}:`, error)
    // Fallback for unsupported currencies or errors
    return `${amount.toFixed(2)} ${currency}`
  }
}
