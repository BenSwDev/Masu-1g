import { getUserBookings } from "@/actions/booking-actions"
import { BookingsClient } from "@/components/dashboard/member/bookings/bookings-client"
import { cookies } from "next/headers"
import type { Language } from "@/lib/translations/i18n"
import enTranslations from "@/lib/translations/en.json"
import heTranslations from "@/lib/translations/he.json"
import ruTranslations from "@/lib/translations/ru.json"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

const translationsData = {
  en: enTranslations,
  he: heTranslations,
  ru: ruTranslations,
}

// This function returns a t-function for the given locale
function initializeTranslations(locale: Language) {
  const selectedTranslations = translationsData[locale] || translationsData.he // Fallback to Hebrew

  return function t(key: string): string {
    const keys = key.split(".")
    let current: any = selectedTranslations
    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k]
      } else {
        // Key not found, return key itself as a fallback
        return key
      }
    }
    // Ensure the found translation is a string
    return typeof current === "string" ? current : key
  }
}

export default async function MemberBookingsPage() {
  const cookieStore = cookies()
  // Attempt to read a locale cookie, e.g., 'masu_locale'. Adjust name if different.
  const localeCookie = cookieStore.get("masu_locale")
  let currentLocale: Language = "he" // Default language

  if (localeCookie && typeof localeCookie.value === "string" && ["en", "he", "ru"].includes(localeCookie.value)) {
    currentLocale = localeCookie.value as Language
  }
  // Note: For the <html> lang and dir attributes to be set correctly on initial server render,
  // your root layout (app/layout.tsx) should also determine the locale similarly and apply them.

  const t = initializeTranslations(currentLocale)
  const { success, data, error } = await getUserBookings()

  if (!success || !data) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{t("bookings.errors.fetchErrorTitle")}</AlertTitle>
          <AlertDescription>{error || t("bookings.errors.fetchErrorGeneric")}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <BookingsClient initialUpcomingBookings={data.upcomingBookings} initialPastBookings={data.pastBookings} />
}
