import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUserSession } from "@/lib/auth/require-session";
import AdminBookingsClient from "@/components/dashboard/admin/bookings/admin-bookings-client";
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton";

export default async function AdminBookingsPage() {
  const session = await requireUserSession();
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard");
  }

  return (
    <div className="h-full">
      <Suspense fallback={<BookingsTableSkeleton />}>
        <AdminBookingsClient />
      </Suspense>
    </div>
  );
}
