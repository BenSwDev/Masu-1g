"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/ui/table"
import { format } from "date-fns"
import { getAllBookings } from "@/actions/booking-actions"
import type { PopulatedBooking } from "@/types/booking"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/common/ui/badge"

interface ProfessionalEarningsTabProps {
  professional: any
}

export default function ProfessionalEarningsTab({ professional }: ProfessionalEarningsTabProps) {
  const [bookings, setBookings] = useState<PopulatedBooking[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!professional?.userId?._id) return
      setLoading(true)
      try {
        const result = await getAllBookings({ professional: professional.userId._id.toString(), limit: 100, page: 1 })
        setBookings(result.bookings || [])
      } catch (e) {
        console.error("Error fetching professional bookings", e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [professional])

  const calcPayment = (b: PopulatedBooking) => {
    const pd = b.priceDetails
    const tmt = b.treatmentId as any
    let base = 0
    if (tmt) {
      if (tmt.pricingType === "fixed") {
        base = tmt.fixedProfessionalPrice || 0
      } else if (tmt.pricingType === "duration_based" && b.selectedDurationId && tmt.durations) {
        const dur = tmt.durations.find((d: any) => d._id?.toString() === b.selectedDurationId?.toString())
        if (dur) base = dur.professionalPrice || 0
      }
    }
    let sur = 0
    if (pd.surcharges) {
      for (const s of pd.surcharges as any[]) {
        if (s.professionalShare) {
          sur += s.professionalShare.type === "percentage" ? s.amount * (s.professionalShare.amount / 100) : s.professionalShare.amount
        }
      }
    }
    return base + sur
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>הזמנות ורווחים</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>מספר הזמנה</TableHead>
              <TableHead>תאריך</TableHead>
              <TableHead>שולם</TableHead>
              <TableHead>רווח מטפל</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b._id.toString()}>
                <TableCell>{b.bookingNumber}</TableCell>
                <TableCell>{format(new Date(b.bookingDateTime), "dd/MM/yyyy HH:mm")}</TableCell>
                <TableCell>₪{b.priceDetails.finalAmount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    ₪{calcPayment(b).toFixed(2)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {bookings.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  אין הזמנות
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
