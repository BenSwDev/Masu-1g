"use client"

import type React from "react"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({ children, redirectTo = "/auth/login" }: ProtectedRouteProps) {
  const { _data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push(redirectTo)
    }
  }, [session, status, router, redirectTo])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-turquoise-500 border-t-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  return session ? <>{children}</> : null
}
