"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation } from "@/lib/translations/i18n"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertTriangle,
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  CreditCard,
  FileText,
  DollarSign,
  Star,
  Save,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { PopulatedBooking } from "@/types/booking"
import type { BookingStatus } from "@/lib/db/models/booking"

// Import booking tabs
import BookingDetailsTab from "./tabs/booking-details-tab"
import BookingCustomerTab from "./tabs/booking-customer-tab"
import BookingSchedulingTab from "./tabs/booking-scheduling-tab"
import BookingAddressTab from "./tabs/booking-address-tab"
import BookingPaymentTab from "./tabs/booking-payment-tab"
import BookingNotesTab from "./tabs/booking-notes-tab"
import BookingFinancialTab from "./tabs/booking-financial-tab"
import BookingReviewTab from "./tabs/booking-review-tab"

interface BookingEditPageProps {
  booking: PopulatedBooking
}

export function BookingEditPage({ booking }: BookingEditPageProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState("details")
  const [updatedBooking, setUpdatedBooking] = useState<PopulatedBooking>(booking)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleUpdate = (updates: Partial<PopulatedBooking>) => {
    setUpdatedBooking(prev => ({ ...prev, ...updates }))
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Call the update booking API with the changed fields
      const updates = {
        status: updatedBooking.status !== booking.status ? updatedBooking.status : undefined,
        bookingDateTime:
          updatedBooking.bookingDateTime !== booking.bookingDateTime
            ? updatedBooking.bookingDateTime
            : undefined,
        recipientName:
          updatedBooking.recipientName !== booking.recipientName
            ? updatedBooking.recipientName
            : undefined,
        recipientPhone:
          updatedBooking.recipientPhone !== booking.recipientPhone
            ? updatedBooking.recipientPhone
            : undefined,
        recipientEmail:
          updatedBooking.recipientEmail !== booking.recipientEmail
            ? updatedBooking.recipientEmail
            : undefined,
        notes: updatedBooking.notes !== booking.notes ? updatedBooking.notes : undefined,
        professionalId:
          updatedBooking.professionalId !== booking.professionalId
            ? updatedBooking.professionalId && typeof updatedBooking.professionalId === "object"
              ? updatedBooking.professionalId._id.toString?.() || ''
              : updatedBooking.professionalId
            : undefined,
      }

      // Remove undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      )

      if (Object.keys(cleanUpdates).length === 0) {
        toast({
          description: "אין שינויים לשמירה",
        })
        setIsSaving(false)
        return
      }

      // Import the update function dynamically to avoid circular imports
      const { updateBookingByAdmin } = await import(
        "@/app/dashboard/(user)/(roles)/admin/bookings/actions"
      )
      const result = await updateBookingByAdmin(updatedBooking._id.toString?.() || '', cleanUpdates)

      if (result.success) {
        setHasUnsavedChanges(false)
        toast({
          title: "הצלחה",
          description: "ההזמנה עודכנה בהצלחה",
        })

        // Refresh the page data
        window.location.reload()
      } else {
        throw new Error(result.error || "שגיאה בעדכון ההזמנה")
      }
    } catch (error) {
      console.error("Error saving booking:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: error instanceof Error ? error.message : "שגיאה בעדכון ההזמנה",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (confirm("יש לך שינויים שלא נשמרו. האם אתה בטוח שאתה רוצה לצאת?")) {
        router.push("/dashboard/admin/bookings")
      }
    } else {
      router.push("/dashboard/admin/bookings")
    }
  }

  const getStatusBadge = (status: BookingStatus) => {
    const statusConfig = {
      pending_payment: { variant: "secondary" as const, text: "ממתין לתשלום" },
      in_process: { variant: "default" as const, text: "בטיפול" },
      confirmed: { variant: "default" as const, text: "מאושר" },
      completed: { variant: "default" as const, text: "הושלם" },
      cancelled: { variant: "destructive" as const, text: "בוטל" },
      refunded: { variant: "destructive" as const, text: "הוחזר" },
    }

    const config = statusConfig[status] || statusConfig["pending_payment"]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const formatBookingNumber = (bookingNumber?: string) => {
    return bookingNumber ? `#${bookingNumber}` : "ללא מספר"
  }

  return (
    <div className="min-h-screen" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                הזמנה {formatBookingNumber(updatedBooking.bookingNumber)}
              </h1>
              {getStatusBadge(updatedBooking.status)}
              {updatedBooking.professionalId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  מטפל שויך
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">עריכת פרטי ההזמנה וניהול המצב</p>
          </div>
        </div>

        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>יש שינויים שלא נשמרו</span>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "שומר..." : "שמירה"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} dir={dir} className="w-full">
            <TabsList className="grid w-full grid-cols-8 mb-6">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">פרטים</span>
              </TabsTrigger>
              <TabsTrigger value="customer" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">לקוח</span>
              </TabsTrigger>
              <TabsTrigger value="scheduling" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">תזמון</span>
              </TabsTrigger>
              <TabsTrigger value="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">כתובת</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">תשלום</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">הערות</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">כספים</span>
              </TabsTrigger>
              <TabsTrigger value="review" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span className="hidden sm:inline">ביקורת</span>
              </TabsTrigger>
            </TabsList>

            <div className="min-h-[600px]">
              <TabsContent value="details" className="m-0">
                <BookingDetailsTab booking={updatedBooking} onUpdate={handleUpdate} />
              </TabsContent>

              <TabsContent value="customer" className="m-0">
                <BookingCustomerTab booking={updatedBooking} onUpdate={handleUpdate} />
              </TabsContent>

              <TabsContent value="scheduling" className="m-0">
                <BookingSchedulingTab booking={updatedBooking} onUpdate={handleUpdate} />
              </TabsContent>

              <TabsContent value="address" className="m-0">
                <BookingAddressTab booking={updatedBooking} onUpdate={handleUpdate} />
              </TabsContent>

              <TabsContent value="payment" className="m-0">
                <BookingPaymentTab booking={updatedBooking} onUpdate={handleUpdate} />
              </TabsContent>

              <TabsContent value="notes" className="m-0">
                <BookingNotesTab booking={updatedBooking} onUpdate={handleUpdate} />
              </TabsContent>

              <TabsContent value="financial" className="m-0">
                <BookingFinancialTab booking={updatedBooking} onUpdate={handleUpdate} />
              </TabsContent>

              <TabsContent value="review" className="m-0">
                <BookingReviewTab booking={updatedBooking} onUpdate={handleUpdate} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
