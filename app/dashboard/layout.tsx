"use client"

import type React from "react"

import { DashboardHeader } from "@/components/dashboard/layout/header"
import { DashboardFooter } from "@/components/dashboard/layout/footer"
import { DashboardSidebar } from "@/components/dashboard/layout/sidebar"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useState } from "react"
import { QueryProvider } from "@/components/common/providers/query-provider"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <ProtectedRoute>
      <QueryProvider>
        <div className="flex h-screen">
          <DashboardSidebar isMobileOpen={isMobileSidebarOpen} onMobileOpenChange={setIsMobileSidebarOpen} />
          <div className="flex flex-1 flex-col min-w-0">
            <DashboardHeader onSidebarToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
            <main className="flex-1 bg-gray-50 min-h-0 overflow-hidden">
              <div className="h-full p-4 md:p-6 lg:p-8 overflow-y-auto">{children}</div>
            </main>
            <DashboardFooter />
          </div>
        </div>
      </QueryProvider>
    </ProtectedRoute>
  )
}
