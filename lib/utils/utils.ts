import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from "@/lib/logs/logger"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string or Date object into a localized string.
 * @param date The date to format.
 * @param language The language code (e.g., "en", "he", "ru") for localization. Defaults to "en-US".
 * @returns A localized date string (e.g., "Jan 01, 2023") or an empty string if the date is invalid.
 */
export function formatDate(date: Date | string | null | undefined, language: string = "he"): string {
  if (!date) return ""
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      logger.warn("Invalid date provided to formatDate", { date })
      return ""
    }

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }

    return dateObj.toLocaleDateString(language === "he" ? "he-IL" : language === "en" ? "en-US" : "ru-RU", options)
  } catch (error) {
    logger.error("Error formatting date", { error, date, language })
    return ""
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
  amount: number | string | null | undefined,
  currency: string = "ILS",
  language: string = "he",
): string {
  if (amount === null || amount === undefined) return ""
  
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount
  
  if (isNaN(numericAmount)) {
    logger.warn("Invalid amount provided to formatCurrency", { amount })
    return ""
  }

  try {
    // Map language codes to locale codes
    const localeMap: Record<string, string> = {
      he: "he-IL",
      en: "en-US",
      ru: "ru-RU",
    }

    const effectiveLanguage = localeMap[language] || "he-IL"

    return new Intl.NumberFormat(effectiveLanguage, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount)
  } catch (error) {
    logger.error("Error formatting currency", { error, currency, language })
    // Fallback formatting
    return `${numericAmount.toFixed(2)} ${currency}`
  }
}

// Israeli date formatting functions
export const formatDateIsraeli = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'תאריך לא תקין'
  
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  
  return `${day}/${month}/${year}`
}

export const formatTimeIsraeli = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'שעה לא תקינה'
  
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  
  return `${hours}:${minutes}`
}

export const formatDateTimeIsraeli = (date: Date | string): string => {
  return `${formatDateIsraeli(date)} ${formatTimeIsraeli(date)}`
}
