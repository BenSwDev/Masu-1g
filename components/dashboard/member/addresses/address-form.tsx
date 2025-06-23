"use client"

import type React from "react"
import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import type { IAddress } from "@/lib/db/models/address"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Textarea } from "@/components/common/ui/textarea"
import { Checkbox } from "@/components/common/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { CitySelect } from "@/components/common/ui/city-select"
import { createAddress, updateAddress } from "@/actions/address-actions"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

interface AddressFormProps {
  address?: IAddress
  onCancel: () => void
  onSuccess?: (newAddress: IAddress) => void // New prop
}

export function AddressForm({ address, onCancel, onSuccess }: AddressFormProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [addressType, setAddressType] = useState(address?.addressType || "apartment")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const data: Partial<IAddress> & { addressType: IAddress["addressType"] } = {
        // Ensure addressType is always present
        city: formData.get("city")?.toString() || "",
        street: formData.get("street")?.toString() || "",
        streetNumber: formData.get("streetNumber")?.toString() || "",
        addressType: formData.get("addressType") as IAddress["addressType"],
        hasPrivateParking: formData.get("hasPrivateParking") === "on",
        additionalNotes: formData.get("additionalNotes")?.toString() || "",
        isDefault: formData.get("isDefault") === "on",
      }

      // Add type-specific details
      switch (data.addressType) {
        case "apartment":
          data.apartmentDetails = {
            floor: formData.get("floor") ? Number.parseInt(formData.get("floor") as string) : undefined,
            apartmentNumber: formData.get("apartmentNumber") as string,
            entrance: formData.get("entrance") as string,
          }
          break
        case "house":
          data.houseDetails = {
            doorName: formData.get("doorName") as string,
            entrance: formData.get("entrance") as string,
          }
          break
        case "office":
          data.officeDetails = {
            buildingName: formData.get("buildingName") as string,
            entrance: formData.get("entrance") as string,
            floor: formData.get("floor") ? Number.parseInt(formData.get("floor") as string) : undefined,
          }
          break
        case "hotel":
          data.hotelDetails = {
            hotelName: formData.get("hotelName") as string,
            roomNumber: formData.get("roomNumber") as string,
          }
          break
        case "other":
          data.otherDetails = {
            instructions: formData.get("instructions") as string,
          }
          break
      }

      const result = address
        ? await updateAddress(address._id.toString(), data as IAddress) // Cast needed due to partial nature for creation
        : await createAddress(data as IAddress) // Cast needed

      if (result.success && result.address) {
        toast.success(address ? t("addresses.updateSuccess") : t("addresses.createSuccess"))
        queryClient.invalidateQueries({ queryKey: ["addresses"] })

        if (onSuccess) {
          onSuccess(result.address)
        } else {
          onCancel() // Fallback to close if no onSuccess (e.g. from main addresses page)
        }
        // Reset form state if needed (though component might unmount)
        setAddressType("apartment")
      } else {
        toast.error(result.error || (address ? t("addresses.updateError") : t("addresses.createError")))
      }
    } catch (error) {
      toast.error(address ? t("addresses.updateError") : t("addresses.createError"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="city">{t("addresses.fields.city")}</Label>
          <CitySelect 
            id="city" 
            name="city" 
            defaultValue={address?.city} 
            required 
            className="focus:ring-turquoise-500"
            placeholder={t("addresses.fields.cityPlaceholder") || "×‘×—×¨ ×¢×™×¨"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="street">{t("addresses.fields.street")}</Label>
          <Input
            id="street"
            name="street"
            defaultValue={address?.street}
            required
            className="focus:ring-turquoise-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="streetNumber">{t("addresses.fields.streetNumber")}</Label>
          <Input
            id="streetNumber"
            name="streetNumber"
            defaultValue={address?.streetNumber}
            required
            className="focus:ring-turquoise-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="addressType">{t("addresses.fields.addressType")}</Label>
          <Select name="addressType" defaultValue={addressType} onValueChange={setAddressType}>
            <SelectTrigger className="focus:ring-turquoise-500">
              <SelectValue placeholder={t("addresses.fields.addressTypePlaceholder", "Select address type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apartment">{t("addresses.types.apartment")}</SelectItem>
              <SelectItem value="house">{t("addresses.types.house")}</SelectItem>
              <SelectItem value="office">{t("addresses.types.office")}</SelectItem>
              <SelectItem value="hotel">{t("addresses.types.hotel")}</SelectItem>
              <SelectItem value="other">{t("addresses.types.other")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Type-specific fields */}
      {addressType === "apartment" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="floor">{t("addresses.fields.floor")}</Label>
            <Input
              id="floor"
              name="floor"
              type="number"
              defaultValue={address?.apartmentDetails?.floor?.toString()}
              className="focus:ring-turquoise-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apartmentNumber">{t("addresses.fields.apartmentNumber")}</Label>
            <Input
              id="apartmentNumber"
              name="apartmentNumber"
              defaultValue={address?.apartmentDetails?.apartmentNumber}
              className="focus:ring-turquoise-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entrance">{t("addresses.fields.entrance")}</Label>
            <Input
              id="entrance"
              name="entrance"
              defaultValue={address?.apartmentDetails?.entrance}
              className="focus:ring-turquoise-500"
            />
          </div>
        </div>
      )}

      {addressType === "house" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="doorName">{t("addresses.fields.doorName")}</Label>
            <Input
              id="doorName"
              name="doorName"
              defaultValue={address?.houseDetails?.doorName}
              className="focus:ring-turquoise-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entrance">{t("addresses.fields.entrance")}</Label>
            <Input
              id="entrance"
              name="entrance"
              defaultValue={address?.houseDetails?.entrance}
              className="focus:ring-turquoise-500"
            />
          </div>
        </div>
      )}

      {addressType === "office" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="buildingName">{t("addresses.fields.buildingName")}</Label>
            <Input
              id="buildingName"
              name="buildingName"
              defaultValue={address?.officeDetails?.buildingName}
              className="focus:ring-turquoise-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entrance">{t("addresses.fields.entrance")}</Label>
            <Input
              id="entrance"
              name="entrance"
              defaultValue={address?.officeDetails?.entrance}
              className="focus:ring-turquoise-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="floor">{t("addresses.fields.floor")}</Label>
            <Input
              id="floor"
              name="floor"
              type="number"
              defaultValue={address?.officeDetails?.floor?.toString()}
              className="focus:ring-turquoise-500"
            />
          </div>
        </div>
      )}

      {addressType === "hotel" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="hotelName">{t("addresses.fields.hotelName")}</Label>
            <Input
              id="hotelName"
              name="hotelName"
              defaultValue={address?.hotelDetails?.hotelName}
              className="focus:ring-turquoise-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roomNumber">{t("addresses.fields.roomNumber")}</Label>
            <Input
              id="roomNumber"
              name="roomNumber"
              defaultValue={address?.hotelDetails?.roomNumber}
              className="focus:ring-turquoise-500"
            />
          </div>
        </div>
      )}

      {addressType === "other" && (
        <div className="space-y-2">
          <Label htmlFor="instructions">{t("addresses.fields.instructions")}</Label>
          <Textarea
            id="instructions"
            name="instructions"
            defaultValue={address?.otherDetails?.instructions}
            className="focus:ring-turquoise-500"
          />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Checkbox
            id="hasPrivateParking"
            name="hasPrivateParking"
            defaultChecked={address?.hasPrivateParking}
            className="focus:ring-turquoise-500"
          />
          <Label htmlFor="hasPrivateParking">{t("addresses.fields.hasPrivateParking")}</Label>
        </div>

        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Checkbox
            id="isDefault"
            name="isDefault"
            defaultChecked={address?.isDefault}
            className="focus:ring-turquoise-500"
          />
          <Label htmlFor="isDefault">{t("addresses.fields.isDefault")}</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="additionalNotes">{t("addresses.fields.additionalNotes")}</Label>
        <Textarea
          id="additionalNotes"
          name="additionalNotes"
          defaultValue={address?.additionalNotes}
          className="focus:ring-turquoise-500"
        />
      </div>

      <div className="flex justify-end space-x-4 rtl:space-x-reverse">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="hover:bg-turquoise-50"
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-turquoise-500 hover:bg-turquoise-600">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 rtl:ml-2 h-4 w-4 animate-spin" />
              {t("common.loading")}
            </>
          ) : address ? (
            t("common.save")
          ) : (
            t("common.create")
          )}
        </Button>
      </div>
    </form>
  )
}
