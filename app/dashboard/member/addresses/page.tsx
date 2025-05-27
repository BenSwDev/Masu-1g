"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import type { IAddress } from "@/lib/db/models/address"
import { Button } from "@/components/common/ui/button"
import { AddressCard } from "@/components/dashboard/addresses/address-card"
import { AddressForm } from "@/components/dashboard/addresses/address-form"
import { useAddresses } from "@/hooks/use-addresses"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { AlertCircle, Plus } from "lucide-react"

export default function AddressesPage() {
  const { t } = useTranslation()
  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [editingAddress, setEditingAddress] = useState<IAddress | undefined>()

  const {
    addresses,
    isLoading,
    error,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    isCreating,
    isUpdating,
    isDeleting,
    isSettingDefault,
  } = useAddresses()

  const handleEdit = (address: IAddress) => {
    setEditingAddress(address)
    setIsAddingAddress(false)
  }

  const handleCancel = () => {
    setEditingAddress(undefined)
    setIsAddingAddress(false)
  }

  const handleCreateSuccess = () => {
    setIsAddingAddress(false)
  }

  const handleUpdateSuccess = () => {
    setEditingAddress(undefined)
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error instanceof Error ? error.message : t("errors.unknown")}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("addresses.title")}</h1>
        {!isAddingAddress && !editingAddress && (
          <Button onClick={() => setIsAddingAddress(true)} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addresses.addNew")}
          </Button>
        )}
      </div>

      {isAddingAddress && (
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{t("addresses.addNew")}</h2>
          <AddressForm onCancel={handleCancel} onSuccess={handleCreateSuccess} isLoading={isCreating} />
        </div>
      )}

      {editingAddress && (
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{t("addresses.edit")}</h2>
          <AddressForm
            address={editingAddress}
            onCancel={handleCancel}
            onSuccess={handleUpdateSuccess}
            isLoading={isUpdating}
          />
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
            <AddressCard
              key={address._id}
              address={address}
              onEdit={handleEdit}
              onDelete={deleteAddress}
              onSetDefault={setDefaultAddress}
              isDeleting={isDeleting}
              isSettingDefault={isSettingDefault}
            />
          ))}
        </div>
      )}

      {!isLoading && !isAddingAddress && !editingAddress && addresses?.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg shadow-sm">
          <p className="text-muted-foreground mb-4">{t("addresses.noAddresses")}</p>
          <Button onClick={() => setIsAddingAddress(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addresses.addFirst")}
          </Button>
        </div>
      )}
    </div>
  )
}
