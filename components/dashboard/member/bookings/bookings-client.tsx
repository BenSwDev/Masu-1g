"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import type { PopulatedBooking } from "@/actions/booking-actions"
import { BookingCard } from "./booking-card"
import { ClientAwareBookingsLoadingSkeleton } from "./client-aware-bookings-loading-skeleton" // Assuming this will be created
import { Button } from "@/components/common/ui/button"
import { PlusCircle, ListFilter, CalendarClock, History } from "lucide-react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import type { Booking } from "@prisma/client"

interface BookingsClientProps {
  initialUpcomingBookings: PopulatedBooking[]
  initialPastBookings: PopulatedBooking[]
}

export function BookingsClient({ initialUpcomingBookings, initialPastBookings }: BookingsClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false) // For future actions like loading more

  const [upcomingBookings, setUpcomingBookings] = useState<PopulatedBooking[]>(initialUpcomingBookings)
  const [pastBookings, setPastBookings] = useState<PopulatedBooking[]>(initialPastBookings)

  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filterBookings = (bookings: PopulatedBooking[]) => {
    if (statusFilter === "all") return bookings
    return bookings.filter((booking) => booking.status === statusFilter)
  }

  const filteredUpcomingBookings = filterBookings(upcomingBookings)
  const filteredPastBookings = filterBookings(pastBookings)

  const bookingStatuses: Booking["status"][] = [
    "pending",
    "confirmed",
    "professional_assigned",
    "completed",
    "cancelled_by_user",
    "cancelled_by_admin",
    "no_show",
    "rescheduled",
  ]

  if (isLoading && !upcomingBookings.length && !pastBookings.length) {
    return <ClientAwareBookingsLoadingSkeleton />
  }

  const renderBookingList = (bookings: PopulatedBooking[], listType: "upcoming" | "past") => {
    if (bookings.length === 0) {
      return (
        <div className="text-center py-10 px-4 bg-white rounded-lg shadow">
          <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">
            {listType === "upcoming" ? t("bookings.noUpcomingBookings") : t("bookings.noPastBookings")}
          </p>
          {listType === "upcoming" && (
            <Button
              onClick={() => router.push("/dashboard/member/book-treatment")}
              className="mt-4 bg-gradient-to-r from-turquoise-500 to-teal-500 hover:from-turquoise-600 hover:to-teal-600 text-white"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("bookings.bookNew")}
            </Button>
          )}
        </div>
      )
    }
    return (
      <div className="space-y-4">
        {bookings.map((booking) => (
          <BookingCard key={booking._id.toString()} booking={booking} />
        ))}
      </div>
    )
  }

  const allBookingsCount = initialUpcomingBookings.length + initialPastBookings.length

  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-800">{t("bookings.title")}</h1>
          <p className="text-gray-600">{t("bookings.description")}</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <ListFilter className="h-4 w-4" />
                {t("bookings.filters.filterByStatus")}
                {statusFilter !== "all" && `: ${t(`bookings.status.${statusFilter}` as any)}`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                <DropdownMenuRadioItem value="all">{t("bookings.filters.allStatuses")}</DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                {bookingStatuses.map((status) => (
                  <DropdownMenuRadioItem key={status} value={status}>
                    {t(`bookings.status.${status}` as any, status.replace(/_/g, " "))}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => router.push("/dashboard/member/book-treatment")}
            className="bg-gradient-to-r from-turquoise-500 to-teal-500 hover:from-turquoise-600 hover:to-teal-600 text-white"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("bookings.bookNewShort")}
          </Button>
        </div>
      </div>

      {allBookingsCount === 0 && statusFilter === "all" ? (
        <div className="text-center py-16 px-4 bg-white rounded-lg shadow-xl">
          <CalendarClock className="mx-auto h-16 w-16 text-turquoise-500 mb-6" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">{t("bookings.noBookingsYetTitle")}</h2>
          <p className="text-gray-500 mb-6">{t("bookings.noBookingsYetDescription")}</p>
          <Button
            onClick={() => router.push("/dashboard/member/book-treatment")}
            size="lg"
            className="bg-gradient-to-r from-turquoise-500 to-teal-500 hover:from-turquoise-600 hover:to-teal-600 text-white"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            {t("bookings.bookNew")}
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-4 bg-gray-200 p-1 rounded-lg">
            <TabsTrigger
              value="upcoming"
              className="data-[state=active]:bg-turquoise-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <CalendarClock className="mr-2 h-4 w-4" /> {t("bookings.upcomingBookings")} (
              {filteredUpcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="data-[state=active]:bg-turquoise-500 data-[state=active]:text-white data-[state=active]:shadow-md"
            >
              <History className="mr-2 h-4 w-4" /> {t("bookings.pastBookings")} ({filteredPastBookings.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming">{renderBookingList(filteredUpcomingBookings, "upcoming")}</TabsContent>
          <TabsContent value="past">{renderBookingList(filteredPastBookings, "past")}</TabsContent>
        </Tabs>
      )}
    </div>
  )
}
