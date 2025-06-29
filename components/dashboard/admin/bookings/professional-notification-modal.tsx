"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Send, Mail, MessageSquare, User, Phone, MapPin, Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import type { PopulatedBooking } from "@/types/booking"

interface Professional {
  _id: string
  name: string
  email?: string
  phone?: string
  gender?: string
  profileId: string
  workAreas?: any[]
  treatments?: any[]
  isOnline?: boolean
  lastSeen?: Date
}

interface ProfessionalNotificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: PopulatedBooking
  onSuccess?: () => void
}

interface NotificationPreferences {
  email: boolean
  sms: boolean
}

export function ProfessionalNotificationModal({
  open,
  onOpenChange,
  booking,
  onSuccess
}: ProfessionalNotificationModalProps) {
  const { toast } = useToast()
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [suitableProfessionals, setSuitableProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedProfessionals, setSelectedProfessionals] = useState<Set<string>>(new Set())
  const [notificationPreferences, setNotificationPreferences] = useState<Record<string, NotificationPreferences>>({})
  const [showAll, setShowAll] = useState(false)

  // Load professionals when modal opens
  useEffect(() => {
    if (open && booking) {
      loadProfessionals()
    }
  }, [open, booking])

  const loadProfessionals = async () => {
    setLoading(true)
    try {
      // Load suitable professionals first
      const suitableResponse = await fetch(`/api/admin/bookings/${booking._id}/suitable-professionals`)
      const suitableData = await suitableResponse.json()
      
      let suitableProfs: Professional[] = []
      if (suitableData.success && suitableData.professionals) {
        suitableProfs = suitableData.professionals
        setSuitableProfessionals(suitableProfs)
        
        // Pre-select all suitable professionals
        const suitableIds = new Set(suitableProfs.map(p => p._id))
        setSelectedProfessionals(suitableIds)
        
        // Set default notification preferences (both email and SMS)
        const defaultPrefs: Record<string, NotificationPreferences> = {}
        suitableProfs.forEach(prof => {
          defaultPrefs[prof._id] = {
            email: !!prof.email,
            sms: !!prof.phone
          }
        })
        setNotificationPreferences(defaultPrefs)
      }
      
      // Load all professionals as fallback
      const allResponse = await fetch(`/api/admin/professionals/available`)
      const allData = await allResponse.json()
      
      if (allData.success && allData.professionals) {
        setProfessionals(allData.professionals)
        
        // Add notification preferences for all professionals
        const allPrefs = { ...notificationPreferences }
        allData.professionals.forEach((prof: Professional) => {
          if (!allPrefs[prof._id]) {
            allPrefs[prof._id] = {
              email: !!prof.email,
              sms: !!prof.phone
            }
          }
        })
        setNotificationPreferences(allPrefs)
      }
      
    } catch (error) {
      console.error("Error loading professionals:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "שגיאה בטעינת רשימת המטפלים"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleProfessionalToggle = (professionalId: string) => {
    const newSelected = new Set(selectedProfessionals)
    if (newSelected.has(professionalId)) {
      newSelected.delete(professionalId)
    } else {
      newSelected.add(professionalId)
    }
    setSelectedProfessionals(newSelected)
  }

  const handleNotificationPreferenceChange = (
    professionalId: string, 
    type: 'email' | 'sms', 
    enabled: boolean
  ) => {
    setNotificationPreferences(prev => ({
      ...prev,
      [professionalId]: {
        ...prev[professionalId],
        [type]: enabled
      }
    }))
  }

  const handleSelectAll = (professionals: Professional[]) => {
    const allIds = professionals.map(p => p._id)
    setSelectedProfessionals(new Set([...selectedProfessionals, ...allIds]))
  }

  const handleDeselectAll = (professionals: Professional[]) => {
    const idsToRemove = new Set(professionals.map(p => p._id))
    setSelectedProfessionals(new Set([...selectedProfessionals].filter(id => !idsToRemove.has(id))))
  }

  const handleSendNotifications = async () => {
    if (selectedProfessionals.size === 0) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "נא לבחור לפחות מטפל אחד"
      })
      return
    }

    setSending(true)
    try {
      // Prepare notification data
      const notificationData = {
        bookingId: booking._id,
        professionals: Array.from(selectedProfessionals).map(profId => ({
          professionalId: profId,
          email: notificationPreferences[profId]?.email || false,
          sms: notificationPreferences[profId]?.sms || false
        }))
      }

      const response = await fetch(`/api/admin/bookings/${booking._id}/notify-professionals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData)
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "הצלחה",
          description: `התראות נשלחו בהצלחה ל-${result.sentCount || selectedProfessionals.size} מטפלים`
        })
        onSuccess?.()
        onOpenChange(false)
      } else {
        throw new Error(result.error || "שגיאה בשליחת התראות")
      }
    } catch (error) {
      console.error("Error sending notifications:", error)
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: error instanceof Error ? error.message : "שגיאה בשליחת התראות"
      })
    } finally {
      setSending(false)
    }
  }

  const professionalsList = showAll ? professionals : suitableProfessionals
  const isSuitable = (professionalId: string) => suitableProfessionals.some(p => p._id === professionalId)

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>שליחת התראות למטפלים</DialogTitle>
            <DialogDescription>טוען רשימת מטפלים...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            שליחת התראות למטפלים
          </DialogTitle>
          <DialogDescription>
            בחר מטפלים ואמצעי התראה עבור הזמנה #{booking.bookingNumber}
          </DialogDescription>
        </DialogHeader>

        {/* Booking Summary */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{booking.recipientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{booking.bookingAddressSnapshot?.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(booking.bookingDateTime).toLocaleDateString('he-IL')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {(booking.treatmentId as any)?.name || 'טיפול'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toggle between suitable and all professionals */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant={!showAll ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAll(false)}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              מטפלים מתאימים ({suitableProfessionals.length})
            </Button>
            <Button
              variant={showAll ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAll(true)}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              כל המטפלים ({professionals.length})
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAll(professionalsList)}
              disabled={professionalsList.length === 0}
            >
              בחר הכל
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeselectAll(professionalsList)}
              disabled={selectedProfessionals.size === 0}
            >
              בטל הכל
            </Button>
          </div>
        </div>

        {/* Professionals List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {professionalsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>לא נמצאו מטפלים</p>
            </div>
          ) : (
            professionalsList.map((professional) => (
              <Card 
                key={professional._id} 
                className={`transition-colors ${
                  selectedProfessionals.has(professional._id) 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Selection Checkbox */}
                    <Checkbox
                      checked={selectedProfessionals.has(professional._id)}
                      onCheckedChange={() => handleProfessionalToggle(professional._id)}
                      className="mt-1"
                    />

                    {/* Professional Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{professional.name}</span>
                        {isSuitable(professional._id) && (
                          <Badge variant="secondary" className="text-xs">
                            מתאים
                          </Badge>
                        )}
                        {professional.gender && (
                          <Badge variant="outline" className="text-xs">
                            {professional.gender === "male" ? "גבר" : "אישה"}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {professional.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{professional.phone}</span>
                          </div>
                        )}
                        {professional.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{professional.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Notification Preferences */}
                      {selectedProfessionals.has(professional._id) && (
                        <div className="flex items-center gap-4 pt-2 border-t">
                          <span className="text-sm font-medium">שלח התראה:</span>
                          
                          {professional.email && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={notificationPreferences[professional._id]?.email || false}
                                onCheckedChange={(checked) => 
                                  handleNotificationPreferenceChange(professional._id, 'email', !!checked)
                                }
                              />
                              <Mail className="h-4 w-4" />
                              <span className="text-sm">אימייל</span>
                            </label>
                          )}
                          
                          {professional.phone && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={notificationPreferences[professional._id]?.sms || false}
                                onCheckedChange={(checked) => 
                                  handleNotificationPreferenceChange(professional._id, 'sms', !!checked)
                                }
                              />
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-sm">SMS</span>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Separator />

        {/* Summary and Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            נבחרו {selectedProfessionals.size} מטפלים
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSendNotifications}
              disabled={sending || selectedProfessionals.size === 0}
              className="flex items-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  שלח התראות ({selectedProfessionals.size})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
