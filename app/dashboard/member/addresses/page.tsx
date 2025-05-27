"use client"

import { Button } from "@/components/common/ui/button"
import { Skeleton } from "@/components/common/ui/skeleton"
import { AddressCard } from "@/components/dashboard/addresses/address-card"
import { AddressForm } from "@/components/dashboard/addresses/address-form"
import { getUserAddresses } from "@/actions/address-actions"
import type { IAddress } from "@/lib/db/models/address"
import { useTranslation } from "@/lib/translations/i18n"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

export default function AddressesPage() {
  const { t } = useTranslation()
  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [editingAddress, setEditingAddress] = useState<IAddress | undefined>()

  const {
    data: addresses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const result = await getUserAddresses()
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch addresses")
      }
      return result.addresses || []
    },
  })

  const handleEdit = (address: IAddress) => {
    setEditingAddress(address)
    setIsAddingAddress(false)
  }

  const handleCancel = () => {
    setEditingAddress(undefined)
    setIsAddingAddress(false)
  }

  if (error) {
    console.error("Addresses fetch error:", error)
    return (
      <div className="container mx-auto py-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error instanceof Error ? error.message : t("errors.unknown")}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("addresses.title")}</h1>
        {!isAddingAddress && !editingAddress && (
          <Button onClick={() => setIsAddingAddress(true)}>{t("addresses.addNew")}</Button>
        )}
      </div>

      {isAddingAddress && (
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{t("addresses.addNew")}</h2>
          <AddressForm onCancel={handleCancel} />
        </div>
      )}

      {editingAddress && (
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{t("addresses.edit")}</h2>
          <AddressForm address={editingAddress} onCancel={handleCancel} />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg p-6 shadow-sm">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addresses?.map((address) => (
            <AddressCard key={address._id} address={address} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {!isLoading && !isAddingAddress && !editingAddress && addresses?.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg shadow-sm">
          <p className="text-muted-foreground">{t("addresses.noAddresses")}</p>
        </div>
      )}
    </div>
  )
}
