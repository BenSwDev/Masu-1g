"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreVertical, Edit, Copy, Trash2, Clock, DollarSignIcon as Shekel } from "lucide-react"
import type { ITreatment } from "@/lib/db/models/treatment"
import { toggleTreatmentStatus, deleteTreatment, duplicateTreatment } from "@/actions/treatment-actions"
import { toast } from "@/components/ui/use-toast"

interface TreatmentCardProps {
  treatment: ITreatment
  onEdit: (treatment: ITreatment) => void
  onUpdate: (treatment: ITreatment) => void
  onDelete: (id: string) => void
}

export function TreatmentCard({ treatment, onEdit, onUpdate, onDelete }: TreatmentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const categoryLabels = {
    massages: "עיסויים",
    facial_treatments: "טיפולי פנים",
  }

  const handleToggleStatus = async () => {
    setIsToggling(true)
    try {
      const result = await toggleTreatmentStatus(treatment._id)
      if (result.success && result.treatment) {
        onUpdate(result.treatment)
        toast({
          title: "הסטטוס עודכן בהצלחה",
          variant: "default",
        })
      } else {
        toast({
          title: "שגיאה בעדכון הסטטוס",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה בעדכון הסטטוס",
        variant: "destructive",
      })
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteTreatment(treatment._id)
      if (result.success) {
        onDelete(treatment._id)
        toast({
          title: "הטיפול נמחק בהצלחה",
          variant: "default",
        })
      } else {
        toast({
          title: "שגיאה במחיקת הטיפול",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה במחיקת הטיפול",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      const result = await duplicateTreatment(treatment._id)
      if (result.success && result.treatment) {
        onUpdate(result.treatment)
        toast({
          title: "הטיפול שוכפל בהצלחה",
          variant: "default",
        })
      } else {
        toast({
          title: "שגיאה בשכפול הטיפול",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "שגיאה בשכפול הטיפול",
        variant: "destructive",
      })
    } finally {
      setIsDuplicating(false)
    }
  }

  const calculateProfessionalPercentage = (professionalPrice: number, totalPrice: number) => {
    return Math.round((professionalPrice / totalPrice) * 100)
  }

  return (
    <>
      <Card className={`transition-all ${!treatment.isActive ? "opacity-60" : ""}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-1">{treatment.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {categoryLabels[treatment.category]}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={treatment.isActive} onCheckedChange={handleToggleStatus} disabled={isToggling} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(treatment)}>
                    <Edit className="h-4 w-4 ml-2" />
                    עריכה
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
                    <Copy className="h-4 w-4 ml-2" />
                    שכפול
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                    <Trash2 className="h-4 w-4 ml-2" />
                    מחיקה
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {treatment.description && <p className="text-sm text-muted-foreground mb-4">{treatment.description}</p>}

          <div className="space-y-3">
            {treatment.pricingType === "fixed" ? (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Shekel className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">מחיר קבוע:</span>
                  <span>₪{treatment.fixedPrice}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  מחיר למטפל: ₪{treatment.fixedProfessionalPrice}(
                  {calculateProfessionalPercentage(treatment.fixedProfessionalPrice!, treatment.fixedPrice!)}%)
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>זמנים זמינים:</span>
                </div>
                {treatment.durations
                  ?.filter((d) => d.isActive)
                  .map((duration) => (
                    <div key={duration.minutes} className="bg-muted/50 rounded-lg p-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span>{duration.minutes} דקות</span>
                        <span className="font-medium">₪{duration.price}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        למטפל: ₪{duration.professionalPrice}(
                        {calculateProfessionalPercentage(duration.professionalPrice, duration.price)}%)
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הטיפול "{treatment.name}" לצמיתות. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "מוחק..." : "מחק"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
