import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getWorkingHoursSettingsAction } from "@/actions/working-hours-actions" // Import actions
import { unstable_noStore as noStore } from "next/cache"
import WorkingHoursClientPage from "./working-hours-client-page"

export const metadata: Metadata = {
  title: "Working Hours Management", // Will be translated by i18n provider
}

export default async function AdminWorkingHoursPage() {
  noStore() // Ensure dynamic rendering and fresh data on each request for this page
  const currentUser = await getCurrentUser()
  const t = await getTranslations("Dashboard.Admin.WorkingHours")

  if (!currentUser || currentUser.activeRole !== "admin") {
    // Check activeRole
    redirect("/dashboard")
  }

  // Fetch initial data on the server
  const result = await getWorkingHoursSettingsAction()
  let initialData

  if (result.success && result.data) {
    initialData = {
      fixedHours: result.data.fixedHours.map((fh) => ({
        ...fh,
        // Ensure numbers are numbers, not strings if they come from DB differently
        priceOverrideAmount: fh.priceOverrideAmount !== undefined ? Number(fh.priceOverrideAmount) : undefined,
        priceOverridePercentage:
          fh.priceOverridePercentage !== undefined ? Number(fh.priceOverridePercentage) : undefined,
      })),
      specialDates: result.data.specialDates.map((sd) => ({
        ...sd,
        date: sd.date ? new Date(sd.date) : new Date(), // Ensure date is a Date object
        priceOverrideAmount: sd.priceOverrideAmount !== undefined ? Number(sd.priceOverrideAmount) : undefined,
        priceOverridePercentage:
          sd.priceOverridePercentage !== undefined ? Number(sd.priceOverridePercentage) : undefined,
      })),
    }
  } else {
    // Handle error case or provide default empty state
    // This is crucial to prevent client component from breaking
    console.error("Failed to fetch working hours settings:", result.error)
    initialData = {
      fixedHours: Array(7)
        .fill(null)
        .map((_, dayIndex) => ({
          day: dayIndex,
          isActive: false,
          startTime: "09:00",
          endTime: "17:00",
          hasPriceOverride: false,
          priceOverrideType: "amount",
          priceOverrideAmount: undefined,
          priceOverridePercentage: undefined,
          notes: "",
        })),
      specialDates: [],
    }
    // Optionally, you could throw an error here or show an error message UI
    // For now, providing default empty data to prevent client break
  }

  return <WorkingHoursClientPage initialValues={initialData} t={t} />
}
