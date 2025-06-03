import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { getBookingInitialData } from "@/actions/booking-actions"
import BookingWizard from "@/components/dashboard/member/book-treatment/booking-wizard"
import type { UserSessionData } from "@/types/next-auth"
import type { Language } from "@/lib/translations/i18n" // Assuming Language type is exported

// Import translations directly for server-side use
import heTranslations from "@/lib/translations/he.json"
import enTranslations from "@/lib/translations/en.json"
import ruTranslations from "@/lib/translations/ru.json"

const allServerTranslationsData = {
  he: heTranslations,
  en: enTranslations,
  ru: ruTranslations,
}

// Server-side translation helper function
// For a Server Component, we need to determine the locale.
// If your app structure includes locale in the path (e.g., /en/dashboard),
// you could get it from `params.lang`. Otherwise, we'll use a default.
// The custom I18nProvider defaults to 'he', so we'll use that as a fallback here.
function getSsrTranslation(key: string, lang: Language = "he"): string {
  const keys = key.split(".")
  let result: any = allServerTranslationsData[lang]

  for (const k of keys) {
    if (result && typeof result === "object" && k in result) {
      result = result[k]
    } else {
      // console.warn(`SSR Translation not found for key: ${key} in language: ${lang}`);
      return key // Fallback to key
    }
  }

  if (typeof result !== "string") {
    // console.warn(`SSR Translation for key: ${key} in language: ${lang} is not a string:`, result);
    return key // Fallback if the resolved value is not a string
  }
  return result
}

export default async function BookTreatmentPage({ params }: { params?: { lang?: Language } }) {
  // Determine language for SSR: from URL params if available, else default.
  const currentLang = params?.lang || "he"

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    // Use the server-side translation helper
    return <p>{getSsrTranslation("common.unauthorizedAccess", currentLang)}</p>
  }

  const initialDataResult = await getBookingInitialData(session.user.id)

  if (!initialDataResult.success || !initialDataResult.data) {
    const errorKey = initialDataResult.error || "bookings.errors.initialDataLoadFailed"
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4 text-destructive-foreground">
          {getSsrTranslation("common.errorOccurred", currentLang)}
        </h1>
        <p className="text-muted-foreground">{getSsrTranslation(errorKey as string, currentLang)}</p>
      </div>
    )
  }

  // BookingWizard is a client component and should use `useTranslation()` from your custom i18n provider.
  // Therefore, we no longer need to prepare and pass a `translations` object within `initialData`.
  // If `initialDataResult.data` had a `translations` field from previous attempts, ensure it's not expected by BookingWizard
  // or clean it if necessary, though `getBookingInitialData` likely doesn't add it.

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">{getSsrTranslation("bookings.title", currentLang)}</h1>
      <BookingWizard
        initialData={initialDataResult.data} // Pass data without the explicit 'translations' bundle
        currentUser={session.user as UserSessionData}
      />
    </div>
  )
}
