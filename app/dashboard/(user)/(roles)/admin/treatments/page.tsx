import type { Metadata } from "next"
import { TreatmentsClient } from "@/components/dashboard/admin/treatments/treatments-client"

export const metadata: Metadata = {
  title: "Admin - Treatments",
  description: "Manage treatments",
}

export default function TreatmentsPage() {
  return <TreatmentsClient />
}
