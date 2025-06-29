"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { updateTreatment, deleteTreatment, toggleTreatmentStatus, createTreatment } from "@/app/dashboard/(user)/(roles)/admin/treatments/actions"
import { useToast } from "@/components/ui/use-toast"
import { MoreVertical, Edit, Copy, Trash, Power } from "lucide-react"

interface TreatmentCardProps {
  treatment: any
  onEdit: () => void
  onRefresh: () => void
}

export function TreatmentCard({ treatment, onEdit, onRefresh }: TreatmentCardProps) {
  const { t, dir } = useTranslation()
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
      // Create a duplicate treatment with modified name
      const duplicateData = {
        ...treatment,
        name: `${treatment.name} (Copy)`,
        _id: undefined, // Remove _id to create new
        createdAt: undefined,
        updatedAt: undefined,
      }
      await createTreatment(duplicateData)
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
      <Card className="transition-all duration-200 hover:shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">{treatment.name}</CardTitle>
              <CardDescription className="text-sm">{t(`treatments.categories.${treatment.category}`)}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={treatment.isActive ? "default" : "outline"} className="capitalize">
                {treatment.isActive ? t("common.active") : t("common.inactive")}
              </Badge>
              {treatment.allowTherapistGenderSelection && (
                <Badge variant="secondary" className="text-xs">
                  {t("treatments.fields.allowTherapistGenderSelection")}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isLoading} className="hover:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={dir === 'rtl' ? 'start' : 'end'} className="w-48">
                  <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                    <Edit className="h-4 w-4 mr-2" />
                    {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleStatus} className="cursor-pointer">
                    <Power className="h-4 w-4 mr-2" />
                    {treatment.isActive ? t("common.deactivate") : t("common.activate")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate} className="cursor-pointer">
                    <Copy className="h-4 w-4 mr-2" />
                    {t("common.duplicate")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive cursor-pointer">
                    <Trash className="h-4 w-4 mr-2" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {treatment.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{treatment.description}</p>
          )}

          <div className="space-y-3">
            <div className="text-sm font-medium">{t("treatments.pricing")}:</div>
            {treatment.pricingType === "fixed" ? (
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">{t("treatments.price")}</span>
                <span className="font-medium">{formatPrice(treatment.fixedPrice || 0)}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {treatment.durations?.map((duration: { minutes: number; price: number; professionalPrice: number; isActive: boolean }) => (
                  <div key={duration.minutes} className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">
                      {duration.minutes} {t("treatments.minutes")}
                      {!duration.isActive && (
                        <Badge variant="outline" className="ml-2 text-xs">
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
        <CardFooter className="pt-4">
          <div className="w-full flex justify-end">
            <Button variant="outline" size="sm" onClick={onEdit} className="hover:bg-muted">
              {t("common.edit")}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("treatments.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("treatments.deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
              {isLoading ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
