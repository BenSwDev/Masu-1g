"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, MapPin } from "lucide-react"
import { createCity } from "@/app/dashboard/(user)/(roles)/admin/cities/actions"

interface CityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CityFormDialog({ open, onOpenChange, onSuccess }: CityFormDialogProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    lat: "",
    lng: "",
    isActive: true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.lat || !formData.lng) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "יש למלא את כל השדות הנדרשים"
      })
      return
    }

    const lat = parseFloat(formData.lat)
    const lng = parseFloat(formData.lng)

    if (isNaN(lat) || isNaN(lng)) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "יש להזין קורדינטות תקינות"
      })
      return
    }

    // Validate coordinates are within Israel bounds
    if (lat < 29.0 || lat > 33.5 || lng < 34.0 || lng > 36.0) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "הקורדינטות חייבות להיות בתחומי ישראל"
      })
      return
    }

    setLoading(true)

    try {
      const form = new FormData()
      form.append("name", formData.name.trim())
      form.append("lat", formData.lat)
      form.append("lng", formData.lng)
      form.append("isActive", formData.isActive.toString())

      const result = await createCity(form)

      if (result.success) {
        toast({
          title: "הצלחה",
          description: "העיר נוצרה בהצלחה וחישוב המרחקים הושלם"
        })
        
        // Reset form
        setFormData({
          name: "",
          lat: "",
          lng: "",
          isActive: true
        })
        
        onOpenChange(false)
        onSuccess?.()
      } else {
        let errorMessage = "שגיאה ביצירת העיר"
        
        switch (result.message) {
          case "notAuthorized":
            errorMessage = "אין הרשאה לביצוע פעולה זו"
            break
          case "missingFields":
            errorMessage = "יש למלא את כל השדות הנדרשים"
            break
          case "cityExists":
            errorMessage = "עיר בשם זה כבר קיימת במערכת"
            break
          case "coordinatesOutOfBounds":
            errorMessage = "הקורדינטות חייבות להיות בתחומי ישראל"
            break
          case "creationFailed":
            errorMessage = "שגיאה ביצירת העיר"
            break
        }
        
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: errorMessage
        })
      }
    } catch (error) {
      console.error("Error creating city:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה ביצירת העיר"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            הוספת עיר חדשה
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">שם העיר *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="הזן שם עיר"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">קו רוחב (Latitude) *</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={formData.lat}
                onChange={(e) => handleInputChange("lat", e.target.value)}
                placeholder="31.7683"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lng">קו אורך (Longitude) *</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                value={formData.lng}
                onChange={(e) => handleInputChange("lng", e.target.value)}
                placeholder="35.2137"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange("isActive", checked)}
            />
            <Label htmlFor="isActive">עיר פעילה</Label>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2">הערות חשובות:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• הקורדינטות חייבות להיות בתחומי ישראל</li>
              <li>• המערכת תחשב אוטומטית את המרחקים לכל הערים הקיימות</li>
              <li>• תהליך החישוב עלול לקחת מספר שניות</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  יוצר עיר...
                </>
              ) : (
                "צור עיר"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
