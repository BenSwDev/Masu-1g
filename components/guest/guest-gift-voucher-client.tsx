"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/common/ui/radio-group"
import { Gift, CreditCard, DollarSign } from "lucide-react"

interface GuestGiftVoucherClientProps {
  treatments: any[]
  paymentMethods: any[]
  guestUser: any
}

export default function GuestGiftVoucherClient({
  treatments,
  paymentMethods,
  guestUser
}: GuestGiftVoucherClientProps) {
  const { t } = useTranslation()
  const [voucherType, setVoucherType] = useState<"treatment" | "monetary">("treatment")
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null)
  const [monetaryValue, setMonetaryValue] = useState<string>("150")
  const [isLoading, setIsLoading] = useState(false)

  const handleProceedToPayment = () => {
    // TODO: Implement gift voucher purchase flow for guests
    console.log("Gift voucher purchase for guest:", {
      voucherType,
      selectedTreatment,
      monetaryValue,
      guestUser
    })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t("landing.bookGiftVoucher")}
        </h2>
        <p className="text-gray-600">
          {t("guest.giftVoucher.description")}
        </p>
      </div>

      {/* Voucher Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t("guest.giftVoucher.selectType")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={voucherType} onValueChange={(value: "treatment" | "monetary") => setVoucherType(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="treatment" id="treatment" />
              <Label htmlFor="treatment" className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                {t("guest.giftVoucher.treatmentVoucher")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monetary" id="monetary" />
              <Label htmlFor="monetary" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {t("guest.giftVoucher.monetaryVoucher")}
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Treatment Selection */}
      {voucherType === "treatment" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("guest.giftVoucher.selectTreatment")}</CardTitle>
          </CardHeader>
          <CardContent>
            {treatments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                {t("guest.giftVoucher.noTreatments")}
              </p>
            ) : (
              <div className="grid gap-3">
                {treatments.map((treatment: any) => (
                  <Card 
                    key={treatment._id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTreatment?._id === treatment._id 
                        ? 'border-turquoise-500 bg-turquoise-50' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedTreatment(treatment)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{treatment.name}</h4>
                          <p className="text-sm text-gray-600">{treatment.category}</p>
                        </div>
                        {treatment.price && (
                          <span className="font-bold text-turquoise-600">
                            ₪{treatment.price}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monetary Value Selection */}
      {voucherType === "monetary" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("guest.giftVoucher.setAmount")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="monetary-value">{t("guest.giftVoucher.amount")} (₪)</Label>
                <Input
                  id="monetary-value"
                  type="number"
                  min="150"
                  value={monetaryValue}
                  onChange={(e) => setMonetaryValue(e.target.value)}
                  placeholder="150"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {t("guest.giftVoucher.minimumAmount")}: ₪150
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary and Purchase */}
      {((voucherType === "treatment" && selectedTreatment) || (voucherType === "monetary" && monetaryValue)) && (
        <Card className="border-turquoise-200 bg-turquoise-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              {t("guest.giftVoucher.summary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">
                {voucherType === "treatment" 
                  ? selectedTreatment?.name 
                  : t("guest.giftVoucher.monetaryVoucher")
                }
              </span>
              <span className="text-lg font-bold">
                ₪{voucherType === "treatment" ? selectedTreatment?.price : monetaryValue}
              </span>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                {t("guest.giftVoucher.paymentNote")}
              </p>
            </div>

            <Button
              onClick={handleProceedToPayment}
              disabled={isLoading}
              className="w-full h-12 text-lg"
              size="lg"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {isLoading ? t("common.loading") : t("guest.giftVoucher.proceedToPayment")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 