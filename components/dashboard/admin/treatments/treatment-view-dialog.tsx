"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog"
import { Badge } from "@/components/common/ui/badge"

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
  createdAt: Date
  updatedAt: Date
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>פרטי טיפול: {treatment?.name}</DialogTitle>
          <DialogDescription>
            צפייה בפרטי הטיפול
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <strong>שם:</strong> {treatment?.name}
          </div>
          <div>
            <strong>קטגוריה:</strong> {treatment?.category}
          </div>
          <div>
            <strong>סטטוס:</strong>{" "}
            <Badge variant={treatment?.isActive ? "default" : "secondary"}>
              {treatment?.isActive ? "פעיל" : "לא פעיל"}
            </Badge>
          </div>
          {treatment?.description && (
            <div>
              <strong>תיאור:</strong> {treatment.description}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 