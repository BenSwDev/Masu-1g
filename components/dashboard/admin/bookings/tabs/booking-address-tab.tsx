"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Label } from "@/components/common/ui/label"
import { Badge } from "@/components/common/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Checkbox } from "@/components/common/ui/checkbox"
import { 
  MapPin,
  Edit,
  Save,
  X,
  Building,
  Navigation,
  FileText,
  AlertTriangle,
  Home,
  Building2,
  Hotel,
  MapIcon
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

  const address = booking.bookingAddressSnapshot
  const addressType = address?.addressType || "apartment"

  // Get address type information
  const getAddressTypeInfo = (type: string) => {
    switch (type) {
      case "apartment": 
        return { 
          name: "דירה", 
          icon: Home, 
          color: "bg-blue-100 text-blue-800",
          description: "דירה במבנה מגורים"
        }
      case "house": 
        return { 
          name: "בית פרטי", 
          icon: Building, 
          color: "bg-green-100 text-green-800",
          description: "בית פרטי עצמאי"
        }
      case "office": 
        return { 
          name: "משרד", 
          icon: Building2, 
          color: "bg-purple-100 text-purple-800",
          description: "משרד או מבנה עסקי"
        }
      case "hotel": 
        return { 
          name: "מלון/צימר", 
          icon: Hotel, 
          color: "bg-pink-100 text-pink-800",
          description: "מלון, צימר או אירוח"
        }
      case "other": 
        return { 
          name: "אחר", 
          icon: MapIcon, 
          color: "bg-gray-100 text-gray-800",
          description: "סוג כתובת אחר"
        }
      default: 
        return { 
          name: "דירה", 
          icon: Home, 
          color: "bg-blue-100 text-blue-800",
          description: "דירה במבנה מגורים"
        }
    }
  }

  const typeInfo = getAddressTypeInfo(addressType)
  const editTypeInfo = getAddressTypeInfo(tempAddress.addressType || "apartment")

  const handleSave = () => {
    if (tempAddress.city && tempAddress.street && tempAddress.streetNumber && tempAddress.addressType) {
      // Construct full address based on type
      let fullAddressComponents = [tempAddress.street, tempAddress.streetNumber, tempAddress.city]
      
      // Add type-specific components to full address
      if (tempAddress.addressType === "apartment" && tempAddress.apartment) {
        fullAddressComponents.push(`דירה ${tempAddress.apartment}`)
      }
      if (tempAddress.addressType === "house" && tempAddress.doorName) {
        fullAddressComponents.push(`(${tempAddress.doorName})`)
      }
      if (tempAddress.addressType === "office" && tempAddress.buildingName) {
        fullAddressComponents.push(tempAddress.buildingName)
      }
      if (tempAddress.addressType === "hotel" && tempAddress.hotelName) {
        fullAddressComponents.push(tempAddress.hotelName)
      }

      const updatedAddress: IBookingAddressSnapshot = {
        fullAddress: fullAddressComponents.join(", "),
        city: tempAddress.city,
        street: tempAddress.street,
        streetNumber: tempAddress.streetNumber,
        addressType: tempAddress.addressType,
        apartment: tempAddress.apartment,
        entrance: tempAddress.entrance,
        floor: tempAddress.floor,
        notes: tempAddress.notes,
        doorName: tempAddress.doorName,
        buildingName: tempAddress.buildingName,
        hotelName: tempAddress.hotelName,
        roomNumber: tempAddress.roomNumber,
        instructions: tempAddress.instructions,
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

  const handleAddressTypeChange = (newType: string) => {
    setTempAddress({
      ...tempAddress,
      addressType: newType as any,
      // Clear type-specific fields when changing type
      apartment: undefined,
      floor: undefined,
      entrance: undefined,
      doorName: undefined,
      buildingName: undefined,
      hotelName: undefined,
      roomNumber: undefined,
      instructions: undefined
    })
  }

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
            <div className="flex items-center gap-3">
              {address ? (
                <>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    כתובת מאושרת
                  </Badge>
                  <div className="flex items-center gap-2">
                    <typeInfo.icon className="w-4 h-4" />
                    <span className={`text-xs px-2 py-1 rounded font-medium ${typeInfo.color}`}>
                      {typeInfo.name}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {typeInfo.description}
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
            <div className="space-y-6">
              {/* Basic Address Fields */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-700 border-b pb-1">פרטים בסיסיים</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Address Type */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">סוג כתובת</Label>
                    {isEditing ? (
                      <Select onValueChange={handleAddressTypeChange} value={tempAddress.addressType || "apartment"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartment">🏠 דירה</SelectItem>
                          <SelectItem value="house">🏡 בית פרטי</SelectItem>
                          <SelectItem value="office">🏢 משרד</SelectItem>
                          <SelectItem value="hotel">🏨 מלון/צימר</SelectItem>
                          <SelectItem value="other">📍 אחר</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <typeInfo.icon className="w-4 h-4" />
                        <span className={`text-sm px-2 py-1 rounded font-medium ${typeInfo.color}`}>
                          {typeInfo.name}
                        </span>
                      </div>
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
                </div>
              </div>

              {/* Type-Specific Fields */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-700 border-b pb-1 flex items-center gap-2">
                  <editTypeInfo.icon className="w-4 h-4" />
                  פרטים ספציפיים - {isEditing ? editTypeInfo.name : typeInfo.name}
                </h4>

                {/* Apartment Fields */}
                {(isEditing ? tempAddress.addressType === "apartment" : addressType === "apartment") && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-blue-800">קומה</Label>
                      {isEditing ? (
                        <Select onValueChange={(value) => setTempAddress({...tempAddress, floor: value})} value={tempAddress.floor || ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="בחר קומה" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {Array.from({ length: 20 }, (_, i) => i + 1).map((floor) => (
                              <SelectItem key={floor} value={floor.toString()}>
                                {floor}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">{address.floor || "לא צוין"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-blue-800">מספר דירה *</Label>
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

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-blue-800">כניסה</Label>
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
                  </div>
                )}

                {/* House Fields */}
                {(isEditing ? tempAddress.addressType === "house" : addressType === "house") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-green-800">שם על הדלת</Label>
                      {isEditing ? (
                        <Input
                          value={tempAddress.doorName || ""}
                          onChange={(e) => setTempAddress({...tempAddress, doorName: e.target.value})}
                          placeholder="שם על הדלת"
                        />
                      ) : (
                        <p className="text-sm">{address.doorName || "לא צוין"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-green-800">כניסה</Label>
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
                  </div>
                )}

                {/* Office Fields */}
                {(isEditing ? tempAddress.addressType === "office" : addressType === "office") && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-purple-50 rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-purple-800">שם בניין *</Label>
                      {isEditing ? (
                        <Input
                          value={tempAddress.buildingName || ""}
                          onChange={(e) => setTempAddress({...tempAddress, buildingName: e.target.value})}
                          placeholder="שם הבניין"
                        />
                      ) : (
                        <p className="text-sm">{address.buildingName || "לא צוין"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-purple-800">קומה</Label>
                      {isEditing ? (
                        <Select onValueChange={(value) => setTempAddress({...tempAddress, floor: value})} value={tempAddress.floor || ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="בחר קומה" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {Array.from({ length: 50 }, (_, i) => i + 1).map((floor) => (
                              <SelectItem key={floor} value={floor.toString()}>
                                {floor}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">{address.floor || "לא צוין"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-purple-800">כניסה</Label>
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
                  </div>
                )}

                {/* Hotel Fields */}
                {(isEditing ? tempAddress.addressType === "hotel" : addressType === "hotel") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-pink-50 rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-pink-800">שם מלון *</Label>
                      {isEditing ? (
                        <Input
                          value={tempAddress.hotelName || ""}
                          onChange={(e) => setTempAddress({...tempAddress, hotelName: e.target.value})}
                          placeholder="שם המלון"
                        />
                      ) : (
                        <p className="text-sm">{address.hotelName || "לא צוין"}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-pink-800">מספר חדר</Label>
                      {isEditing ? (
                        <Input
                          value={tempAddress.roomNumber || ""}
                          onChange={(e) => setTempAddress({...tempAddress, roomNumber: e.target.value})}
                          placeholder="מספר חדר"
                        />
                      ) : (
                        <p className="text-sm">{address.roomNumber || "לא צוין"}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Other Fields */}
                {(isEditing ? tempAddress.addressType === "other" : addressType === "other") && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-800">הוראות הגעה</Label>
                      {isEditing ? (
                        <Textarea
                          value={tempAddress.instructions || ""}
                          onChange={(e) => setTempAddress({...tempAddress, instructions: e.target.value})}
                          placeholder="הוראות מפורטות להגעה למקום"
                          rows={3}
                        />
                      ) : (
                        <div className="p-3 border rounded-lg bg-white min-h-[80px]">
                          {address.instructions ? (
                            <p className="text-sm whitespace-pre-wrap">{address.instructions}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">אין הוראות מיוחדות</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Parking */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-gray-700 border-b pb-1">חניה</h4>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">חניה פרטית</Label>
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={tempAddress.hasPrivateParking || false}
                        onCheckedChange={(checked) => setTempAddress({...tempAddress, hasPrivateParking: Boolean(checked)})}
                      />
                      <Label className="text-sm">יש חניה פרטית במקום</Label>
                    </div>
                  ) : (
                    <Badge variant={address.hasPrivateParking ? "default" : "secondary"} className={
                      address.hasPrivateParking ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }>
                      {address.hasPrivateParking ? "🅿️ יש חניה פרטית" : "🚫 אין חניה פרטית"}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Full Address Display */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                <Label className="text-sm font-medium text-gray-700">כתובת מלאה לתצוגה</Label>
                <p className="text-sm mt-2 font-medium">
                  {address.fullAddress || [
                    address.street,
                    address.streetNumber,
                    address.city,
                    address.floor && `קומה ${address.floor}`,
                    address.apartment && `דירה ${address.apartment}`,
                    address.entrance && `כניסה ${address.entrance}`,
                    address.doorName && `(${address.doorName})`,
                    address.buildingName && address.buildingName,
                    address.hotelName && address.hotelName,
                    address.roomNumber && `חדר ${address.roomNumber}`
                  ].filter(Boolean).join(", ")}
                </p>
              </div>

              {/* Save Button */}
              {isEditing && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleSave} disabled={!tempAddress.city || !tempAddress.street || !tempAddress.streetNumber}>
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
            <Label className="text-sm font-medium">הוראות מיוחדות למטפל</Label>
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
          <CardTitle className="text-blue-800 text-sm">הנחיות לניהול כתובות</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm">
          <ul className="space-y-1 list-disc list-inside">
            <li>בחר את סוג הכתובת הנכון לקבלת השדות המתאימים</li>
            <li>וודא שהכתובת מדויקת ומלאה לפני שליחה למטפל</li>
            <li>השלם שדות חובה (מסומנים ב-*) לפי סוג הכתובת</li>
            <li>הוסף הערות רלוונטיות כמו קוד כניסה או הוראות חנייה</li>
            <li>הוראות מיוחדות יעברו ישירות למטפל</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 