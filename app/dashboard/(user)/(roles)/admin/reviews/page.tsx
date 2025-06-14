import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUserSession } from "@/lib/auth/require-session";
import { Metadata } from "next";
import AdminReviewsClient from "@/components/dashboard/admin/reviews/admin-reviews-client";
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton";

export const metadata: Metadata = {
  title: "Reviews Management",
  description: "Manage customer reviews and ratings",
};

export default async function AdminReviewsPage() {
  const session = await requireUserSession();
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard");
  }

  return (
    <div className="h-full">
      <Suspense fallback={<BookingsTableSkeleton />}>
        <AdminReviewsClient />
      </Suspense>
    </div>
  );
}
