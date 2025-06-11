"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import GuestPurchaseModal from "@/components/guest/guest-purchase-modal"

export function LandingHero() {
  const { t, dir } = useTranslation()
  const { data: session } = useSession()
  const router = useRouter()
  const [guestModalOpen, setGuestModalOpen] = useState(false)
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<"booking" | "subscription" | "gift-voucher">("booking")

  const handleGuestCreated = (guestUserId: string, shouldMerge?: boolean, existingUserId?: string) => {
    // Store guest info in session/localStorage
    localStorage.setItem("guestUserId", guestUserId)
    if (shouldMerge && existingUserId) {
      localStorage.setItem("shouldMergeWith", existingUserId)
    }
    
    // Navigate to the appropriate purchase flow
    switch (selectedPurchaseType) {
      case "booking":
        router.push("/guest/book-treatment")
        break
      case "subscription":
        router.push("/guest/subscriptions/purchase")
        break
      case "gift-voucher":
        router.push("/guest/gift-vouchers/purchase")
        break
    }
  }

  const handleButtonClick = (action: string) => {
    if (!session) {
      // עבור אורח - פתח מודאל
      switch (action) {
        case "book-treatment":
          setSelectedPurchaseType("booking")
          setGuestModalOpen(true)
          break
        case "book-subscription":
          setSelectedPurchaseType("subscription")
          setGuestModalOpen(true)
          break
        case "book-gift-voucher":
          setSelectedPurchaseType("gift-voucher")
          setGuestModalOpen(true)
          break
        case "use-voucher":
          // TODO: Handle voucher usage for guests
          console.log(`Clicked: ${action}`)
          break
        default:
          console.log(`Guest clicked: ${action}`)
      }
      return
    }

    const userRoles = session.user?.roles || []
    const isMember = userRoles.includes("member")

    switch (action) {
      case "book-treatment":
        if (isMember) {
          router.push("/dashboard/member/book-treatment")
        }
        break
      case "book-subscription":
        if (isMember) {
          router.push("/dashboard/member/subscriptions/purchase")
        }
        break
      case "book-gift-voucher":
        if (isMember) {
          router.push("/dashboard/member/gift-vouchers/purchase")
        }
        break
      case "use-voucher":
        console.log(`Clicked: ${action}`)
        break
      case "professional-interface":
        router.push("/dashboard/professional")
        break
      case "partner-interface":
        router.push("/dashboard/partner")
        break
      case "admin-interface":
        router.push("/dashboard/admin")
        break
      default:
        console.log(`Clicked: ${action}`)
    }
  }

  const renderButtons = () => {
    if (!session) {
      // אורח - כל 4 הכפתורים
      return (
        <>
          <Button
            size="lg"
            className="h-16 text-lg font-semibold bg-turquoise-600 hover:bg-turquoise-700"
            onClick={() => handleButtonClick("book-treatment")}
          >
            {t("landing.bookTreatment")}
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg font-semibold border-turquoise-600 text-turquoise-700 hover:bg-turquoise-50"
            onClick={() => handleButtonClick("book-subscription")}
          >
            {t("landing.bookSubscription")}
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg font-semibold border-turquoise-600 text-turquoise-700 hover:bg-turquoise-50"
            onClick={() => handleButtonClick("book-gift-voucher")}
          >
            {t("landing.bookGiftVoucher")}
          </Button>
          
          <Button
            size="lg"
            variant="secondary"
            className="h-16 text-lg font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={() => handleButtonClick("use-voucher")}
          >
            {t("landing.useVoucher")}
          </Button>
        </>
      )
    }

    const userRoles = session.user?.roles || []
    const isMember = userRoles.includes("member")
    const isProfessional = userRoles.includes("professional")
    const isPartner = userRoles.includes("partner")
    const isAdmin = userRoles.includes("admin")

    const buttons = []

    // עבור member - 3 כפתורים ללא "יש לי שובר/קופון"
    if (isMember) {
      buttons.push(
        <Button
          key="book-treatment"
          size="lg"
          className="h-16 text-lg font-semibold bg-turquoise-600 hover:bg-turquoise-700"
          onClick={() => handleButtonClick("book-treatment")}
        >
          {t("landing.bookTreatment")}
        </Button>,
        <Button
          key="book-subscription"
          size="lg"
          variant="outline"
          className="h-16 text-lg font-semibold border-turquoise-600 text-turquoise-700 hover:bg-turquoise-50"
          onClick={() => handleButtonClick("book-subscription")}
        >
          {t("landing.bookSubscription")}
        </Button>,
        <Button
          key="book-gift-voucher"
          size="lg"
          variant="outline"
          className="h-16 text-lg font-semibold border-turquoise-600 text-turquoise-700 hover:bg-turquoise-50"
          onClick={() => handleButtonClick("book-gift-voucher")}
        >
          {t("landing.bookGiftVoucher")}
        </Button>
      )
    }

    // כפתורים נוספים לפי תפקידים
    if (isProfessional) {
      buttons.push(
        <Button
          key="professional-interface"
          size="lg"
          variant="default"
          className="h-16 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
          onClick={() => handleButtonClick("professional-interface")}
        >
          {t("landing.professionalInterface")}
        </Button>
      )
    }

    if (isPartner) {
      buttons.push(
        <Button
          key="partner-interface"
          size="lg"
          variant="default"
          className="h-16 text-lg font-semibold bg-purple-600 hover:bg-purple-700"
          onClick={() => handleButtonClick("partner-interface")}
        >
          {t("landing.partnerInterface")}
        </Button>
      )
    }

    if (isAdmin) {
      buttons.push(
        <Button
          key="admin-interface"
          size="lg"
          variant="default"
          className="h-16 text-lg font-semibold bg-red-600 hover:bg-red-700"
          onClick={() => handleButtonClick("admin-interface")}
        >
          {t("landing.adminInterface")}
        </Button>
      )
    }

    return buttons
  }

  const buttons = renderButtons()
  const buttonCount = buttons.length
  
  // קביעת הגריד לפי מספר הכפתורים
  const gridClass = buttonCount <= 2 
    ? "grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto"
    : buttonCount === 3
    ? "grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto"

  return (
    <section className="bg-gradient-to-br from-turquoise-50 via-white to-turquoise-100 py-20 px-6 md:py-32">
      <div className="container mx-auto text-center">
        {/* Hero Title */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-12">
          {t("landing.heroTitle")}
        </h1>

        {/* Action Buttons */}
        <div className={`${gridClass} ${dir === "rtl" ? "rtl" : ""}`}>
          {buttons}
        </div>
      </div>

      {/* Guest Purchase Modal */}
      <GuestPurchaseModal
        isOpen={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        onGuestCreated={handleGuestCreated}
        purchaseType={selectedPurchaseType}
      />

      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-turquoise-200/30 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-turquoise-200/20 blur-3xl"></div>
      </div>
    </section>
  )
} 