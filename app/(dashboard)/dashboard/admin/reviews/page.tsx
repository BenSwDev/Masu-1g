import { Metadata } from "next"
import AdminReviewsClient from "@/components/dashboard/admin/reviews/admin-reviews-client"

export const metadata: Metadata = {
  title: "Reviews Management",
  description: "Manage customer reviews and ratings",
}

export default function AdminReviewsPage() {
  return <AdminReviewsClient />
} 