"use client"

import { Button } from "@/components/common/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/common/ui/dialog"
import { useTranslation } from "@/lib/translations/i18n"
import { useState } from "react"
import { toast } from "@/components/common/ui/use-toast"
import { adminDeleteUser } from "@/actions/admin-actions"

interface UserData {
  id: string
  name: string
}

interface DeleteUserConfirmationModalProps {
  userToDelete: UserData | null
  isOpen: boolean
  setOpen: (open: boolean) => void
  onUserDeleted: () => void
}

export function DeleteUserConfirmationModal({
  userToDelete,
  isOpen,
  setOpen,
  onUserDeleted,
}: DeleteUserConfirmationModalProps) {
  const { t, language } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (!userToDelete) return
    setIsLoading(true)
    try {
      const result = await adminDeleteUser(userToDelete.id)
      if (result.success) {
        toast({
          title: t("admin.users.userForm.userDeletedSuccess"),
          variant: "default",
        })
        onUserDeleted()
        setOpen(false)
      } else {
        toast({
          title: t("errors.error"),
          description: t(result.message as any) || t("admin.users.userForm.errorDeletingUser"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("errors.error"),
        description: t("errors.unknown"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!userToDelete) return null

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px] bg-white text-gray-800" dir={language === "he" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="text-red-600">{t("admin.users.deleteConfirmation.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.users.deleteConfirmation.message", { userName: userToDelete.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
              {t("common.cancel")}
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {isLoading ? t("common.loading") : t("admin.users.deleteConfirmation.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
