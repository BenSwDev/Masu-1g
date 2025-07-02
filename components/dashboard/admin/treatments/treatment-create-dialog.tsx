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

interface TreatmentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function TreatmentCreateDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: TreatmentCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>הוספת טיפול חדש</DialogTitle>
          <DialogDescription>
            יצירת טיפול חדש במערכת
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p>טופס יצירת טיפול יבוא בקרוב...</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={() => { onSuccess(); onOpenChange(false); }}>
            צור טיפול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 