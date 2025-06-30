"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Check, Star, Zap, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function LandingPricing() {
  const { dir } = useTranslation()

  const pricingPlans = [
    {
      name: dir === "rtl" ? "טיפול יחיד" : "Single Treatment",
      icon: Star,
      price: "149-399",
      period: dir === "rtl" ? "לטיפול" : "per treatment",
      description:
        dir === "rtl"
          ? "מושלם עבור לקוחות חדשים או לטיפולים מיוחדים"
          : "Perfect for new customers or special treatments",
      features: [
        dir === "rtl" ? "בחירת טיפול חופשית" : "Free treatment choice",
        dir === "rtl" ? "מטפל מקצועי מוסמך" : "Certified professional therapist",
        dir === "rtl" ? "כל הציוד כלול" : "All equipment included",
        dir === "rtl" ? "ביטוח מלא" : "Full insurance",
        dir === "rtl" ? "תשלום בתום הטיפול" : "Payment after treatment",
      ],
      buttonText: dir === "rtl" ? "הזמן עכשיו" : "Book Now",
      buttonLink: "/bookings/treatment",
      popular: false,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      name: dir === "rtl" ? "מנוי חודשי" : "Monthly Subscription",
      icon: Zap,
      price: "399",
      period: dir === "rtl" ? "לחודש" : "per month",
      description:
        dir === "rtl"
          ? "הבחירה הפופולרית עבור טיפוח קבוע עם הנחה משמעותית"
          : "Popular choice for regular care with significant discount",
      features: [
        dir === "rtl" ? "3 טיפולים בחודש" : "3 treatments per month",
        dir === "rtl" ? "הנחה של 25%" : "25% discount",
        dir === "rtl" ? "עדיפות בהזמנות" : "Booking priority",
        dir === "rtl" ? "ביטול חופשי" : "Free cancellation",
        dir === "rtl" ? "גמישות בבחירת טיפולים" : "Treatment selection flexibility",
        dir === "rtl" ? "תמיכה 24/7" : "24/7 support",
      ],
      buttonText: dir === "rtl" ? "התחל מנוי" : "Start Subscription",
      buttonLink: "/purchase/subscription",
      popular: true,
      gradient: "from-purple-500 to-purple-600",
    },
    {
      name: dir === "rtl" ? "מנוי VIP" : "VIP Subscription",
      icon: Crown,
      price: "699",
      period: dir === "rtl" ? "לחודש" : "per month",
      description:
        dir === "rtl"
          ? "חוויה יוקרתית עם השירותים הטובים ביותר"
          : "Luxurious experience with the best services",
      features: [
        dir === "rtl" ? "טיפולים ללא הגבלה" : "Unlimited treatments",
        dir === "rtl" ? "מטפלים ברמה הגבוהה ביותר" : "Top-tier therapists",
        dir === "rtl" ? "טיפולים מתקדמים" : "Advanced treatments",
        dir === "rtl" ? "זמן הגעה מועדף" : "Priority arrival time",
        dir === "rtl" ? "ייעוץ אישי" : "Personal consultation",
        dir === "rtl" ? "גישה לטיפולים חדשים" : "Access to new treatments",
      ],
      buttonText: dir === "rtl" ? "הצטרף ל-VIP" : "Join VIP",
      buttonLink: "/purchase/subscription",
      popular: false,
      gradient: "from-yellow-500 to-orange-500",
    },
  ]

  const additionalServices = [
    {
      name: dir === "rtl" ? "דמי נסיעה" : "Travel Fee",
      price: dir === "rtl" ? "ללא תוספת תשלום" : "No additional charge",
      description: dir === "rtl" ? "בכל הערים שאנו משרתים" : "In all cities we serve",
    },
    {
      name: dir === "rtl" ? "זמני המתנה" : "Waiting Time",
      price: dir === "rtl" ? "ללא תשלום עד 15 דקות" : "Free up to 15 minutes",
      description: dir === "rtl" ? "מעבר לכך ₪20 לכל 15 דקות" : "Beyond that ₪20 per 15 minutes",
    },
    {
      name: dir === "rtl" ? "ביטול הזמנה" : "Cancellation",
      price: dir === "rtl" ? "חופשי עד 24 שעות" : "Free up to 24 hours",
      description:
        dir === "rtl" ? "מעבר לכך 50% מעלות הטיפול" : "Beyond that 50% of treatment cost",
    },
    {
      name: dir === "rtl" ? "שינוי מועד" : "Reschedule",
      price: dir === "rtl" ? "ללא תשלום" : "No charge",
      description: dir === "rtl" ? "עד 4 שעות לפני הטיפול" : "Up to 4 hours before treatment",
    },
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {dir === "rtl" ? "מחירים שקופים" : "Transparent Pricing"}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {dir === "rtl"
              ? "ללא עלויות נסתרות, ללא הפתעות. כל המחירים כוללים הכל מהרגע הראשון"
              : "No hidden costs, no surprises. All prices include everything from the first moment"}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {pricingPlans.map((plan, index) => {
            const Icon = plan.icon
            return (
              <div
                key={index}
                className={`relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden ${
                  plan.popular
                    ? "transform scale-105 border-2 border-purple-200"
                    : "hover:-translate-y-2"
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full text-sm font-bold">
                      {dir === "rtl" ? "הכי פופולרי" : "Most Popular"}
                    </div>
                  </div>
                )}

                <div className="p-8">
                  {/* Icon */}
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${plan.gradient} mb-6 text-white`}
                  >
                    <Icon className="w-8 h-8" />
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">₪{plan.price}</span>
                      <span className="text-gray-600">{plan.period}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    asChild
                    size="lg"
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        : `bg-gradient-to-r ${plan.gradient} hover:opacity-90`
                    }`}
                  >
                    <Link href={plan.buttonLink}>{plan.buttonText}</Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Additional Services */}
        <div className="bg-white rounded-3xl p-8 shadow-xl">
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            {dir === "rtl" ? "מידע נוסף על התמחור" : "Additional Pricing Information"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalServices.map((service, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-blue-50 transition-colors"
              >
                <h4 className="font-bold text-gray-900 mb-2">{service.name}</h4>
                <p className="text-blue-600 font-semibold mb-2">{service.price}</p>
                <p className="text-sm text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white">
            <h3 className="text-3xl font-bold mb-4">
              {dir === "rtl" ? "יש לך שאלות על התמחור?" : "Have questions about pricing?"}
            </h3>
            <p className="text-xl mb-6 text-blue-100">
              {dir === "rtl"
                ? "צוות שירות הלקוחות שלנו כאן לעזור לך בכל שאלה"
                : "Our customer service team is here to help you with any question"}
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Link href="/contact">{dir === "rtl" ? "צור קשר" : "Contact Us"}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
