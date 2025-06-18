"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Star, Clock, Users, Shield, Sparkles } from "lucide-react"
import { Badge } from "@/components/common/ui/badge"

export function LandingHero() {
  const { t, dir } = useTranslation()
  const { data: session } = useSession()
  const router = useRouter()

  const handleButtonClick = (action: string) => {
    if (!session) {
      // עבור אורח - הפניה לעמודי רכישה לאורחים
      switch (action) {
        case "book-treatment":
          router.push("/bookings/treatment")
          break
        case "book-subscription":
          router.push("/purchase/subscription")
          break
        case "book-gift-voucher":
          router.push("/purchase/gift-voucher")
          break
        case "use-voucher":
          console.log(`Clicked: ${action}`)
          break
        default:
          console.log(`Clicked: ${action}`)
      }
      return
    }

    const userRoles = session.user?.roles || []
    const isMember = userRoles.includes("member")

    switch (action) {
      case "book-treatment":
        if (isMember) {
          router.push("/bookings/treatment")
        }
        break
      case "book-subscription":
        if (isMember) {
          router.push("/purchase/subscription")
        }
        break
      case "book-gift-voucher":
        if (isMember) {
          router.push("/purchase/gift-voucher")
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
      return [
          <Button
            key="book-treatment"
            size="lg"
            className="h-16 text-lg font-semibold bg-gradient-to-r from-teal-600 to-turquoise-600 hover:from-teal-700 hover:to-turquoise-700 text-white border-0 shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
            onClick={() => handleButtonClick("book-treatment")}
          >
            <Clock className="mr-2 h-5 w-5" />
            {t("landing.bookTreatment")}
          </Button>,
          
          <Button
            key="book-subscription"
            size="lg"
            variant="outline"
            className="h-16 text-lg font-semibold border-2 border-teal-600 text-teal-700 hover:bg-teal-50 hover:border-teal-700 shadow-md hover:shadow-lg transition-all duration-200"
            onClick={() => handleButtonClick("book-subscription")}
          >
            <Users className="mr-2 h-5 w-5" />
            {t("landing.bookSubscription")}
          </Button>,
          
          <Button
            key="book-gift-voucher"
            size="lg"
            variant="outline"
            className="h-16 text-lg font-semibold border-2 border-amber-500 text-amber-600 hover:bg-amber-50 hover:border-amber-600 shadow-md hover:shadow-lg transition-all duration-200"
            onClick={() => handleButtonClick("book-gift-voucher")}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {t("landing.bookGiftVoucher")}
          </Button>,
          
          <Button
            key="use-voucher"
            size="lg"
            variant="secondary"
            className="h-16 text-lg font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-md hover:shadow-lg transition-all duration-200"
            onClick={() => handleButtonClick("use-voucher")}
          >
            <Shield className="mr-2 h-5 w-5" />
            {t("landing.useVoucher")}
          </Button>
      ]
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
          className="h-16 text-lg font-semibold bg-gradient-to-r from-teal-600 to-turquoise-600 hover:from-teal-700 hover:to-turquoise-700 text-white border-0 shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105"
          onClick={() => handleButtonClick("book-treatment")}
        >
          <Clock className="mr-2 h-5 w-5" />
          {t("landing.bookTreatment")}
        </Button>,
        <Button
          key="book-subscription"
          size="lg"
          variant="outline"
          className="h-16 text-lg font-semibold border-2 border-teal-600 text-teal-700 hover:bg-teal-50 hover:border-teal-700 shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => handleButtonClick("book-subscription")}
        >
          <Users className="mr-2 h-5 w-5" />
          {t("landing.bookSubscription")}
        </Button>,
        <Button
          key="book-gift-voucher"
          size="lg"
          variant="outline"
          className="h-16 text-lg font-semibold border-2 border-amber-500 text-amber-600 hover:bg-amber-50 hover:border-amber-600 shadow-md hover:shadow-lg transition-all duration-200"
          onClick={() => handleButtonClick("book-gift-voucher")}
        >
          <Sparkles className="mr-2 h-5 w-5" />
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
          className="h-16 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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
          className="h-16 text-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
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
          className="h-16 text-lg font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          onClick={() => handleButtonClick("admin-interface")}
        >
          {t("landing.adminInterface")}
        </Button>
      )
    }

    return buttons
  }

  const buttons = renderButtons() || []

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-turquoise-50 to-blue-50"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-teal-300 to-turquoise-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-r from-blue-300 to-cyan-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-20 w-80 h-80 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <Badge variant="secondary" className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-teal-200 text-teal-700 font-medium shadow-sm">
              <Star className="w-4 h-4 mr-2 fill-current" />
              4.9/5 דירוג ממוצע
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-blue-200 text-blue-700 font-medium shadow-sm">
              <Users className="w-4 h-4 mr-2" />
              10,000+ לקוחות מרוצים
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-purple-200 text-purple-700 font-medium shadow-sm">
              <Shield className="w-4 h-4 mr-2" />
              בטיחות מקסימלית
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-teal-600 via-turquoise-600 to-blue-600 bg-clip-text text-transparent leading-tight">
              {t("landing.heroTitle")}
            </h1>
            <h2 className="text-2xl md:text-3xl text-slate-600 font-medium max-w-4xl mx-auto leading-relaxed">
              {t("landing.heroSubtitle")}
            </h2>
          </div>

          {/* Description */}
          <p className="text-lg md:text-xl text-slate-500 max-w-3xl mx-auto leading-relaxed">
            {t("landing.heroDescription")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12 max-w-4xl mx-auto">
            {(buttons || []).slice(0, 2)}
          </div>
          
          {(buttons || []).length > 2 && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-4xl mx-auto">
              {(buttons || []).slice(2)}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
              <div className="text-3xl font-bold text-teal-600 mb-2">24/7</div>
              <div className="text-slate-600 font-medium">זמינות מלאה</div>
            </div>
            <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
              <div className="text-3xl font-bold text-turquoise-600 mb-2">30 דק׳</div>
              <div className="text-slate-600 font-medium">זמן הגעה ממוצע</div>
            </div>
            <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">100%</div>
              <div className="text-slate-600 font-medium">מטפלים מוסמכים</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-teal-600 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-teal-600 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  )
} 