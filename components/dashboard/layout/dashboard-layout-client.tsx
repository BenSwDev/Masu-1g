"use client"

import type React from "react"
import { useState } from "react"
import { DashboardHeader } from "./header"
import { DashboardFooter } from "./footer"
import { DashboardSidebar } from "./sidebar"
import { QueryProvider } from "@/components/common/providers/query-provider"

interface DashboardLayoutClientProps {
  children: React.ReactNode
}

export default function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <QueryProvider>
      <div className="flex h-screen max-h-screen overflow-hidden">
        <DashboardSidebar
          isMobileOpen={isMobileSidebarOpen}
          onMobileOpenChange={setIsMobileSidebarOpen}
        />
        <div className="flex flex-1 flex-col min-w-0 max-h-screen overflow-hidden">
          <DashboardHeader onSidebarToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
          <main className="flex-1 bg-gray-50 min-h-0 max-h-full overflow-hidden">
            <div className="h-full max-h-full p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto overflow-x-hidden scrollbar-thin scrolling-touch">
              <div className="min-h-full w-full">{children}</div>
            </div>
          </main>
          <DashboardFooter />
        </div>
      </div>
    </QueryProvider>
  )
}
