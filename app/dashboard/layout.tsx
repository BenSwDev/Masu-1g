"use client"

import type React from "react"

import { useState } from "react"
import { DashboardHeader } from "@/components/dashboard/layout/header"
import { DashboardFooter } from "@/components/dashboard/layout/footer"
import { DashboardSidebar } from "@/components/dashboard/layout/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <DashboardSidebar isMobileOpen={isMobileSidebarOpen} onMobileOpenChange={setIsMobileSidebarOpen} />
        <div className="flex flex-1 flex-col">
          <DashboardHeader onSidebarToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
          <main className="flex-1 bg-gray-50">
            <div className="container mx-auto px-4 py-8">{children}</div>
          </main>
          <DashboardFooter />
        </div>
      </div>
    </ProtectedRoute>
  )
}
