"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { CheckCircle, Gift, Star } from "lucide-react"

export function Hero() {
  const { t, dir } = useTranslation()
  const { data: session } = useSession()
  const router = useRouter()

  const handleButtonClick = (action: string) => {
    if (!session) {
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
        if (isMember) router.push("/bookings/treatment")
        break
      case "book-subscription":
        if (isMember) router.push("/purchase/subscription")
        break
      case "book-gift-voucher":
        if (isMember) router.push("/purchase/gift-voucher")
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
      return (
        <>
          <Button
            size="lg"
            className="h-16 text-lg font-semibold bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-xl rounded-xl"
            onClick={() => handleButtonClick("book-treatment")}
          >
            {t("landing.bookTreatment")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg font-semibold border-white/50 text-white hover:bg-white/10 backdrop-blur rounded-xl"
            onClick={() => handleButtonClick("book-subscription")}
          >
            {t("landing.bookSubscription")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg font-semibold border-white/50 text-white hover:bg-white/10 backdrop-blur rounded-xl"
            onClick={() => handleButtonClick("book-gift-voucher")}
          >
            {t("landing.bookGiftVoucher")}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-16 text-lg font-semibold bg-white/20 text-white hover:bg-white/30 rounded-xl"
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

    const buttons = [] as React.ReactNode[]
    if (isMember) {
      buttons.push(
        <Button
          key="book-treatment"
          size="lg"
          className="h-16 text-lg font-semibold bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-xl rounded-xl"
          onClick={() => handleButtonClick("book-treatment")}
        >
          {t("landing.bookTreatment")}
        </Button>,
        <Button
          key="book-subscription"
          size="lg"
          variant="outline"
          className="h-16 text-lg font-semibold border-white/50 text-white hover:bg-white/10 backdrop-blur rounded-xl"
          onClick={() => handleButtonClick("book-subscription")}
        >
          {t("landing.bookSubscription")}
        </Button>,
        <Button
          key="book-gift-voucher"
          size="lg"
          variant="outline"
          className="h-16 text-lg font-semibold border-white/50 text-white hover:bg-white/10 backdrop-blur rounded-xl"
          onClick={() => handleButtonClick("book-gift-voucher")}
        >
          {t("landing.bookGiftVoucher")}
        </Button>
      )
    }
    if (isProfessional) {
      buttons.push(
        <Button
          key="professional-interface"
          size="lg"
          className="h-16 text-lg font-semibold bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-xl rounded-xl"
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
          className="h-16 text-lg font-semibold bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-xl rounded-xl"
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
          className="h-16 text-lg font-semibold bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-xl rounded-xl"
          onClick={() => handleButtonClick("admin-interface")}
        >
          {t("landing.adminInterface")}
        </Button>
      )
    }
    return buttons
  }

  const buttons = renderButtons()
  const gridClass =
    buttons.length <= 2
      ? "grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto"
      : buttons.length === 3
        ? "grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto"
        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto"

  return (
    <section className="relative overflow-hidden py-24 px-6 text-white bg-gradient-to-br from-sky-600 via-sky-700 to-slate-800">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: "url('/hero-pattern.svg')" }}
      />
      <div className="relative z-10 container mx-auto text-center flex flex-col gap-10">
        <span className="mx-auto rounded-full bg-white/20 backdrop-blur px-4 py-1 text-lg font-medium w-fit">Welcome to MASU</span>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">Luxury Treatments at Your Home</h1>
        <p className="text-xl text-sky-100/90 max-w-3xl mx-auto">Book professional massage treatments easily and quickly. Relax and rejuvenate without leaving your house.</p>
        <div className={`${gridClass} ${dir === "rtl" ? "rtl" : ""}`}>{buttons}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur rounded-xl p-4 shadow-lg">
            <div className="p-3 rounded-full bg-cyan-500/30">
              <Star className="size-6" />
            </div>
            <span className="text-lg">Top Professionals</span>
          </div>
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur rounded-xl p-4 shadow-lg">
            <div className="p-3 rounded-full bg-cyan-500/30">
              <Gift className="size-6" />
            </div>
            <span className="text-lg">Gift Vouchers Available</span>
          </div>
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur rounded-xl p-4 shadow-lg">
            <div className="p-3 rounded-full bg-cyan-500/30">
              <CheckCircle className="size-6" />
            </div>
            <span className="text-lg">Satisfaction Guaranteed</span>
          </div>
        </div>
      </div>
    </section>
  )
}
