import { Suspense } from "react";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { Metadata } from "next";
import AdminReviewsClient from "@/components/dashboard/admin/reviews/admin-reviews-client";
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton";

export const metadata: Metadata = {
  title: "Reviews Management",
  description: "Manage customer reviews and ratings",
};

export default async function AdminReviewsPage() {
  await requireAdminSession();

  return (
    <div className="h-full">
      <Suspense fallback={<BookingsTableSkeleton />}>
        <AdminReviewsClient />
      </Suspense>
    </div>
  );
}
