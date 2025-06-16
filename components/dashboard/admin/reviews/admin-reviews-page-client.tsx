"use client";

import { Suspense } from "react";
import AdminReviewsClient from "./admin-reviews-client";
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton";

/**
 * Wrapper client component for the admin reviews page
 * Separates client-only logic from the server page.
 */
export default function AdminReviewsPageClient() {
  return (
    <div className="h-full">
      <Suspense fallback={<BookingsTableSkeleton />}>
        <AdminReviewsClient />
      </Suspense>
    </div>
  );
}
