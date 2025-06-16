import { redirect } from "next/navigation";
import { Metadata } from "next";
import { requireUserSession } from "@/lib/auth/require-session";
import AdminReviewsPageClient from "@/components/dashboard/admin/reviews/admin-reviews-page-client";

export const metadata: Metadata = {
  title: "Reviews Management",
  description: "Manage customer reviews and ratings",
};

export default async function AdminReviewsPage() {
  const session = await requireUserSession();
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard");
  }

  return <AdminReviewsPageClient />;
}
