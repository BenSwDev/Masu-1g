"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { Label } from "@/components/common/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useToast } from "@/components/common/ui/use-toast"
import { User, Save } from "lucide-react"

interface ProfessionalBasicInfoTabProps {
  professional: any
  onUpdate: (professional: any) => void
  loading: boolean
  isCreatingNew?: boolean
}

export default function ProfessionalBasicInfoTab({
  professional,
  onUpdate,
  loading,
  isCreatingNew = false
}: ProfessionalBasicInfoTabProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  
  // Form state for creating new professional
  const [formData, setFormData] = useState({
    name: professional?.userId?.name || "",
    email: professional?.userId?.email || "",
    phone: professional?.userId?.phone || "",
    gender: professional?.userId?.gender || "male",
    password: "",
    specialization: professional?.specialization || "",
    experience: professional?.experience || "",
    bio: professional?.bio || ""
  })

  const handleCreateProfessional = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "נא למלא את כל השדות הנדרשים"
      })
      return
    }

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("name", formData.name)
      formDataToSend.append("email", formData.email)
      formDataToSend.append("phone", formData.phone)
      formDataToSend.append("gender", formData.gender)
      formDataToSend.append("password", formData.password)
      formDataToSend.append("specialization", formData.specialization)
      formDataToSend.append("experience", formData.experience)
      formDataToSend.append("bio", formData.bio)

      const { createProfessional } = await import("@/actions/professional-actions")
      const result = await createProfessional(formDataToSend)
      
      if (result.success && result.professional) {
        toast({
          title: "הצלחה",
          description: "המטפל נוצר בהצלחה"
        })
        // Update the professional with the created data
        onUpdate(result.professional)
      } else {
        toast({
          variant: "destructive",
          title: "שגיאה",
          description: result.error || "שגיאה ביצירת המטפל"
        })
      }
    } catch (error) {
      console.error("Error creating professional:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה ביצירת המטפל"
      })
    }
  }

  if (isCreatingNew) {
    return (
      <div className="space-y-6" dir={dir}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              פרטי המטפל החדש
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">שם מלא *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="הכנס שם מלא"
                />
              </div>
              
              <div>
                <Label htmlFor="email">אימייל *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="הכנס כתובת אימייל"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">טלפון *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="הכנס מספר טלפון"
                />
              </div>
              
              <div>
                <Label htmlFor="password">סיסמה *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="הכנס סיסמה"
                />
              </div>
              
              <div>
                <Label htmlFor="gender">מגדר *</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">זכר</SelectItem>
                    <SelectItem value="female">נקבה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="specialization">התמחות</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                  placeholder="הכנס התמחות"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="experience">ניסיון</Label>
                <Textarea
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                  placeholder="תיאור ניסיון מקצועי"
                  rows={3}
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="bio">אודות</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="תיאור אישי קצר"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={handleCreateProfessional}
                disabled={loading || !formData.name || !formData.email || !formData.phone || !formData.password}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                צור מטפל
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Edit existing professional
  return (
    <div className="space-y-6" dir={dir}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            פרטי המטפל
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">שם מלא</Label>
              <div className="mt-1 text-sm">{professional?.userId?.name}</div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">אימייל</Label>
              <div className="mt-1 text-sm">{professional?.userId?.email}</div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">טלפון</Label>
              <div className="mt-1 text-sm">{professional?.userId?.phone}</div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">מגדר</Label>
              <div className="mt-1 text-sm">
                {professional?.userId?.gender === 'male' ? 'זכר' : 'נקבה'}
              </div>
            </div>
            
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">התמחות</Label>
              <div className="mt-1 text-sm">{professional?.specialization || 'לא צוין'}</div>
            </div>
            
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">ניסיון</Label>
              <div className="mt-1 text-sm">{professional?.experience || 'לא צוין'}</div>
            </div>
            
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">אודות</Label>
              <div className="mt-1 text-sm">{professional?.bio || 'לא צוין'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 