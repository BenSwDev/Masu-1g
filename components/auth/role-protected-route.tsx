"use client"

import type React from "react"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/translations/i18n"

interface RoleProtectedRouteProps {
  children: React.ReactNode
  requiredRole: string
  redirectTo?: string
}

export function RoleProtectedRoute({ children, requiredRole, redirectTo = "/dashboard" }: RoleProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    if (status === "loading") return

    if (!session) {
      router.push("/auth/login")
      return
    }

    // Check if user has the required role
    const hasRequiredRole = session.user.roles.includes(requiredRole)

    // If user doesn't have the required role, redirect
    if (!hasRequiredRole) {
      router.push(redirectTo)
    }
  }, [session, status, router, requiredRole, redirectTo])

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

  // Check if user has the required role
  const hasRequiredRole = session?.user.roles.includes(requiredRole)

  return hasRequiredRole ? <>{children}</> : null
}
