"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { 
  Eye,
  Clock, 
  DollarSign, 
  Stethoscope,
  CheckCircle,
  XCircle,
  User,
  Calendar,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"

// Types
interface Treatment {
  _id: string
  name: string
  description?: string
  category: string
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  durations: Array<{
    _id: string
    minutes: number
    price: number
    professionalPrice: number
    isActive: boolean
  }>
  isActive: boolean
  allowTherapistGenderSelection?: boolean
  createdAt: string
  updatedAt: string
}

interface TreatmentViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  treatment: Treatment
}

export function TreatmentViewDialog({ 
  open, 
  onOpenChange, 
  treatment
}: TreatmentViewDialogProps) {
  
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "massages": return "עיסויים"
      case "facial_treatments": return "טיפולי פנים"
      default: return "אחר"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "massages": return "💆‍♀️"
      case "facial_treatments": return "✨"
      default: return "🔧"
    }
  }

  const getPricingTypeLabel = (pricingType: string) => {
    return pricingType === "fixed" ? "מחיר קבוע" : "לפי משך זמן"
  }

  const formatPrice = (price: number) => {
    return `₪${price.toLocaleString()}`
  }

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}:${remainingMinutes.toString().padStart(2, '0')} שעות` : `${hours} שעות`
    }
    return `${minutes} דקות`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            פרטי טיפול: {treatment.name}
          </DialogTitle>
          <DialogDescription>
            צפייה בפרטי הטיפול והגדרותיו
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Basic Info */}
          <Card className={cn(
            "border-2",
            treatment.isActive ? "border-green-200 bg-green-50/50" : "border-gray-200 bg-gray-50/50"
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{getCategoryIcon(treatment.category)}</div>
                  <div>
                    <h3 className="text-xl font-semibold">{treatment.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="gap-1">
                        <Stethoscope className="h-3 w-3" />
                        {getCategoryLabel(treatment.category)}
                      </Badge>
                      <Badge variant="secondary">
                        {getPricingTypeLabel(treatment.pricingType)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={treatment.isActive ? "default" : "secondary"}
                  className={cn(
                    "gap-1 text-lg px-3 py-1",
                    treatment.isActive 
                      ? "bg-green-100 text-green-800 hover:bg-green-200" 
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  )}
                >
                  {treatment.isActive ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {treatment.isActive ? "פעיל" : "לא פעיל"}
                </Badge>
              </div>

              {treatment.description && (
                <div className="bg-white/80 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    תיאור הטיפול
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {treatment.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                מידע תמחור
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {treatment.pricingType === "fixed" ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">מחיר ללקוח</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatPrice(treatment.fixedPrice || 0)}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">תשלום למטפל</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(treatment.fixedProfessionalPrice || 0)}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">משך זמן</div>
                    <div className="text-2xl font-bold text-purple-600 flex items-center gap-1">
                      <Clock className="h-5 w-5" />
                      {formatDuration(treatment.defaultDurationMinutes || 0)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-medium">אפשרויות משך זמן ומחיר</h4>
                  {treatment.durations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {treatment.durations.map((duration, index) => (
                        <Card key={duration._id} className={cn(
                          "p-4",
                          duration.isActive ? "border-green-200 bg-green-50/30" : "border-gray-200 bg-gray-50/30"
                        )}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{formatDuration(duration.minutes)}</span>
                            </div>
                            <Badge 
                              variant={duration.isActive ? "default" : "secondary"}
                              size="sm"
                            >
                              {duration.isActive ? "פעיל" : "לא פעיל"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-muted-foreground">מחיר ללקוח</div>
                              <div className="font-semibold text-blue-600">
                                {formatPrice(duration.price)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">תשלום למטפל</div>
                              <div className="font-semibold text-green-600">
                                {formatPrice(duration.professionalPrice)}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 text-muted-foreground">
                      לא הוגדרו אפשרויות משך זמן
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                הגדרות נוספות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">בחירת מין המטפל</div>
                  <div className="text-sm text-muted-foreground">
                    האם לקוחות יכולים לבחור את מין המטפל
                  </div>
                </div>
                <Badge variant={treatment.allowTherapistGenderSelection ? "default" : "secondary"}>
                  {treatment.allowTherapistGenderSelection ? "מופעל" : "מושבת"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                מידע מערכת
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground">מזהה טיפול:</div>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {treatment._id}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground">תאריך יצירה:</div>
                  <div>{new Date(treatment.createdAt).toLocaleString('he-IL')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-muted-foreground">עדכון אחרון:</div>
                  <div>{new Date(treatment.updatedAt).toLocaleString('he-IL')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
} 