"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { useEffect, useState } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { getBookingInitialData } from "@/actions/booking-actions"
import BookingWizard from "@/components/dashboard/member/book-treatment/booking-wizard"
import type { UserSessionData } from "@/types/next-auth"

export default function BookTreatmentPage({ params }: { params?: { lang?: string } }) {
  const { t, language } = useTranslation()
  const [session, setSession] = useState<any>(null)
  const [initialDataResult, setInitialDataResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const session = await getServerSession(authOptions)
      setSession(session)
      if (session?.user?.id) {
        const data = await getBookingInitialData(session.user.id)
        setInitialDataResult(data)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="container mx-auto py-8 px-4 text-center">{t("common.loading", "טוען...")}</div>
  }

  if (!session?.user?.id) {
    return <p>{t("common.unauthorizedAccess")}</p>
  }

  if (!initialDataResult?.success || !initialDataResult?.data) {
    const errorKey = initialDataResult?.error || "bookings.errors.initialDataLoadFailed"
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4 text-destructive-foreground">
          {t("common.errorOccurred")}
        </h1>
        <p className="text-muted-foreground">{t(errorKey)}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">{t("bookings.title")}</h1>
      <BookingWizard
        initialData={initialDataResult.data}
        currentUser={session.user as UserSessionData}
      />
    </div>
  )
}
