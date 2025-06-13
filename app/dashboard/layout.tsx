import type React from "react"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth/auth"
import DashboardLayoutClient from "@/components/dashboard/layout/dashboard-layout-client"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/auth/login")
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}
