"use client"

import { Button } from "@/components/common/ui/button"
import { useTranslation } from "@/lib/translations/i18n"
import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"

export function LandingHero() {
  const { t, dir } = useTranslation()

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-turquoise-200 rounded-full px-4 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-turquoise-600" />
            <span className="text-sm font-medium text-turquoise-800">
              {dir === "rtl" ? "הפלטפורמה המובילה לטיפולי יופי" : "Leading Beauty Treatment Platform"}
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            {dir === "rtl" ? (
              <>
                <span className="bg-gradient-to-r from-turquoise-600 to-blue-600 bg-clip-text text-transparent">MASU</span>
                <br />
                <span>טיפולי יופי</span>
                <br />
                <span className="text-3xl md:text-5xl">בבית שלך</span>
              </>
            ) : (
              <>
                <span className="bg-gradient-to-r from-turquoise-600 to-blue-600 bg-clip-text text-transparent">MASU</span>
                <br />
                <span>Beauty at</span>
                <br />
                <span className="text-3xl md:text-5xl">Your Doorstep</span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            {dir === "rtl" 
              ? "חווי את החוויה הכי נוחה ויוקרתית של טיפולי יופי עם המטפלים המקצועיים ביותר, ישירות אליך הביתה"
              : "Experience the most convenient and luxurious beauty treatments with the most professional therapists, directly to your home"
            }
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button asChild size="lg" className="bg-gradient-to-r from-turquoise-600 to-blue-600 hover:from-turquoise-700 hover:to-blue-700 text-white px-8 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
              <Link href="/bookings/treatment" className="flex items-center gap-2">
                {dir === "rtl" ? "הזמן טיפול עכשיו" : "Book Treatment Now"}
                <ArrowLeft className={`w-5 h-5 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            </Button>
            
            <Button asChild size="lg" variant="outline" className="border-2 border-turquoise-600 text-turquoise-600 hover:bg-turquoise-600 hover:text-white px-8 py-4 text-lg rounded-full transition-all duration-300">
              <Link href="/purchase/subscription" className="flex items-center gap-2">
                {dir === "rtl" ? "רכישת מנוי" : "Buy Subscription"}
                <ArrowLeft className={`w-5 h-5 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline" className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white px-8 py-4 text-lg rounded-full transition-all duration-300">
              <Link href="/purchase/gift-voucher" className="flex items-center gap-2">
                {dir === "rtl" ? "רכישת שובר מתנה" : "Buy Gift Voucher"}
                <ArrowLeft className={`w-5 h-5 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-turquoise-600 mb-2">10,000+</div>
              <div className="text-gray-600">{dir === "rtl" ? "טיפולים מוצלחים" : "Successful Treatments"}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
              <div className="text-gray-600">{dir === "rtl" ? "מטפלים מקצועיים" : "Professional Therapists"}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">98%</div>
              <div className="text-gray-600">{dir === "rtl" ? "שביעות רצון" : "Customer Satisfaction"}</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  )
} 