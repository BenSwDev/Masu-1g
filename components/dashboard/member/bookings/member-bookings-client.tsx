"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getBookingColumns } from "./bookings-columns"
import { DataTable } from "@/components/common/ui/data-table"
import { BookingsTableSkeleton } from "./bookings-table-skeleton"
import type { PopulatedBooking } from "@/types/booking"
import { Heading } from "@/components/common/ui/heading"
// 1. Change the imported function from fetchMemberBookings to getUserBookings
import { getUserBookings } from "@/actions/booking-actions"

/**
 * @file MemberBookingsClient.tsx
 * @description Client component for displaying member bookings.
 * Handles data fetching, state management, and rendering of the bookings table.
 * It uses `useTranslation` for internationalization and `getBookingColumns`
 * to define the table structure. It fetches bookings using the `getUserBookings` server action.
 *
 * @module components/dashboard/member/bookings/member-bookings-client
 *
 * @param {object} props - The component's props.
 * @param {string} props.userId - The ID of the current user to fetch bookings for.
 *
 * @example
 * <MemberBookingsClient userId="user123" />
 */
export default function MemberBookingsClient({ userId }: { userId: string }) {
  const { t, language, dir } = useTranslation()

  // 2. Update the useQuery hook to use getUserBookings and expect its return type
  const {
    data, // Renamed from 'bookings' to 'data' to reflect the structure returned by getUserBookings
    isLoading,
    error,
  } = useQuery<
    { bookings: PopulatedBooking[]; totalPages: number; totalBookings: number }, // Updated return type
    Error
  >({
    queryKey: ["memberBookings", userId, language],
    // 3. Update queryFn to call getUserBookings with userId and default empty filters
    // The getUserBookings action handles default pagination/sorting if not provided.
    queryFn: () => getUserBookings(userId, {}),
  })

  const columns = useMemo(() => getBookingColumns(t, language), [t, language])

  if (isLoading) {
    return (
      <div>
        <Heading as="h2" size="xl" className="mb-6 text-center md:text-right">
          {t("memberBookings.client.title")}
        </Heading>
        <BookingsTableSkeleton />
        <p className="mt-4 text-center text-muted-foreground">{t("memberBookings.client.loading")}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <Heading as="h2" size="xl" className="mb-6 text-center md:text-right">
          {t("memberBookings.client.title")}
        </Heading>
        <p>
          {t("memberBookings.client.error")}: {error.message}
        </p>
      </div>
    )
  }

  // 4. Adjust logic to access bookings from the 'data' object
  if (!data?.bookings || data.bookings.length === 0) {
    return (
      <div>
        <Heading as="h2" size="xl" className="mb-6 text-center md:text-right">
          {t("memberBookings.client.title")}
        </Heading>
        <p className="text-center text-muted-foreground">{t("memberBookings.client.noBookings")}</p>
      </div>
    )
  }

  return (
    <div dir={dir}>
      <Heading as="h2" size="xl" className="mb-6 text-center md:text-right">
        {t("memberBookings.client.title")}
      </Heading>
      {/* 5. Pass data.bookings to the DataTable */}
      <DataTable columns={columns} data={data.bookings} />
    </div>
  )
}
