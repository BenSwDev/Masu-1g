"use client"

import { useState } from "react"
import { Button } from "@/components/common/ui/button"
import { Plus } from "lucide-react"
import { PaymentMethodCard } from "./payment-method-card"
import { PaymentMethodForm } from "./payment-method-form"
import type { IPaymentMethod } from "@/lib/db/models/payment-method"
import { useTranslation } from "@/lib/translations/i18n"

interface PaymentMethodsClientProps {
  initialPaymentMethods: IPaymentMethod[]
}

export function PaymentMethodsClient({ initialPaymentMethods }: PaymentMethodsClientProps) {
  const { t } = useTranslation()
  const [showForm, setShowForm] = useState(false)
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<IPaymentMethod | undefined>()

  const handleEdit = (paymentMethod: IPaymentMethod) => {
    setEditingPaymentMethod(paymentMethod)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingPaymentMethod(undefined)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">{t("paymentMethods.title")}</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("paymentMethods.addNew")}
        </Button>
      </div>

      {initialPaymentMethods.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t("paymentMethods.noPaymentMethods")}</h3>
          <p className="text-gray-500 mb-6">הוסף את אמצעי התשלום הראשון שלך כדי להתחיל</p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("paymentMethods.addNew")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {initialPaymentMethods.map((paymentMethod) => (
            <PaymentMethodCard key={paymentMethod._id} paymentMethod={paymentMethod} onEdit={handleEdit} />
          ))}
        </div>
      )}

      <PaymentMethodForm open={showForm} onOpenChange={handleCloseForm} paymentMethod={editingPaymentMethod} />
    </div>
  )
}
