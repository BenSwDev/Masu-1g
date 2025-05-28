import type { Metadata } from "next"
import { BundlesClient } from "@/components/dashboard/admin/bundles/bundles-client"

export const metadata: Metadata = {
  title: "Admin - Bundles",
  description: "Manage treatment bundles",
}

export default function BundlesPage() {
  return <BundlesClient />
}
