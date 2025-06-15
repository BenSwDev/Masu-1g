"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { useToast } from "@/components/common/ui/use-toast"
import { Badge } from "@/components/common/ui/badge"
import { Separator } from "@/components/common/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { 
  Gift, 
  Package, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Ticket,
  Tag,
  Copy,
  Percent
} from "lucide-react"
import { getGiftVoucherByCode } from "@/actions/gift-voucher-actions"
import { getUserSubscriptionById } from "@/actions/user-subscription-actions"
import { getUserAvailableCoupons } from "@/actions/coupon-actions"
import { cn, formatCurrency, formatDate } from "@/lib/utils/utils"
import { useTranslation } from "@/lib/translations/i18n"
import Link from "next/link"

interface UnifiedRedemptionWizardProps {
  initialCode?: string
  initialId?: string
  type?: "voucher" | "subscription"
}

type RedemptionItem = {
  type: "voucher" | "subscription"
  data: any
  isValid: boolean
  error?: string
}

export default function UnifiedRedemptionWizard({ 
  initialCode, 
  initialId, 
  type 
}: UnifiedRedemptionWizardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session } = useSession()
  const { language } = useTranslation()
  
  const [searchType, setSearchType] = useState<"voucher" | "subscription">(type || "voucher")
  const [searchValue, setSearchValue] = useState(initialCode || initialId || "")
  const [loading, setLoading] = useState(false)
  const [redemptionItem, setRedemptionItem] = useState<RedemptionItem | null>(null)
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([])
  const [loadingCoupons, setLoadingCoupons] = useState(false)

  // Load available coupons for logged-in users
  useEffect(() => {
    if (session?.user) {
      loadAvailableCoupons()
    }
  }, [session])

  // Auto-search if initial values provided
  useEffect(() => {
    if ((initialCode && type === "voucher") || (initialId && type === "subscription")) {
      handleSearch()
    }
  }, [initialCode, initialId, type])

  const loadAvailableCoupons = async () => {
    setLoadingCoupons(true)
    try {
      const result = await getUserAvailableCoupons()
      setAvailableCoupons(result.coupons || [])
    } catch (error) {
      console.error("Failed to load coupons:", error)
    } finally {
      setLoadingCoupons(false)
    }
  }

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "יש להזין קוד או מזהה",
      })
      return
    }

    setLoading(true)
    try {
      if (searchType === "voucher") {
        const result = await getGiftVoucherByCode(searchValue.trim())
        if (result.success && result.voucher) {
          setRedemptionItem({
            type: "voucher",
            data: result.voucher,
            isValid: result.voucher.isActive && 
                    ["active", "partially_used", "sent"].includes(result.voucher.status) &&
                    new Date(result.voucher.validUntil) > new Date(),
          })
        } else {
          setRedemptionItem({
            type: "voucher",
            data: null,
            isValid: false,
            error: result.error || "שובר לא נמצא",
          })
        }
      } else {
        const result = await getUserSubscriptionById(searchValue.trim())
        if (result.success && result.subscription) {
          const sub = result.subscription as any
          setRedemptionItem({
            type: "subscription",
            data: sub,
            isValid: sub.status === "active" && 
                    sub.remainingQuantity > 0 &&
                    new Date(sub.expiryDate) > new Date(),
          })
        } else {
          setRedemptionItem({
            type: "subscription",
            data: null,
            isValid: false,
            error: result.error || "מנוי לא נמצא",
          })
        }
      }
    } catch (error) {
      setRedemptionItem({
        type: searchType,
        data: null,
        isValid: false,
        error: "שגיאה בחיפוש",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = () => {
    if (!redemptionItem?.isValid) return

    if (redemptionItem.type === "voucher") {
      router.push(`/book-treatment?voucherCode=${searchValue}`)
    } else {
      router.push(`/book-treatment?subscriptionId=${searchValue}`)
    }
  }

  const handleCouponUse = (couponCode: string) => {
    router.push(`/book-treatment?couponCode=${couponCode}`)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "הועתק!",
        description: "הקוד הועתק ללוח",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "שגיאה",
        description: "לא ניתן להעתיק את הקוד",
      })
    }
  }

  const renderSearchSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          חיפוש לפי קוד
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={searchType === "voucher" ? "default" : "outline"}
            onClick={() => {
              setSearchType("voucher")
              setRedemptionItem(null)
            }}
            className="flex items-center gap-2"
          >
            <Gift className="h-4 w-4" />
            שובר מתנה
          </Button>
          <Button
            variant={searchType === "subscription" ? "default" : "outline"}
            onClick={() => {
              setSearchType("subscription")
              setRedemptionItem(null)
            }}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            מנוי
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="search-input">
            {searchType === "voucher" ? "קוד שובר מתנה" : "מזהה מנוי"}
          </Label>
          <div className="flex gap-2">
            <Input
              id="search-input"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={searchType === "voucher" ? "הזן קוד שובר..." : "הזן מזהה מנוי..."}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "מחפש..." : "חפש"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderCouponsSection = () => {
    if (!session?.user || availableCoupons.length === 0) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            הקופונים שלי ({availableCoupons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCoupons ? (
            <div className="text-center py-4">טוען קופונים...</div>
          ) : (
            <div className="grid gap-3">
              {availableCoupons.map((coupon) => (
                <div
                  key={coupon._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {coupon.code}
                      </Badge>
                      <Badge variant="secondary">
                        {coupon.discountType === "percentage" ? (
                          <span className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            {coupon.discountValue}%
                          </span>
                        ) : (
                          <span>₪{coupon.discountValue}</span>
                        )}
                      </Badge>
                    </div>
                    {coupon.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {coupon.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        תקף עד: {new Date(coupon.validUntil).toLocaleDateString("he-IL")}
                      </span>
                      <span>
                        נוצל: {coupon.timesUsed} / {coupon.usageLimit === 0 ? "∞" : coupon.usageLimit}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(coupon.code)}
                      className="flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      העתק
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleCouponUse(coupon.code)}
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      השתמש
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderVoucherDetails = (voucher: any) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            פרטי שובר מתנה
          </span>
          <Badge variant={redemptionItem?.isValid ? "default" : "destructive"}>
            {redemptionItem?.isValid ? "תקף" : "לא תקף"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">קוד שובר</Label>
            <p className="font-mono">{voucher.code}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">סוג</Label>
            <p>{voucher.voucherType === "monetary" ? "כספי" : "טיפול"}</p>
          </div>
        </div>

        {voucher.voucherType === "monetary" ? (
          <div>
            <Label className="text-sm font-medium text-muted-foreground">יתרה</Label>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(voucher.remainingAmount || 0, "ILS", language)}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">טיפול</Label>
              <p>{voucher.treatmentName || "לא צוין"}</p>
            </div>
            {voucher.selectedDurationName && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">משך</Label>
                <p>{voucher.selectedDurationName}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">ערך</Label>
              <p className="text-lg font-bold text-green-600">{formatCurrency(voucher.amount || 0, "ILS", language)}</p>
            </div>
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">תקף מ</Label>
            <p className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(voucher.validFrom, language)}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">תקף עד</Label>
            <p className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(voucher.validUntil, language)}
            </p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">סטטוס</Label>
          <Badge variant={voucher.status === "active" ? "default" : "secondary"}>
            {getStatusText(voucher.status)}
          </Badge>
        </div>

        {!redemptionItem?.isValid && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              {redemptionItem?.error || "שובר לא תקף למימוש"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderSubscriptionDetails = (subscription: any) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            פרטי מנוי
          </span>
          <Badge variant={redemptionItem?.isValid ? "default" : "destructive"}>
            {redemptionItem?.isValid ? "תקף" : "לא תקף"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">טיפול</Label>
          <p className="font-medium">{subscription.treatmentId?.name || "לא צוין"}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">יתרת טיפולים</Label>
            <p className="text-lg font-bold text-blue-600">
              {subscription.remainingQuantity} / {subscription.totalQuantity}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">מחיר לטיפול</Label>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(subscription.pricePerSession || 0, "ILS", language)}
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">תאריך רכישה</Label>
            <p className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(subscription.purchaseDate, language)}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">תאריך תפוגה</Label>
            <p className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(subscription.expiryDate, language)}
            </p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-muted-foreground">סטטוס</Label>
          <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
            {getStatusText(subscription.status)}
          </Badge>
        </div>

        {!redemptionItem?.isValid && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">
              {redemptionItem?.error || "מנוי לא תקף למימוש"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: "פעיל",
      partially_used: "בשימוש חלקי",
      fully_used: "מומש במלואו",
      expired: "פג תוקף",
      sent: "נשלח",
      pending_send: "ממתין לשליחה",
      cancelled: "מבוטל",
    }
    return statusMap[status] || status
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">מימוש שובר או מנוי</h1>
        <p className="text-gray-600">הזן קוד שובר מתנה או מזהה מנוי למימוש, או השתמש בקופונים שלך</p>
      </div>

      {session?.user && availableCoupons.length > 0 ? (
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">חיפוש שוברים ומנויים</TabsTrigger>
            <TabsTrigger value="coupons">הקופונים שלי</TabsTrigger>
          </TabsList>
          
          <TabsContent value="search" className="space-y-6">
            {renderSearchSection()}
            
            {redemptionItem && (
              <>
                {redemptionItem.type === "voucher" && redemptionItem.data && 
                  renderVoucherDetails(redemptionItem.data)}
                
                {redemptionItem.type === "subscription" && redemptionItem.data && 
                  renderSubscriptionDetails(redemptionItem.data)}

                {!redemptionItem.data && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">לא נמצא</h3>
                      <p className="text-muted-foreground">
                        {redemptionItem.error || `${searchType === "voucher" ? "שובר" : "מנוי"} לא נמצא`}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {redemptionItem.isValid && redemptionItem.data && (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={handleRedeem} size="lg" className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      ממש עכשיו
                    </Button>
                    <Button variant="outline" asChild size="lg">
                      <Link href="/">חזור לעמוד הבית</Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="coupons" className="space-y-6">
            {renderCouponsSection()}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          {renderSearchSection()}
          
          {session?.user && (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">אין לך קופונים זמינים כרגע</p>
            </div>
          )}
          
          {redemptionItem && (
            <>
              {redemptionItem.type === "voucher" && redemptionItem.data && 
                renderVoucherDetails(redemptionItem.data)}
              
              {redemptionItem.type === "subscription" && redemptionItem.data && 
                renderSubscriptionDetails(redemptionItem.data)}

              {!redemptionItem.data && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">לא נמצא</h3>
                    <p className="text-muted-foreground">
                      {redemptionItem.error || `${searchType === "voucher" ? "שובר" : "מנוי"} לא נמצא`}
                    </p>
                  </CardContent>
                </Card>
              )}

              {redemptionItem.isValid && redemptionItem.data && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button onClick={handleRedeem} size="lg" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    ממש עכשיו
                  </Button>
                  <Button variant="outline" asChild size="lg">
                    <Link href="/">חזור לעמוד הבית</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Quick access section */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">גישה מהירה</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button variant="outline" asChild className="h-auto p-4">
              <Link href="/book-treatment" className="flex flex-col items-center gap-2">
                <Ticket className="h-6 w-6" />
                <span>הזמן טיפול חדש</span>
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-auto p-4">
              <Link href="/dashboard" className="flex flex-col items-center gap-2">
                <Package className="h-6 w-6" />
                <span>האזור האישי</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 