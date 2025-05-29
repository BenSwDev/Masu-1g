"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent } from "@/components/common/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { Gift, Wallet, Calendar, Clock, User, Phone, MessageSquare } from "lucide-react"
import { formatDate } from "@/lib/utils/utils"
import MemberGiftVoucherCard from "./member-gift-voucher-card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface MemberGiftVouchersClientProps {
  ownedVouchers: GiftVoucherPlain[]
  purchasedVouchers: GiftVoucherPlain[]
}

const MemberGiftVouchersClient = ({ ownedVouchers = [], purchasedVouchers = [] }: MemberGiftVouchersClientProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const [selectedVoucher, setSelectedVoucher] = useState<GiftVoucherPlain | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isRedeemOpen, setIsRedeemOpen] = useState(false)
  const [redeemAmount, setRedeemAmount] = useState<number | "">("")

  // Filter purchased vouchers to exclude those that are also owned
  const ownedIds = new Set(ownedVouchers.map((v) => v._id))
  const giftedVouchers = purchasedVouchers.filter((v) => !ownedIds.has(v._id))

  const handleViewDetails = (voucher: GiftVoucherPlain) => {
    setSelectedVoucher(voucher)
    setIsDetailsOpen(true)
  }

  const handleRedeemVoucher = (voucher: GiftVoucherPlain) => {
    setSelectedVoucher(voucher)
    setIsRedeemOpen(true)
    if (voucher.voucherType === "monetary") {
      setRedeemAmount(voucher.remainingAmount || 0)
    }
  }

  const handleRedeem = () => {
    // This would call the redeemGiftVoucher action
    // For now, just close the dialog
    setIsRedeemOpen(false)
    // Show success message or redirect to booking/order page
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="owned" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="owned" className="flex items-center">
            <Wallet className="mr-2 h-4 w-4" />
            {t("giftVouchers.myVouchers")}
            {ownedVouchers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {ownedVouchers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="purchased" className="flex items-center">
            <Gift className="mr-2 h-4 w-4" />
            {t("giftVouchers.purchasedVouchers")}
            {giftedVouchers.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {giftedVouchers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owned" className="space-y-4">
          {ownedVouchers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">{t("giftVouchers.noOwnedVouchers")}</p>
                <Link href="/dashboard/member/gift-vouchers/purchase">
                  <Button>
                    <Gift className="mr-2 h-4 w-4" />
                    {t("giftVouchers.purchaseVoucher")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedVouchers.map((voucher) => (
                <MemberGiftVoucherCard
                  key={voucher._id}
                  voucher={voucher}
                  onViewDetails={() => handleViewDetails(voucher)}
                  onRedeem={() => handleRedeemVoucher(voucher)}
                  showRedeemButton
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="purchased" className="space-y-4">
          {giftedVouchers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground mb-4">{t("giftVouchers.noPurchasedVouchers")}</p>
                <Link href="/dashboard/member/gift-vouchers/purchase">
                  <Button>
                    <Gift className="mr-2 h-4 w-4" />
                    {t("giftVouchers.purchaseVoucher")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {giftedVouchers.map((voucher) => (
                <MemberGiftVoucherCard
                  key={voucher._id}
                  voucher={voucher}
                  onViewDetails={() => handleViewDetails(voucher)}
                  showRedeemButton={false}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Voucher Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("giftVouchers.details")}</DialogTitle>
            <DialogDescription>
              {selectedVoucher?.voucherType === "treatment"
                ? t("giftVouchers.treatmentVoucher")
                : t("giftVouchers.monetaryVoucher")}
            </DialogDescription>
          </DialogHeader>

          {selectedVoucher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("giftVouchers.code")}</h4>
                  <p className="font-mono text-lg">{selectedVoucher.code}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("giftVouchers.status.title")}</h4>
                  <Badge
                    variant={
                      selectedVoucher.status === "active" || selectedVoucher.status === "partially_used"
                        ? "default"
                        : selectedVoucher.status === "fully_used"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {t(`giftVouchers.status.${selectedVoucher.status}`)}
                  </Badge>
                </div>
              </div>

              {selectedVoucher.voucherType === "treatment" ? (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("giftVouchers.treatment")}</h4>
                  <p>
                    {selectedVoucher.treatmentName}{" "}
                    {selectedVoucher.selectedDurationMinutes &&
                      `(${selectedVoucher.selectedDurationMinutes} ${t("common.minutes")})`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("giftVouchers.value")}</h4>
                    <p className="font-medium">₪{selectedVoucher.monetaryValue?.toFixed(2)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      {t("giftVouchers.remainingBalance")}
                    </h4>
                    <p className="font-medium">₪{selectedVoucher.remainingAmount?.toFixed(2)}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("giftVouchers.validFrom")}</h4>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p>{formatDate(selectedVoucher.validFrom)}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("giftVouchers.validUntil")}</h4>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p>{formatDate(selectedVoucher.validUntil)}</p>
                  </div>
                </div>
              </div>

              {selectedVoucher.isGift && (
                <div className="border rounded-md p-3 bg-muted/50">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <Gift className="h-4 w-4 mr-2" />
                    {selectedVoucher.purchaserUserId === selectedVoucher.ownerUserId
                      ? t("giftVouchers.sendAsGift")
                      : t("giftVouchers.greeting")}
                  </h4>

                  {selectedVoucher.purchaserUserId === selectedVoucher.ownerUserId ? (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <p>{selectedVoucher.recipientName}</p>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <p>{selectedVoucher.recipientPhone}</p>
                      </div>
                      {selectedVoucher.greetingMessage && (
                        <div className="flex items-start">
                          <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground mt-1" />
                          <p className="italic">"{selectedVoucher.greetingMessage}"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start">
                      <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground mt-1" />
                      <p className="italic">{selectedVoucher.greetingMessage || t("giftVouchers.noGreeting")}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedVoucher.usageHistory && selectedVoucher.usageHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">{t("giftVouchers.usageHistory")}</h4>
                  <div className="border rounded-md divide-y">
                    {selectedVoucher.usageHistory.map((usage, index) => (
                      <div key={index} className="p-2 flex justify-between items-center">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{formatDate(usage.date)}</span>
                        </div>
                        {usage.amountUsed > 0 && <span>₪{usage.amountUsed.toFixed(2)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Redeem Voucher Dialog */}
      <Dialog open={isRedeemOpen} onOpenChange={setIsRedeemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("giftVouchers.redeemVoucher")}</DialogTitle>
            <DialogDescription>{selectedVoucher?.code}</DialogDescription>
          </DialogHeader>

          {selectedVoucher && (
            <div className="space-y-4">
              {selectedVoucher.voucherType === "treatment" ? (
                <div>
                  <p className="mb-4">
                    {t("giftVouchers.redeemTreatmentInstructions", {
                      treatment: selectedVoucher.treatmentName,
                      duration: selectedVoucher.selectedDurationMinutes
                        ? `${selectedVoucher.selectedDurationMinutes} ${t("common.minutes")}`
                        : "",
                    })}
                  </p>
                  <Button className="w-full" onClick={handleRedeem}>
                    {t("giftVouchers.bookNow")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">{t("giftVouchers.amountToRedeem")}</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={1}
                      max={selectedVoucher.remainingAmount}
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("giftVouchers.availableBalance")}: ₪{selectedVoucher.remainingAmount?.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleRedeem}
                    disabled={
                      redeemAmount === "" ||
                      redeemAmount <= 0 ||
                      (typeof redeemAmount === "number" && redeemAmount > (selectedVoucher.remainingAmount || 0))
                    }
                  >
                    {t("giftVouchers.redeem")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MemberGiftVouchersClient
