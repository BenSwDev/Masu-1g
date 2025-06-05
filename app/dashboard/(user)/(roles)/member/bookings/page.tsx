import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import MemberBookingsClient from "@/components/dashboard/member/bookings/member-bookings-client"
import { Heading } from "@/components/common/ui/heading"
import { getTranslations } from "next-intl/server"

export default async function MemberBookingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  const t = await getTranslations("memberBookings")

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 lg:px-8">
      <Heading title={t("title")} description={t("description")} />
      <Suspense fallback={<MemberBookingsClient.Skeleton />}>
        <MemberBookingsClient userId={session.user.id} />
      </Suspense>
    </div>
  )
}
