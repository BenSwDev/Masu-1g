"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/common/ui/alert-dialog"
import { deleteTreatment, toggleTreatmentStatus, duplicateTreatment } from "@/actions/treatment-actions"
import { useToast } from "@/components/common/ui/use-toast"
import { MoreVertical, Edit, Copy, Trash, Power } from "lucide-react"

interface TreatmentCardProps {
  treatment: any
  onEdit: () => void
  onRefresh: () => void
}

export function TreatmentCard({ treatment, onEdit, onRefresh }: TreatmentCardProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleStatus = async () => {
    try {
      setIsLoading(true)
      await toggleTreatmentStatus(treatment._id)
      toast({
        title: treatment.isActive ? t("treatments.deactivateSuccess") : t("treatments.activateSuccess"),
        variant: "default",
      })
      onRefresh()
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("treatments.statusUpdateError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDuplicate = async () => {
    try {
      setIsLoading(true)
      await duplicateTreatment(treatment._id)
      toast({
        title: t("treatments.duplicateSuccess"),
        variant: "default",
      })
      onRefresh()
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("treatments.duplicateError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      await deleteTreatment(treatment._id)
      toast({
        title: t("treatments.deleteSuccess"),
        variant: "default",
      })
      onRefresh()
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("treatments.deleteError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
    }).format(price)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{treatment.name}</CardTitle>
              <CardDescription className="mt-1">{t(`treatments.categories.${treatment.category}`)}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={treatment.isActive ? "default" : "outline"}>
                {treatment.isActive ? t("common.active") : t("common.inactive")}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isLoading}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleStatus}>
                    <Power className="h-4 w-4 mr-2" />
                    {treatment.isActive ? t("common.deactivate") : t("common.activate")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t("common.duplicate")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                    <Trash className="h-4 w-4 mr-2" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {treatment.description && <p className="text-sm text-muted-foreground mb-4">{treatment.description}</p>}

          <div className="space-y-2">
            <div className="text-sm font-medium">{t("treatments.pricing")}:</div>
            {treatment.pricingType === "fixed" ? (
              <div className="flex justify-between text-sm">
                <span>{t("treatments.price")}</span>
                <span className="font-medium">{formatPrice(treatment.fixedPrice || 0)}</span>
              </div>
            ) : (
              <div className="space-y-1">
                {treatment.durations?.map((duration: { minutes: number; price: number; professionalPrice: number; isActive: boolean }) => (
                  <div key={duration.minutes} className="flex justify-between text-sm">
                    <span>
                      {duration.minutes} {t("treatments.minutes")}
                      {!duration.isActive && (
                        <Badge variant="outline" className="ml-2">
                          {t("common.inactive")}
                        </Badge>
                      )}
                    </span>
                    <span className="font-medium">{formatPrice(duration.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <div className="w-full flex justify-end">
            <Button variant="outline" size="sm" onClick={onEdit}>
              {t("common.edit")}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("treatments.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("treatments.deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
              {isLoading ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
