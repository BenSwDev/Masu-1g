import { Metadata } from "next"
import MemberReviewsClient from "@/components/dashboard/member/reviews/member-reviews-client"

export const metadata: Metadata = {
  title: "My Reviews",
  description: "View and manage your treatment reviews",
}

export default function MemberReviewsPage() {
  return <MemberReviewsClient />
} 