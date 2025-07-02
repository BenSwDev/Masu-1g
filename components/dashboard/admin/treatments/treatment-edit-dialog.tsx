"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"

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

interface TreatmentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  treatment: Treatment
  onSuccess: () => void
}

export function TreatmentEditDialog({ 
  open, 
  onOpenChange, 
  treatment,
  onSuccess 
}: TreatmentEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>עריכת טיפול: {treatment?.name}</DialogTitle>
          <DialogDescription>
            עריכת פרטי הטיפול
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p>טופס עריכת טיפול יבוא בקרוב...</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={() => { onSuccess(); onOpenChange(false); }}>
            שמור שינויים
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 