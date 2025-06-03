"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/common/ui/modal"
import { DialogFooter } from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Label } from "@/components/common/ui/label"
import { useToast } from "@/components/common/ui/use-toast"
import { updateTreatmentPreferences } from "@/actions/preferences-actions"
import type { ITreatmentPreferences } from "@/lib/db/models/user"
import { useSession } from "next-auth/react"

interface TreatmentPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  currentPreferences: ITreatmentPreferences | undefined
}

const defaultPrefs: ITreatmentPreferences = { therapistGender: "any" }

export function TreatmentPreferencesModal({ isOpen, onClose, currentPreferences }: TreatmentPreferencesModalProps) {
  const [selectedGender, setSelectedGender] = useState<ITreatmentPreferences["therapistGender"]>(
    currentPreferences?.therapistGender || defaultPrefs.therapistGender,
  )
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { data: session, update: updateSession } = useSession()

  useEffect(() => {
    if (isOpen && currentPreferences) {
      setSelectedGender(currentPreferences.therapistGender || defaultPrefs.therapistGender)
    } else if (isOpen && !currentPreferences && session?.user?.treatmentPreferences) {
      setSelectedGender(session.user.treatmentPreferences.therapistGender || defaultPrefs.therapistGender)
    } else if (isOpen) {
      setSelectedGender(defaultPrefs.therapistGender)
    }
  }, [isOpen, currentPreferences, session?.user?.treatmentPreferences])

  const handleSave = async () => {
    setIsLoading(true)
    const result = await updateTreatmentPreferences({ therapistGender: selectedGender })
    if (result.success && result.treatmentPreferences) {
      toast({ title: "Success", description: "Treatment preferences updated." })
      await updateSession({ treatmentPreferences: result.treatmentPreferences }) // Update session
      onClose()
    } else {
      toast({ title: "Error", description: result.message || "Failed to update preferences.", variant: "destructive" })
    }
    setIsLoading(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Treatment Preferences" // Placeholder, will be translated
      description="Set your preferred therapist gender." // Placeholder, will be translated
    >
      <div className="py-4">
        <Label htmlFor="therapistGender">Preferred Therapist Gender</Label>
        <RadioGroup
          id="therapistGender"
          value={selectedGender}
          onValueChange={(value: ITreatmentPreferences["therapistGender"]) => setSelectedGender(value)}
          className="mt-2 space-y-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="male" id="gender-male" />
            <Label htmlFor="gender-male">Male</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="female" id="gender-female" />
            <Label htmlFor="gender-female">Female</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="any" id="gender-any" />
            <Label htmlFor="gender-any">No Preference</Label>
          </div>
        </RadioGroup>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Preferences"}
        </Button>
      </DialogFooter>
    </Modal>
  )
}
