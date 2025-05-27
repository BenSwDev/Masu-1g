"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/actions/address-actions"
import { toast } from "sonner"
import { useTranslation } from "@/lib/translations/i18n"

export function useAddresses() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const {
    data: addresses = [],
    isLoading,
    error,
    refetch,
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

  const createAddressMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["addresses"] })
        toast.success(t("addresses.createSuccess"))
      } else {
        toast.error(result.error || t("errors.unknown"))
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t("errors.unknown"))
    },
  })

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateAddress(id, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["addresses"] })
        toast.success(t("addresses.updateSuccess"))
      } else {
        toast.error(result.error || t("errors.unknown"))
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t("errors.unknown"))
    },
  })

  const deleteAddressMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["addresses"] })
        toast.success(t("addresses.deleteSuccess"))
      } else {
        toast.error(result.error || t("errors.unknown"))
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t("errors.unknown"))
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["addresses"] })
        toast.success(t("addresses.setDefaultSuccess"))
      } else {
        toast.error(result.error || t("errors.unknown"))
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t("errors.unknown"))
    },
  })

  return {
    // Data
    addresses,
    isLoading,
    error,

    // Actions
    createAddress: createAddressMutation.mutate,
    updateAddress: updateAddressMutation.mutate,
    deleteAddress: deleteAddressMutation.mutate,
    setDefaultAddress: setDefaultMutation.mutate,
    refetch,

    // Loading states
    isCreating: createAddressMutation.isPending,
    isUpdating: updateAddressMutation.isPending,
    isDeleting: deleteAddressMutation.isPending,
    isSettingDefault: setDefaultMutation.isPending,
  }
}
