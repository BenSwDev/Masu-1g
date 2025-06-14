import { Suspense } from "react";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import AdminBookingsClient from "@/components/dashboard/admin/bookings/admin-bookings-client";
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton";

export default async function AdminBookingsPage() {
  await requireAdminSession();

  return (
    <div className="h-full">
      <Suspense fallback={<BookingsTableSkeleton />}>
        <AdminBookingsClient />
      </Suspense>
    </div>
  );
}
