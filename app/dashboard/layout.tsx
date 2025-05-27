import type React from "react"
import { QueryProvider } from "@/components/common/providers/query-client-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <QueryProvider>{children}</QueryProvider>
}
