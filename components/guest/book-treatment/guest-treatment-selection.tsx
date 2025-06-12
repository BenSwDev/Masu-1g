"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import type { ITreatment } from "@/lib/db/models/treatment"
import { Package } from "lucide-react"

interface BookingOptions {
  selectedTreatmentId?: string
  selectedDurationId?: string
}

interface GuestTreatmentSelectionProps {
  treatments: ITreatment[]
  bookingOptions: BookingOptions
  setBookingOptions: (options: Partial<BookingOptions>) => void
}

export default function GuestTreatmentSelection({ 
  treatments, 
  bookingOptions, 
  setBookingOptions 
}: GuestTreatmentSelectionProps) {
  const selectedTreatment = treatments.find(t => t._id.toString() === bookingOptions.selectedTreatmentId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          בחירת טיפול
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {treatments.map((treatment) => (
            <Card 
              key={treatment._id.toString()}
              className={`cursor-pointer border-2 transition-all ${
                bookingOptions.selectedTreatmentId === treatment._id.toString() 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setBookingOptions({ 
                selectedTreatmentId: treatment._id.toString(),
                selectedDurationId: undefined // Reset duration when treatment changes
              })}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{treatment.name}</CardTitle>
                {treatment.category && (
                  <Badge variant="secondary" className="w-fit">
                    {treatment.category}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-2">{treatment.description}</p>
                {treatment.pricingType === "fixed" && (
                  <p className="font-semibold text-blue-600">{treatment.fixedPrice} ₪</p>
                )}
                {treatment.pricingType === "duration_based" && (
                  <p className="text-sm text-gray-500">מחיר לפי זמן</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Duration selection for duration-based treatments */}
        {selectedTreatment?.pricingType === "duration_based" && selectedTreatment.durations && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">בחירת משך הטיפול</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedTreatment.durations.map((duration) => (
                <Card 
                  key={duration._id.toString()}
                  className={`cursor-pointer border-2 transition-all ${
                    bookingOptions.selectedDurationId === duration._id.toString() 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setBookingOptions({ 
                    selectedDurationId: duration._id.toString()
                  })}
                >
                  <CardContent className="p-4 text-center">
                    <h4 className="font-medium">{duration.durationMinutes} דקות</h4>
                    <p className="text-lg font-semibold text-blue-600">{duration.price} ₪</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 