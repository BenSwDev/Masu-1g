"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Textarea } from "@/components/common/ui/textarea"
import { Switch } from "@/components/common/ui/switch"
import { useToast } from "@/components/common/ui/use-toast"
import { User, Save, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import { updateProfessionalProfile } from "@/app/dashboard/(user)/(roles)/admin/professional-management/actions"
import type { Professional, ProfessionalTabProps } from "@/lib/types/professional"

export default function ProfessionalProfileTab({
  professional,
  onUpdate,
  loading,
  isCreatingNew = false,
  onCreated
}: ProfessionalTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    specialization: professional?.specialization || "",
    experience: professional?.experience || "",
    certifications: professional?.certifications || [],
    bio: professional?.bio || "",
    profileImage: professional?.profileImage || "",
    isActive: professional?.isActive ?? true
  })
  
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleCertificationChange = (index: number, value: string) => {
    const newCertifications = [...formData.certifications]
    newCertifications[index] = value
    handleFieldChange('certifications', newCertifications)
  }

  const addCertification = () => {
    handleFieldChange('certifications', [...formData.certifications, ''])
  }

  const removeCertification = (index: number) => {
    const newCertifications = formData.certifications.filter((_, i) => i !== index)
    handleFieldChange('certifications', newCertifications)
  }

  const handleSave = async () => {
    if (!hasChanges || saving || isCreatingNew) return
    
    setSaving(true)
    
    try {
      const result = await updateProfessionalProfile(professional._id, {
        specialization: formData.specialization.trim(),
        experience: formData.experience.trim(),
        certifications: formData.certifications.filter(cert => cert.trim().length > 0),
        bio: formData.bio.trim(),
        profileImage: formData.profileImage.trim()
      })
      
      if (result.success && result.professional) {
        toast({
          title: "הצלחה",
          description: "פרופיל המטפל עודכן בהצלחה"
        })
        
        // Update parent component with new data
        onUpdate(result.professional)
        setHasChanges(false)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה בעדכון הפרופיל"
        })
      }
    } catch (error) {
      console.error("Error updating professional profile:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בעדכון הפרופיל"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5" />
          <h3 className="text-lg font-semibold">פרופיל מטפל</h3>
        </div>
        {!isCreatingNew && (
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "שומר..." : "שמור שינויים"}
          </Button>
        )}
      </div>

      {isCreatingNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">מטפל חדש</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            נתוני הפרופיל יישמרו לאחר יצירת המטפל בטאב הראשי
          </p>
        </div>
      )}

      <div className="grid gap-6">
        {/* Basic Professional Info */}
        <Card>
          <CardHeader>
            <CardTitle>מידע מקצועי בסיסי</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialization">התמחות</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleFieldChange('specialization', e.target.value)}
                  placeholder="לדוגמה: עיסוי רפואי, פיזיותרפיה"
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="experience">ניסיון מקצועי</Label>
                <Input
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => handleFieldChange('experience', e.target.value)}
                  placeholder="לדוגמה: 5 שנות ניסיון"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">תיאור מקצועי</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleFieldChange('bio', e.target.value)}
                placeholder="תיאור קצר על הרקע המקצועי והשירותים שהמטפל מציע..."
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileImage">תמונת פרופיל (URL)</Label>
              <Input
                id="profileImage"
                type="url"
                value={formData.profileImage}
                onChange={(e) => handleFieldChange('profileImage', e.target.value)}
                placeholder="https://example.com/profile-image.jpg"
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              תעודות והסמכות
              <Button
                variant="outline"
                size="sm"
                onClick={addCertification}
                disabled={loading}
              >
                הוסף תעודה
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.certifications.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                לא נוספו תעודות עדיין
              </p>
            ) : (
              formData.certifications.map((cert, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={cert}
                    onChange={(e) => handleCertificationChange(index, e.target.value)}
                    placeholder="שם התעודה או ההסמכה"
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeCertification(index)}
                    disabled={loading}
                    className="px-3"
                  >
                    הסר
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Status */}
        {!isCreatingNew && (
          <Card>
            <CardHeader>
              <CardTitle>סטטוס פעילות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive">מטפל פעיל</Label>
                  <p className="text-sm text-muted-foreground">
                    קובע האם המטפל יופיע בחיפושים ויוכל לקבל הזמנות
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleFieldChange('isActive', checked)}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {hasChanges && !isCreatingNew && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">יש שינויים שלא נשמרו</span>
          </div>
          <p className="text-orange-700 text-sm mt-1">
            לא לשכוח לשמור את השינויים לפני מעבר לטאב אחר
          </p>
        </div>
      )}
    </div>
  )
} 