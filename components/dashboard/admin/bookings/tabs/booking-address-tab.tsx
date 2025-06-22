"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Label } from "@/components/common/ui/label"
import { Badge } from "@/components/common/ui/badge"
import { 
  MapPin,
  Edit,
  Save,
  X,
  Building,
  Navigation,
  FileText,
  AlertTriangle
} from "lucide-react"
import type { PopulatedBooking } from "@/types/booking"

interface BookingAddressTabProps {
  booking: PopulatedBooking
  onUpdate: (updates: Partial<PopulatedBooking>) => void
}

export default function BookingAddressTab({ booking, onUpdate }: BookingAddressTabProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [tempAddress, setTempAddress] = useState(booking.bookingAddressSnapshot || {})

  const handleSave = () => {
    onUpdate({ bookingAddressSnapshot: tempAddress })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempAddress(booking.bookingAddressSnapshot || {})
    setIsEditing(false)
  }

  const address = booking.bookingAddressSnapshot

  return (
    <div className="space-y-6">
      {/* Address Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            סטטוס כתובת
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {address ? (
                <>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    כתובת מאושרת
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    כתובת הטיפול זמינה ומלאה
                  </span>
                </>
              ) : (
                <>
                  <Badge variant="destructive">
                    חסרה כתובת
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    לא הוגדרה כתובת לטיפול
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Address */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            פרטי כתובת
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            disabled={!address}
          >
            {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
            {isEditing ? "ביטול" : "עריכה"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {address ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Street */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">רחוב</Label>
                  {isEditing ? (
                    <Input
                      value={tempAddress.street || ""}
                      onChange={(e) => setTempAddress({...tempAddress, street: e.target.value})}
                      placeholder="שם הרחוב"
                    />
                  ) : (
                    <p className="text-sm">{address.street || "לא צוין"}</p>
                  )}
                </div>

                {/* Building Number */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">מספר בית</Label>
                  {isEditing ? (
                    <Input
                      value={tempAddress.buildingNumber || ""}
                      onChange={(e) => setTempAddress({...tempAddress, buildingNumber: e.target.value})}
                      placeholder="מספר בית"
                    />
                  ) : (
                    <p className="text-sm">{address.buildingNumber || "לא צוין"}</p>
                  )}
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">עיר</Label>
                  {isEditing ? (
                    <Input
                      value={tempAddress.city || ""}
                      onChange={(e) => setTempAddress({...tempAddress, city: e.target.value})}
                      placeholder="שם העיר"
                    />
                  ) : (
                    <p className="text-sm">{address.city || "לא צוין"}</p>
                  )}
                </div>

                {/* Postal Code */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">מיקוד</Label>
                  {isEditing ? (
                    <Input
                      value={tempAddress.postalCode || ""}
                      onChange={(e) => setTempAddress({...tempAddress, postalCode: e.target.value})}
                      placeholder="מיקוד"
                    />
                  ) : (
                    <p className="text-sm">{address.postalCode || "לא צוין"}</p>
                  )}
                </div>

                {/* Floor */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">קומה</Label>
                  {isEditing ? (
                    <Input
                      value={tempAddress.floor || ""}
                      onChange={(e) => setTempAddress({...tempAddress, floor: e.target.value})}
                      placeholder="מספר קומה"
                    />
                  ) : (
                    <p className="text-sm">{address.floor || "לא צוין"}</p>
                  )}
                </div>

                {/* Apartment */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">דירה</Label>
                  {isEditing ? (
                    <Input
                      value={tempAddress.apartment || ""}
                      onChange={(e) => setTempAddress({...tempAddress, apartment: e.target.value})}
                      placeholder="מספר דירה"
                    />
                  ) : (
                    <p className="text-sm">{address.apartment || "לא צוין"}</p>
                  )}
                </div>
              </div>

              {/* Full Address Display */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium">כתובת מלאה</Label>
                <p className="text-sm mt-1">
                  {[
                    address.street,
                    address.buildingNumber,
                    address.city,
                    address.postalCode,
                    address.floor && `קומה ${address.floor}`,
                    address.apartment && `דירה ${address.apartment}`
                  ].filter(Boolean).join(", ")}
                </p>
              </div>

              {/* Save Button */}
              {isEditing && (
                <div className="flex gap-2">
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    שמירה
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    ביטול
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 text-center">
              <div className="space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  לא הוגדרה כתובת עבור הזמנה זו
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            הערות כתובת
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">הערות נוספות</Label>
            {isEditing ? (
              <Textarea
                value={tempAddress.notes || ""}
                onChange={(e) => setTempAddress({...tempAddress, notes: e.target.value})}
                placeholder="הערות לכתובת (דירקטוריון, קוד כניסה, וכו')"
                rows={3}
              />
            ) : (
              <div className="p-4 border rounded-lg bg-gray-50 min-h-[80px]">
                {address?.notes ? (
                  <p className="text-sm whitespace-pre-wrap">{address.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">אין הערות נוספות</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">הוראות מיוחדות</Label>
            {isEditing ? (
              <Textarea
                value={tempAddress.otherInstructions || ""}
                onChange={(e) => setTempAddress({...tempAddress, otherInstructions: e.target.value})}
                placeholder="הוראות מיוחדות למטפל"
                rows={3}
              />
            ) : (
              <div className="p-4 border rounded-lg bg-gray-50 min-h-[80px]">
                {address?.otherInstructions ? (
                  <p className="text-sm whitespace-pre-wrap">{address.otherInstructions}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">אין הוראות מיוחדות</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location Coordinates */}
      {address?.coordinates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              קואורדינטות מיקום
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">קו רוחב (Latitude)</Label>
                <p className="text-sm font-mono">{address.coordinates.lat}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">קו אורך (Longitude)</Label>
                <p className="text-sm font-mono">{address.coordinates.lng}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guidelines */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-sm">הנחיות לכתובת</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm">
          <ul className="space-y-1 list-disc list-inside">
            <li>וודא שהכתובת מדויקת ומלאה לפני שליחה למטפל</li>
            <li>הוסף הערות רלוונטיות כמו קוד כניסה או הוראות חנייה</li>
            <li>בדוק שפרטי הקומה והדירה נכונים</li>
            <li>הוראות מיוחדות יעברו ישירות למטפל</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 