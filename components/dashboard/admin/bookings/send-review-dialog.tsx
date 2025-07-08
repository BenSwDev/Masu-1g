"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Label } from "@/components/common/ui/label"
import { toast } from "sonner"
import type { PopulatedBooking } from "@/types/booking"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"

interface SendReviewDialogProps {
  booking: PopulatedBooking
  open: boolean
  onOpenChange: (open: boolean) => void
  onSent: () => void
}

export default function SendReviewDialog({ booking, open, onOpenChange, onSent }: SendReviewDialogProps) {
  const [sendSms, setSendSms] = useState(Boolean(booking.recipientPhone || (booking.userId as any)?.phone))
  const [sendEmail, setSendEmail] = useState(Boolean(booking.recipientEmail || (booking.userId as any)?.email))
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!sendSms && !sendEmail) return

    setSending(true)
    try {
      const response = await fetch(`/api/admin/bookings/${booking._id}/send-review-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sms: sendSms,
          email: sendEmail
        })
      })

      const result = await response.json()
      
      if (result.success) {
        toast.success("נשלחה בקשת חוות דעת")
        onSent()
        onOpenChange(false)
      } else {
        toast.error(result.error || "שגיאה בשליחת הבקשה")
      }
    } catch (err) {
      console.error("Error sending review request:", err)
      toast.error("שגיאה בשליחת הבקשה")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>שליחת חוות דעת</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">למי: {booking.recipientName || (booking.userId as any)?.name || "-"}</p>
          {booking.recipientEmail || (booking.userId as any)?.email ? (
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox id="send-email" checked={sendEmail} onCheckedChange={(v) => setSendEmail(Boolean(v))} />
              <Label htmlFor="send-email">אימייל ({booking.recipientEmail || (booking.userId as any)?.email})</Label>
            </div>
          ) : null}
          {booking.recipientPhone || (booking.userId as any)?.phone ? (
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox id="send-sms" checked={sendSms} onCheckedChange={(v) => setSendSms(Boolean(v))} />
                              <Label htmlFor="send-sms">SMS ({formatPhoneForDisplay(booking.recipientPhone || (booking.userId as any)?.phone || "")})</Label>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>ביטול</Button>
          <Button onClick={handleSend} disabled={sending || (!sendSms && !sendEmail)}>שלח</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
