"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Alert, AlertDescription } from "@/components/common/ui/alert"
import { useToast } from "@/components/common/ui/use-toast"
import { useTranslation } from "@/lib/translations/i18n"
import {
  getMemberOwnedVouchers,
  getMemberPurchasedVouchers,
  type GiftVoucherPlain,
} from "@/actions/gift-voucher-actions"
import MemberGiftVoucherCard from "./member-gift-voucher-card"
import { Gift, Plus, ShoppingBag } from "lucide-react"

interface MemberGiftVouchersClientProps {
  initialOwnedVouchers?: GiftVoucherPlain[]
  initialPurchasedVouchers?: GiftVoucherPlain[]
}

export default function MemberGiftVouchersClient({
  initialOwnedVouchers = [],
  initialPurchasedVouchers = [],
}: MemberGiftVouchersClientProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [ownedVouchers, setOwnedVouchers] = useState<GiftVoucherPlain[]>(initialOwnedVouchers)
  const [purchasedVouchers, setPurchasedVouchers] = useState<GiftVoucherPlain[]>(initialPurchasedVouchers)
  const [loading, setLoading] = useState(false)

  const refreshVouchers = async () => {
    setLoading(true)
    try {
      const [ownedResult, purchasedResult] = await Promise.all([getMemberOwnedVouchers(), getMemberPurchasedVouchers()])

      if (ownedResult.success) {
        setOwnedVouchers(ownedResult.giftVouchers)
      }
      if (purchasedResult.success) {
        setPurchasedVouchers(purchasedResult.giftVouchers)
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("memberGiftVouchers.errorLoading"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialOwnedVouchers.length === 0 && initialPurchasedVouchers.length === 0) {
      refreshVouchers()
    }
  }, [])

  const handleUseVoucher = (voucher: GiftVoucherPlain) => {
    // In a real implementation, this would navigate to a redemption flow
    // For now, we'll show the voucher code
    toast({
      title: t("giftVoucher.voucherCode"),
      description: `${t("giftVoucher.useCode")}: ${voucher.code}`,
    })
  }

  const handleViewDetails = (voucher: GiftVoucherPlain) => {
    // Could open a modal or navigate to a details page
    console.log("View details for voucher:", voucher)
  }

  const getVoucherStats = (vouchers: GiftVoucherPlain[]) => {
    const active = vouchers.filter((v) => ["active", "partially_used"].includes(v.status)).length
    const used = vouchers.filter((v) => v.status === "fully_used").length
    const expired = vouchers.filter((v) => new Date(v.validUntil) < new Date()).length

    return { active, used, expired, total: vouchers.length }
  }

  const ownedStats = getVoucherStats(ownedVouchers)
  const purchasedStats = getVoucherStats(purchasedVouchers)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("memberGiftVouchers.title")}</h1>
          <p className="text-gray-600 mt-2">{t("memberGiftVouchers.description")}</p>
        </div>
        <Button onClick={() => router.push("/dashboard/member/gift-vouchers/purchase")}>
          <Plus className="h-4 w-4 mr-2" />
          {t("memberGiftVouchers.purchaseVoucher")}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="owned" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="owned" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            {t("memberGiftVouchers.myVouchers")} ({ownedStats.total})
          </TabsTrigger>
          <TabsTrigger value="purchased" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            {t("memberGiftVouchers.purchasedVouchers")} ({purchasedStats.total})
          </TabsTrigger>
        </TabsList>

        {/* Owned Vouchers Tab */}
        <TabsContent value="owned" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{ownedStats.active}</div>
                <div className="text-sm text-gray-600">{t("memberGiftVouchers.activeVouchers")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{ownedStats.used}</div>
                <div className="text-sm text-gray-600">{t("memberGiftVouchers.usedVouchers")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{ownedStats.expired}</div>
                <div className="text-sm text-gray-600">{t("memberGiftVouchers.expiredVouchers")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{ownedStats.total}</div>
                <div className="text-sm text-gray-600">{t("memberGiftVouchers.totalVouchers")}</div>
              </CardContent>
            </Card>
          </div>

          {/* Vouchers Grid */}
          {ownedVouchers.length === 0 ? (
            <Alert>
              <Gift className="h-4 w-4" />
              <AlertDescription>{t("memberGiftVouchers.noOwnedVouchers")}</AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ownedVouchers.map((voucher) => (
                <MemberGiftVoucherCard
                  key={voucher._id}
                  voucher={voucher}
                  onUse={handleUseVoucher}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Purchased Vouchers Tab */}
        <TabsContent value="purchased" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{purchasedStats.active}</div>
                <div className="text-sm text-gray-600">{t("memberGiftVouchers.activeVouchers")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{purchasedStats.used}</div>
                <div className="text-sm text-gray-600">{t("memberGiftVouchers.usedVouchers")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{purchasedStats.expired}</div>
                <div className="text-sm text-gray-600">{t("memberGiftVouchers.expiredVouchers")}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{purchasedStats.total}</div>
                <div className="text-sm text-gray-600">{t("memberGiftVouchers.totalVouchers")}</div>
              </CardContent>
            </Card>
          </div>

          {/* Vouchers Grid */}
          {purchasedVouchers.length === 0 ? (
            <Alert>
              <ShoppingBag className="h-4 w-4" />
              <AlertDescription>{t("memberGiftVouchers.noPurchasedVouchers")}</AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchasedVouchers.map((voucher) => (
                <MemberGiftVoucherCard key={voucher._id} voucher={voucher} onViewDetails={handleViewDetails} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={refreshVouchers} disabled={loading}>
          {loading ? t("common.loading") : t("common.refresh")}
        </Button>
      </div>
    </div>
  )
}
