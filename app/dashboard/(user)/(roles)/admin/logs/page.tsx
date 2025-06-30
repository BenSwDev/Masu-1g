import { Metadata } from "next"
import BookingLogsViewer from "@/components/dashboard/admin/booking-logs-viewer"

export const metadata: Metadata = {
  title: "לוגי תהליך הזמנות | מנהל",
  description: "צפיה ומעקב אחר לוגי תהליך ההזמנות במערכת",
}

export default function AdminLogsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">לוגי תהליך הזמנות</h1>
        <p className="text-gray-600">
          צפייה מפורטת בכל שלבי תהליך ההזמנה, לוגים ואבחון בעיות במערכת
        </p>
      </div>

      <BookingLogsViewer />
    </div>
  )
}
