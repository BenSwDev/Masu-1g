"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import type { IAddress } from "@/lib/db/models/address"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { MapPin, Edit, Trash2, Star } from "lucide-react"
import { setDefaultAddress, deleteAddress } from "@/actions/address-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/common/ui/alert-dialog"
import { useQueryClient } from "@tanstack/react-query"

interface AddressCardProps {
  address: IAddress
  onEdit: (address: IAddress) => void
}

export function AddressCard({ address, onEdit }: AddressCardProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const handleSetDefault = async () => {
    if (!address._id) return
    
    const result = await setDefaultAddress(String(address._id))
    if (result.success) {
      toast.success(t("addresses.setDefaultSuccess"))
      queryClient.invalidateQueries({ queryKey: ["addresses"] })
    } else {
      toast.error(result.error)
    }
  }

  const handleDelete = async () => {
    if (!address._id) return
    
    const result = await deleteAddress(String(address._id))
    if (result.success) {
      toast.success(t("addresses.deleteSuccess"))
      queryClient.invalidateQueries({ queryKey: ["addresses"] })
    } else {
      toast.error(result.error)
    }
  }

  // Compose the main address line
  const mainLine =
    [address.street, address.streetNumber, address.city]
      .filter((v) => typeof v === "string" && v.trim() !== "")
      .join(" ") || t("addresses.noDetails")

  // Compose details
  const details: string[] = []
  if (address.addressType === "apartment" && address.apartmentDetails) {
    if (address.apartmentDetails.floor !== undefined && address.apartmentDetails.floor !== null) {
      details.push(`${t("addresses.fields.floor")}: ${address.apartmentDetails.floor}`)
    }
    if (address.apartmentDetails.apartmentNumber) {
      details.push(`${t("addresses.fields.apartmentNumber")}: ${address.apartmentDetails.apartmentNumber}`)
    }
    if (address.apartmentDetails.entrance) {
      details.push(`${t("addresses.fields.entrance")}: ${address.apartmentDetails.entrance}`)
    }
  }
  if (address.addressType === "house" && address.houseDetails) {
    if (address.houseDetails.doorName) {
      details.push(`${t("addresses.fields.doorName")}: ${address.houseDetails.doorName}`)
    }
    if (address.houseDetails.entrance) {
      details.push(`${t("addresses.fields.entrance")}: ${address.houseDetails.entrance}`)
    }
  }
  if (address.addressType === "office" && address.officeDetails) {
    if (address.officeDetails.buildingName) {
      details.push(`${t("addresses.fields.buildingName")}: ${address.officeDetails.buildingName}`)
    }
    if (address.officeDetails.floor !== undefined && address.officeDetails.floor !== null) {
      details.push(`${t("addresses.fields.floor")}: ${address.officeDetails.floor}`)
    }
    if (address.officeDetails.entrance) {
      details.push(`${t("addresses.fields.entrance")}: ${address.officeDetails.entrance}`)
    }
  }
  if (address.addressType === "hotel" && address.hotelDetails) {
    if (address.hotelDetails.hotelName) {
      details.push(`${t("addresses.fields.hotelName")}: ${address.hotelDetails.hotelName}`)
    }
    if (address.hotelDetails.roomNumber) {
      details.push(`${t("addresses.fields.roomNumber")}: ${address.hotelDetails.roomNumber}`)
    }
  }
  if (address.addressType === "other" && address.otherDetails?.instructions) {
    details.push(`${t("addresses.fields.instructions")}: ${address.otherDetails.instructions}`)
  }
  if (address.hasPrivateParking) {
    details.push(t("addresses.fields.hasPrivateParking"))
  }
  if (address.additionalNotes) {
    details.push(`${t("addresses.fields.additionalNotes")}: ${address.additionalNotes}`)
  }

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2 flex flex-col items-start gap-2">
        <div className="flex items-center gap-2 w-full">
          <CardTitle className="text-lg font-bold flex-1">{mainLine}</CardTitle>
          <MapPin className="h-5 w-5 text-turquoise-500" />
        </div>
        <CardDescription className="text-turquoise-700 font-medium">
          {t(`addresses.types.${address.addressType}`)}
        </CardDescription>
        {address.isDefault && (
          <Badge className="bg-turquoise-500 text-white text-xs px-3 py-1 rounded-full mt-1">
            {t("addresses.fields.isDefault")}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-1 text-sm text-gray-600">
          {details.length > 0 ? (
            details.map((detail, index) => (
              <p key={index} className="text-sm text-muted-foreground">
                {detail}
              </p>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t("addresses.noDetails")}</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-row-reverse justify-between gap-2 pt-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(address)}
            disabled={isLoading}
            className="hover:bg-turquoise-50"
          >
            <Edit className="h-4 w-4 ml-2" />
            {t("common.edit")}
          </Button>
          {!address.isDefault && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetDefault}
              disabled={isLoading}
              className="hover:bg-turquoise-50"
            >
              <Star className="h-4 w-4 ml-2" />
              {t("addresses.fields.isDefault")}
            </Button>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isLoading} className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 ml-2" />
              {t("common.delete")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("addresses.deleteConfirm")}</AlertDialogTitle>
              <AlertDialogDescription>{t("addresses.deleteConfirmDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>{t("common.delete")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
