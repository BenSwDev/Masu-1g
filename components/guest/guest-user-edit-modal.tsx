"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useTranslation } from "@/lib/translations/i18n"
import { useToast } from "@/components/common/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Textarea } from "@/components/common/ui/textarea"
import { PhoneInput } from "@/components/common/phone-input"
import { updateGuestUser } from "@/actions/guest-auth-actions"
import { Loader2, User, Mail, Phone, MapPin, Calendar } from "lucide-react"

import type { IUser } from "@/lib/db/models/user"

const guestEditSchema = z.object({
  firstName: z.string().min(2, "שם פרטי חייב להכיל לפחות 2 תווים"),
  lastName: z.string().min(2, "שם משפחה חייב להכיל לפחות 2 תווים"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z.string().min(10, "מספר טלפון חייב להכיל לפחות 10 ספרות"),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type GuestEditFormData = z.infer<typeof guestEditSchema>

interface GuestUserEditModalProps {
  isOpen: boolean
  onClose: () => void
  guestUser: IUser
  onUserUpdated: (updatedUser: IUser) => void
}

export default function GuestUserEditModal({
  isOpen,
  onClose,
  guestUser,
  onUserUpdated
}: GuestUserEditModalProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<GuestEditFormData>({
    resolver: zodResolver(guestEditSchema),
    defaultValues: {
      firstName: guestUser?.firstName || "",
      lastName: guestUser?.lastName || "",
      email: guestUser?.email || "",
      phone: guestUser?.phone || "",
      birthDate: guestUser?.birthDate ? new Date(guestUser.birthDate).toISOString().split('T')[0] : "",
      address: guestUser?.address || "",
      notes: guestUser?.notes || "",
    }
  })

  const phone = watch("phone")

  const handleFormSubmit = async (data: GuestEditFormData) => {
    setIsLoading(true)
    
    try {
      const updateData = {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      }

      const result = await updateGuestUser(guestUser._id, updateData)
      
      if (result.success && result.user) {
        onUserUpdated(result.user)
        toast({
          title: t("guest.editModal.updateSuccess"),
          description: t("guest.editModal.updateSuccessDescription"),
          variant: "default"
        })
        onClose()
      } else {
        toast({
          title: t("common.error"),
          description: result.error || t("guest.editModal.updateError"),
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error updating guest user:", error)
      toast({
        title: t("common.error"),
        description: t("common.unknownError"),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t("guest.editModal.title")}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {t("auth.firstName")}
              </Label>
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder={t("auth.firstNamePlaceholder")}
                disabled={isLoading}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">{t("auth.lastName")}</Label>
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder={t("auth.lastNamePlaceholder")}
                disabled={isLoading}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              {t("auth.email")}
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder={t("auth.emailPlaceholder")}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              {t("auth.phone")}
            </Label>
            <PhoneInput
              value={phone}
              onChange={(value) => setValue("phone", value)}
              placeholder={t("auth.phonePlaceholder")}
              disabled={isLoading}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="birthDate" className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {t("auth.birthDate")} ({t("common.optional")})
            </Label>
            <Input
              id="birthDate"
              type="date"
              {...register("birthDate")}
              disabled={isLoading}
            />
            {errors.birthDate && (
              <p className="text-sm text-destructive">{errors.birthDate.message}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {t("auth.address")} ({t("common.optional")})
            </Label>
            <Input
              id="address"
              {...register("address")}
              placeholder={t("auth.addressPlaceholder")}
              disabled={isLoading}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {t("auth.notes")} ({t("common.optional")})
            </Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder={t("auth.notesPlaceholder")}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 