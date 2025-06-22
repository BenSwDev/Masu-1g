"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Label } from "@/components/common/ui/label"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { getPartnerById } from "@/app/dashboard/(user)/(roles)/admin/partners/actions"
import { User, AlertTriangle } from "lucide-react"
import type { IPartnerProfile } from "@/lib/db/models/partner-profile"
import type { IUser } from "@/lib/db/models/user"

interface PartnerProfileDialogProps {
  partnerId: string
  open: boolean
  onOpenChange: () => void
}

interface PartnerData extends IPartnerProfile {
  _id: string
  userId: IUser
}

export default function PartnerProfileDialog({ partnerId, open, onOpenChange }: PartnerProfileDialogProps) {
  const [partner, setPartner] = useState<PartnerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadPartner()
    } else {
      setPartner(null)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partnerId])

  const loadPartner = async () => {
    setLoading(true)
    try {
      const res = await getPartnerById(partnerId)
      if (res.success && res.partner) {
        const p = res.partner as any
        ;(p as any)._id = p._id.toString()
        setPartner(p)
      } else {
        setError(res.error || "שגיאה בטעינת הנתונים")
      }
    } catch (e) {
      setError("שגיאה בטעינת הנתונים")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            פרופיל שותף
          </DialogTitle>
        </DialogHeader>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading || !partner ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="profile">פרופיל</TabsTrigger>
              <TabsTrigger value="coupons">קופונים</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="space-y-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">שם מלא</Label>
                <p>{partner.userId.name}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">אימייל</Label>
                <p>{partner.userId.email}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">טלפון</Label>
                <p>{partner.userId.phone}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">ח.פ</Label>
                <p>{partner.businessNumber}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">איש קשר</Label>
                <p>{partner.contactName}</p>
              </div>
            </TabsContent>
            <TabsContent value="coupons" className="p-4 text-center text-muted-foreground">
              (בבנייה)
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
