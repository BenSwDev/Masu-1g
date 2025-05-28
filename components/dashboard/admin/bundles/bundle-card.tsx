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
import { deleteBundle, toggleBundleStatus, duplicateBundle } from "@/actions/bundle-actions"
import { useToast } from "@/components/common/ui/use-toast"
import { MoreVertical, Edit, Copy, Trash, Power } from "lucide-react"

interface BundleCardProps {
  bundle: any
  onEdit: () => void
  onRefresh: () => void
}

export function BundleCard({ bundle, onEdit, onRefresh }: BundleCardProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleStatus = async () => {
    try {
      setIsLoading(true)
      await toggleBundleStatus(bundle._id)
      toast({
        title: bundle.isActive ? t("bundles.deactivateSuccess") : t("bundles.activateSuccess"),
        variant: "success",
      })
      onRefresh()
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("bundles.statusUpdateError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDuplicate = async () => {
    try {
      setIsLoading(true)
      await duplicateBundle(bundle._id)
      toast({
        title: t("bundles.duplicateSuccess"),
        variant: "success",
      })
      onRefresh()
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("bundles.duplicateError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      await deleteBundle(bundle._id)
      toast({
        title: t("bundles.deleteSuccess"),
        variant: "success",
      })
      onRefresh()
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("bundles.deleteError"),
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

  const calculateDiscount = () => {
    if (bundle.discountType === "percentage") {
      return `${bundle.discountValue}%`
    } else if (bundle.discountType === "fixed") {
      return formatPrice(bundle.discountValue)
    }
    return ""
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{bundle.name}</CardTitle>
              <CardDescription className="mt-1">
                {bundle.category && t(`bundles.categories.${bundle.category}`)}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={bundle.isActive ? "default" : "outline"}>
                {bundle.isActive ? t("common.active") : t("common.inactive")}
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
                    {bundle.isActive ? t("common.deactivate") : t("common.activate")}
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
          {bundle.description && <p className="text-sm text-muted-foreground mb-4">{bundle.description}</p>}

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>{t("bundles.quantity")}</span>
              <span className="font-medium">{bundle.quantity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t("bundles.validity")}</span>
              <span className="font-medium">
                {bundle.validityMonths} {t("bundles.months")}
              </span>
            </div>
            {bundle.discountType && bundle.discountValue > 0 && (
              <div className="flex justify-between text-sm">
                <span>{t("bundles.discount")}</span>
                <span className="font-medium">{calculateDiscount()}</span>
              </div>
            )}
          </div>

          {bundle.treatments && bundle.treatments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">{t("bundles.includedTreatments")}</h4>
              <ul className="text-sm space-y-1">
                {bundle.treatments.map((treatment: any) => (
                  <li key={treatment._id || treatment.id} className="flex justify-between">
                    <span>{treatment.name}</span>
                    {treatment.count > 1 && <span className="font-medium">x{treatment.count}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
            <AlertDialogTitle>{t("bundles.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("bundles.deleteConfirmDescription")}</AlertDialogDescription>
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
