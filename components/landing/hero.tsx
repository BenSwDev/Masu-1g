"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"

export function LandingHero() {
  const { t, dir } = useTranslation()

  const handleButtonClick = (action: string) => {
    // כרגע הכפתורים לא יעשו דבר
    console.log(`Clicked: ${action}`)
  }

  return (
    <section className="bg-gradient-to-br from-turquoise-50 via-white to-turquoise-100 py-20 px-6 md:py-32">
      <div className="container mx-auto text-center">
        {/* Hero Title */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-12">
          {t("landing.heroTitle")}
        </h1>

        {/* Action Buttons */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto ${dir === "rtl" ? "rtl" : ""}`}>
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
        </div>
      </div>

      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-turquoise-200/30 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-turquoise-200/20 blur-3xl"></div>
      </div>
    </section>
  )
} 