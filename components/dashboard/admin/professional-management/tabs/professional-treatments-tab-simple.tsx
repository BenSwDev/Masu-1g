"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Button } from "@/components/common/ui/button"
import { useToast } from "@/components/common/ui/use-toast"
import { Stethoscope, Save, Loader2 } from "lucide-react"

interface Treatment {
  _id: string
  name: string
  description?: string
  isActive: boolean
}

interface ProfessionalTreatmentsTabProps {
  professional: any
  onUpdate: (professional: any) => void
}

export default function ProfessionalTreatmentsTab({
  professional,
  onUpdate
}: ProfessionalTreatmentsTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [allTreatments, setAllTreatments] = useState<Treatment[]>([])
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load all treatments
  useEffect(() => {
    const fetchTreatments = async () => {
      try {
        const response = await fetch('/api/treatments')
        const data = await response.json()
        
        if (data.success) {
          setAllTreatments(data.treatments || [])
          // Set selected treatments based on professional's current treatments
          const currentTreatmentIds = professional?.treatments?.map((t: any) => t.treatmentId || t._id) || []
          setSelectedTreatments(currentTreatmentIds)
        }
      } catch (error) {
        console.error('Error fetching treatments:', error)
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: "שגיאה בטעינת רשימת הטיפולים"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTreatments()
  }, [professional, toast])

  const handleTreatmentToggle = (treatmentId: string, checked: boolean) => {
    setSelectedTreatments(prev => {
      if (checked) {
        return [...prev, treatmentId]
      } else {
        return prev.filter(id => id !== treatmentId)
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update professional's treatments
      const updatedTreatments = selectedTreatments.map(treatmentId => {
        const treatment = allTreatments.find(t => t._id === treatmentId)
        return {
          treatmentId,
          treatmentName: treatment?.name,
          professionalPrice: 0 // Default price, can be edited later
        }
      })

      if (professional?._id) {
        const { updateProfessionalTreatments } = await import("@/actions/professional-actions")
        const result = await updateProfessionalTreatments(professional._id, updatedTreatments)
        if (!result.success) {
          throw new Error(result.error || "Failed to update treatments")
        }
      }

      const updatedProfessional = {
        ...professional,
        treatments: updatedTreatments
      }

      onUpdate(updatedProfessional)
      
      toast({
        title: "הצלחה",
        description: "הטיפולים עודכנו בהצלחה"
      })
    } catch (error) {
      console.error('Error saving treatments:', error)
      toast({
        variant: "destructive",
        title: "שגיאה", 
        description: "שגיאה בשמירת הטיפולים"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="mr-2">טוען טיפולים...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={dir}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              בחירת טיפולים
            </CardTitle>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              שמור
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {allTreatments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Stethoscope className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">אין טיפולים במערכת</h3>
              <p className="text-sm">צריך להוסיף טיפולים במערכת קודם</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                בחר את הטיפולים שהמטפל יכול לבצע ({selectedTreatments.length} נבחרו)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allTreatments.map((treatment) => (
                  <div 
                    key={treatment._id}
                    className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      id={treatment._id}
                      checked={selectedTreatments.includes(treatment._id)}
                      onCheckedChange={(checked) => 
                        handleTreatmentToggle(treatment._id, checked as boolean)
                      }
                    />
                    <label 
                      htmlFor={treatment._id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 text-right"
                    >
                      {treatment.name}
                    </label>
                  </div>
                ))}
              </div>
              
              {selectedTreatments.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">טיפולים נבחרים:</h4>
                  <div className="text-sm text-blue-700">
                    {selectedTreatments.map(treatmentId => {
                      const treatment = allTreatments.find(t => t._id === treatmentId)
                      return treatment?.name
                    }).join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 