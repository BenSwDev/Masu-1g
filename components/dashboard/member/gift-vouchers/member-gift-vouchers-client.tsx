"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gift, Plus, RefreshCw, ShoppingBag, TrendingUp, Clock, XCircle } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { toast, useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { GiftVoucherPlain } from "@/types/core/gift-voucher"
// Member voucher functions replaced with API calls
import { GiftVoucherDetailsModal } from "@/components/dashboard/member/gift-vouchers/member-gift-voucher-details-modal"
import MemberGiftVoucherCard from "./member-gift-voucher-card"

interface MemberGiftVouchersClientProps {
  initialOwnedVouchers?: GiftVoucherPlain[]
  initialPurchasedVouchers?: GiftVoucherPlain[]
}

export default function MemberGiftVouchersClient({
  initialOwnedVouchers = [],
  initialPurchasedVouchers = [],
}: MemberGiftVouchersClientProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()

  const [ownedVouchers, setOwnedVouchers] = useState<GiftVoucherPlain[]>(initialOwnedVouchers)
  const [purchasedVouchers, setPurchasedVouchers] =
    useState<GiftVoucherPlain[]>(initialPurchasedVouchers)
  const [loading, setLoading] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState<GiftVoucherPlain | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  // Get userId from session
  const { data: session } = useSession()
  const userId = session?.user?.id

  const refreshVouchers = async () => {
    setLoading(true)
    try {
      const [ownedResult, purchasedResult] = await Promise.all([
        getMemberOwnedVouchers(userId || ""),
        getMemberPurchasedVouchers(userId || ""),
      ])

      if (ownedResult.success) {
        setOwnedVouchers(ownedResult.vouchers)
      }
      if (purchasedResult.success) {
        setPurchasedVouchers(purchasedResult.vouchers)
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("membervouchers.errorLoading"),
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
  }, [initialOwnedVouchers.length, initialPurchasedVouchers.length])

  const handleUseVoucher = (voucher: GiftVoucherPlain) => {
    toast({
      title: t("giftVoucher.voucherCode"),
      description: `${t("giftVoucher.useCode")}: ${voucher.code}`,
    })
  }

  const handleViewDetails = (voucher: GiftVoucherPlain) => {
    setSelectedVoucher(voucher)
    setIsDetailsModalOpen(true)
  }

  const getVoucherStats = (vouchers: GiftVoucherPlain[]) => {
    const active = vouchers.filter(v => ["active", "partially_used"].includes(v.status)).length
    const used = vouchers.filter(v => v.status === "fully_used").length
    const expired = vouchers.filter(v => new Date(v.validUntil) < new Date()).length

    return { active, used, expired, total: vouchers.length }
  }

  const ownedStats = getVoucherStats(ownedVouchers)
  const purchasedStats = getVoucherStats(purchasedVouchers)

  const StatCard = ({
    icon: Icon,
    value,
    label,
    color = "blue",
  }: {
    icon: React.ElementType
    value: number
    label: string
    color?: "green" | "yellow" | "red" | "blue" | "gray"
  }) => {
    const colorClasses = {
      green: "text-green-600 bg-green-100",
      yellow: "text-yellow-600 bg-yellow-100",
      red: "text-red-600 bg-red-100",
      blue: "text-blue-600 bg-blue-100",
      gray: "text-gray-600 bg-gray-100",
    }

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", colorClasses[color])}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const EmptyState = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
  }: {
    icon: React.ElementType
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
  }) => (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="px-8">
          <Plus className={cn("w-4 h-4", dir === "rtl" ? "ml-2" : "mr-2")} />
          {actionLabel}
        </Button>
      )}
    </div>
  )

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary" />
            {t("membervouchers.title")}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {t("membervouchers.description")}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={refreshVouchers} disabled={loading} className="px-6">
            <RefreshCw
              className={cn("w-4 h-4", dir === "rtl" ? "ml-2" : "mr-2", loading && "animate-spin")}
            />
            {t("common.refresh")}
          </Button>
          <Button onClick={() => router.push("/purchase/gift-voucher")} className="px-6">
            <Plus className={cn("w-4 h-4", dir === "rtl" ? "ml-2" : "mr-2")} />
            {t("membervouchers.purchaseVoucher")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="owned" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="owned" className="flex items-center gap-2 text-base">
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">{t("membervouchers.myVouchers")}</span>
            <span className="sm:hidden">{t("membervouchers.owned")}</span>
            <Badge variant="secondary" className="ml-1">
              {ownedStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="purchased" className="flex items-center gap-2 text-base">
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">{t("membervouchers.purchasedVouchers")}</span>
            <span className="sm:hidden">{t("membervouchers.purchased")}</span>
            <Badge variant="secondary" className="ml-1">
              {purchasedStats.total}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Owned Vouchers Tab */}
        <TabsContent value="owned" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={TrendingUp}
              value={ownedStats.active}
              label={t("membervouchers.activeVouchers")}
              color="green"
            />
            <StatCard
              icon={Clock}
              value={ownedStats.used}
              label={t("membervouchers.usedVouchers")}
              color="gray"
            />
            <StatCard
              icon={XCircle}
              value={ownedStats.expired}
              label={t("membervouchers.expiredVouchers")}
              color="red"
            />
            <StatCard
              icon={Gift}
              value={ownedStats.total}
              label={t("membervouchers.totalVouchers")}
              color="blue"
            />
          </div>

          {/* Vouchers Grid */}
          {ownedVouchers.length === 0 ? (
            <EmptyState
              icon={Gift}
              title={t("membervouchers.novouchers")}
              description={t("membervouchers.novouchersDescription")}
              actionLabel={t("membervouchers.purchaseVoucher")}
              onAction={() => router.push("/purchase/gift-voucher")}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {ownedVouchers.map(voucher => (
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={TrendingUp}
              value={purchasedStats.active}
              label={t("membervouchers.activeVouchers")}
              color="green"
            />
            <StatCard
              icon={Clock}
              value={purchasedStats.used}
              label={t("membervouchers.usedVouchers")}
              color="gray"
            />
            <StatCard
              icon={XCircle}
              value={purchasedStats.expired}
              label={t("membervouchers.expiredVouchers")}
              color="red"
            />
            <StatCard
              icon={ShoppingBag}
              value={purchasedStats.total}
              label={t("membervouchers.totalVouchers")}
              color="blue"
            />
          </div>

          {/* Vouchers Grid */}
          {purchasedVouchers.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title={t("membervouchers.noPurchasedVouchers")}
              description={t("membervouchers.noPurchasedVouchersDescription")}
              actionLabel={t("membervouchers.purchaseVoucher")}
              onAction={() => router.push("/purchase/gift-voucher")}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {purchasedVouchers.map(voucher => (
                <MemberGiftVoucherCard
                  key={voucher._id}
                  voucher={voucher}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <GiftVoucherDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        voucher={selectedVoucher}
      />
    </div>
  )
}




