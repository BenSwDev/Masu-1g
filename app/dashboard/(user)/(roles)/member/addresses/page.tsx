"use client"

import { Button } from "@/components/common/ui/button"
import { Skeleton } from "@/components/common/ui/skeleton"
import { AddressCard } from "@/components/dashboard/member/addresses/address-card"
import { AddressForm } from "@/components/dashboard/member/addresses/address-form"
import { getUserAddresses } from "@/actions/address-actions"
import type { IAddress } from "@/lib/db/models/address"
import { useTranslation } from "@/lib/translations/i18n"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { PlusCircle } from "lucide-react"

export default function AddressesPage() {
  const { t } = useTranslation()
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)
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
        throw new Error(result.error || t("errors.fetchFailed"))
      }
      return result.addresses || []
    },
  })

  const handleEdit = (address: IAddress) => {
    setEditingAddress(address)
    setIsAddressModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingAddress(undefined)
    setIsAddressModalOpen(true)
  }

  const handleModalClose = () => {
    setIsAddressModalOpen(false)
    setEditingAddress(undefined) // Ensure editingAddress is cleared when modal closes
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
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 rtl:ml-2 h-4 w-4" />
          {t("addresses.addNew")}
        </Button>
      </div>

      <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
        {/* DialogTrigger is handled by the button above and onEdit calls */}
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>
              {editingAddress
                ? t("addresses.editAddressDialogTitle")
                : t("addresses.addAddressDialogTitle")}
            </DialogTitle>
          </DialogHeader>
          {/* Render AddressForm only when modal is open and ready to avoid premature form state issues */}
          {isAddressModalOpen && (
            <AddressForm
              address={editingAddress}
              onCancel={handleModalClose}
              // onSuccess is not strictly needed here as invalidation + onCancel handles it
              // but if AddressForm requires it or for consistency:
              // onSuccess={handleModalClose}
            />
          )}
        </DialogContent>
      </Dialog>

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
            <AddressCard key={address.id.toString()} address={address} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {!isLoading && addresses?.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg shadow-sm">
          <p className="text-muted-foreground">{t("addresses.noAddresses")}</p>
          <Button onClick={handleAddNew} className="mt-4">
            <PlusCircle className="mr-2 rtl:ml-2 h-4 w-4" />
            {t("addresses.addFirstAddress")}
          </Button>
        </div>
      )}
    </div>
  )
}
