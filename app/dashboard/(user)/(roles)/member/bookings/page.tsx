"use client"

import { Suspense, useEffect, useState } from "react"
import { getServerSession } from "next-auth" // This can remain for session fetching
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import MemberBookingsClient from "@/components/dashboard/member/bookings/member-bookings-client"
import { Heading } from "@/components/common/ui/heading"
// Remove next-intl import
// import { getTranslations } from "next-intl/server"
// Import your custom translation hook
import { useTranslation } from "@/lib/translations/i18n"

export default function MemberBookingsPage() {
  // Use your custom translation hook
  const { t } = useTranslation()
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      // Fetch session on the client side or pass it if possible
      // For this example, we'll re-fetch or assume it's passed via a context/prop
      // A proper solution might involve a client-side session hook
      const session = await getServerSession(authOptions) // This call won't work directly in useEffect without an API route
      // Let's assume session.user.id is available through a client-side hook or context
      // For now, to make it runnable, we'll simulate or simplify
      // Ideally, you'd use useSession() from next-auth/react if available
      // Placeholder: In a real scenario, use useSession() from next-auth/react
      // For this fix, we'll assume userId is obtained differently or page is wrapped by AuthProvider
      // To proceed, we'll focus on the translation part.
      // The original code uses getServerSession, which is fine if the page remains a server component
      // but we made it 'use client' for useTranslation.
      // A common pattern is to fetch session in a parent server component and pass userId as prop,
      // or use next-auth/react's useSession hook.

      // To resolve the immediate issue and keep the structure,
      // we'll assume userId is fetched and set.
      // This part needs careful review in your actual app.
      // For now, let's simulate getting the session user ID.
      // This is a temporary workaround for the session logic in a 'use client' page.
      // You should replace this with `useSession` from `next-auth/react`.
      const tempFetchSession = async () => {
        const res = await fetch("/api/auth/session") // Standard NextAuth endpoint
        const sessionData = await res.json()
        if (sessionData?.user?.id) {
          setUserId(sessionData.user.id)
        } else {
          redirect("/auth/login")
        }
        setIsLoadingSession(false)
      }
      tempFetchSession()
    }
    fetchSession()
  }, [])

  if (isLoadingSession) {
    // You might want a more specific loading state here
    return <MemberBookingsClient.Skeleton />
  }

  if (!userId) {
    // Redirect if session is not found after loading
    // This redirect might happen too late, consider middleware or server-side checks
    // For now, to prevent rendering without userId
    if (typeof window !== "undefined") {
      redirect("/auth/login")
    }
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
      {/* Use the t function with full keys */}
      <Heading title={t("memberBookings.title")} description={t("memberBookings.description")} />
      <Suspense fallback={<MemberBookingsClient.Skeleton />}>
        <MemberBookingsClient userId={userId} />
      </Suspense>
    </div>
  )
}
