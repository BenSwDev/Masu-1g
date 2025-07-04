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
import type { IBookingAddressSnapshot } from "@/lib/db/models/booking"
import { CitySelectForm } from "@/components/common/ui/city-select-form"

interface BookingAddressTabProps {
  booking: PopulatedBooking
  onUpdate: (updates: Partial<PopulatedBooking>) => void
}

export default function BookingAddressTab({ booking, onUpdate }: BookingAddressTabProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [tempAddress, setTempAddress] = useState<Partial<IBookingAddressSnapshot>>(booking.bookingAddressSnapshot || {})

  const handleSave = () => {
    if (tempAddress.city && tempAddress.street) {
      // Ensure required fields are present and construct fullAddress if needed
      const updatedAddress: IBookingAddressSnapshot = {
        fullAddress: tempAddress.fullAddress || `${tempAddress.street} ${tempAddress.streetNumber || ''} ${tempAddress.city}`.trim(),
        city: tempAddress.city,
        street: tempAddress.street,
        streetNumber: tempAddress.streetNumber,
        apartment: tempAddress.apartment,
        entrance: tempAddress.entrance,
        floor: tempAddress.floor,
        notes: tempAddress.notes,
        doorName: tempAddress.doorName,
        buildingName: tempAddress.buildingName,
        hotelName: tempAddress.hotelName,
        roomNumber: tempAddress.roomNumber,
        otherInstructions: tempAddress.otherInstructions,
        hasPrivateParking: tempAddress.hasPrivateParking
      }
      onUpdate({ bookingAddressSnapshot: updatedAddress })
      setIsEditing(false)
    }
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

                {/* Street Number */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">מספר בית</Label>
                  {isEditing ? (
                    <Input
                      value={tempAddress.streetNumber || ""}
                      onChange={(e) => setTempAddress({...tempAddress, streetNumber: e.target.value})}
                      placeholder="מספר בית"
                    />
                  ) : (
                    <p className="text-sm">{address.streetNumber || "לא צוין"}</p>
                  )}
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">עיר</Label>
                  {isEditing ? (
                    <CitySelectForm
                      value={tempAddress.city || ""}
                      onValueChange={(value) => setTempAddress({...tempAddress, city: value})}
                      placeholder="בחר עיר"
                    />
                  ) : (
                    <p className="text-sm">{address.city || "לא צוין"}</p>
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

                {/* Entrance */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">כניסה</Label>
                  {isEditing ? (
                    <Input
                      value={tempAddress.entrance || ""}
                      onChange={(e) => setTempAddress({...tempAddress, entrance: e.target.value})}
                      placeholder="מספר כניסה"
                    />
                  ) : (
                    <p className="text-sm">{address.entrance || "לא צוין"}</p>
                  )}
                </div>

                {/* Private Parking */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">חניה פרטית</Label>
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={tempAddress.hasPrivateParking || false}
                        onChange={(e) => setTempAddress({...tempAddress, hasPrivateParking: e.target.checked})}
                        className="rounded"
                      />
                      <span className="text-sm">יש חניה פרטית</span>
                    </div>
                  ) : (
                    <Badge variant={address.hasPrivateParking ? "default" : "secondary"}>
                      {address.hasPrivateParking ? "יש חניה פרטית" : "אין חניה פרטית"}
                    </Badge>
                  )}
                </div>

                {/* Door Name (for house/private) */}
                {(address.doorName || isEditing) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">שם על הדלת</Label>
                    {isEditing ? (
                      <Input
                        value={tempAddress.doorName || ""}
                        onChange={(e) => setTempAddress({...tempAddress, doorName: e.target.value})}
                        placeholder="שם דלת (עבור בית פרטי)"
                      />
                    ) : (
                      <p className="text-sm">{address.doorName || "לא צוין"}</p>
                    )}
                  </div>
                )}

                {/* Building Name (for office) */}
                {(address.buildingName || isEditing) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">שם בניין</Label>
                    {isEditing ? (
                      <Input
                        value={tempAddress.buildingName || ""}
                        onChange={(e) => setTempAddress({...tempAddress, buildingName: e.target.value})}
                        placeholder="שם בניין (עבור משרד)"
                      />
                    ) : (
                      <p className="text-sm">{address.buildingName || "לא צוין"}</p>
                    )}
                  </div>
                )}

                {/* Hotel Name (for hotel) */}
                {(address.hotelName || isEditing) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">שם מלון</Label>
                    {isEditing ? (
                      <Input
                        value={tempAddress.hotelName || ""}
                        onChange={(e) => setTempAddress({...tempAddress, hotelName: e.target.value})}
                        placeholder="שם מלון"
                      />
                    ) : (
                      <p className="text-sm">{address.hotelName || "לא צוין"}</p>
                    )}
                  </div>
                )}

                {/* Room Number (for hotel) */}
                {(address.roomNumber || isEditing) && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">מספר חדר</Label>
                    {isEditing ? (
                      <Input
                        value={tempAddress.roomNumber || ""}
                        onChange={(e) => setTempAddress({...tempAddress, roomNumber: e.target.value})}
                        placeholder="מספר חדר במלון"
                      />
                    ) : (
                      <p className="text-sm">{address.roomNumber || "לא צוין"}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Full Address Display */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium">כתובת מלאה</Label>
                <p className="text-sm mt-1">
                  {[
                    address.street,
                    address.streetNumber,
                    address.city,
                    address.floor && `קומה ${address.floor}`,
                    address.apartment && `דירה ${address.apartment}`,
                    address.entrance && `כניסה ${address.entrance}`
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