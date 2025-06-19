"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Search, Calendar, Sparkles, ArrowLeft } from "lucide-react"
import { Button } from "@/components/common/ui/button"
import Link from "next/link"

export function LandingHowItWorks() {
  const { dir } = useTranslation()

  const steps = [
    {
      icon: Search,
      number: "01",
      title: dir === "rtl" ? "בחר את הטיפול" : "Choose Treatment",
      description: dir === "rtl"
        ? "עיין במגוון הטיפולים שלנו ובחר את הטיפול המתאים לך בדיוק. כל טיפול כולל תיאור מפורט, מחיר ומשך זמן."
        : "Browse our variety of treatments and choose the one that suits you perfectly. Each treatment includes detailed description, price and duration.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Calendar,
      number: "02", 
      title: dir === "rtl" ? "קבע זמן נוח" : "Schedule Time",
      description: dir === "rtl"
        ? "בחר תאריך ושעה שנוחים לך, הזן את כתובתך ופרטי ההזמנה. המערכת תמצא את המטפל הזמין הקרוב אליך."
        : "Choose a convenient date and time, enter your address and booking details. The system will find the available therapist closest to you.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Sparkles,
      number: "03",
      title: dir === "rtl" ? "תהנה מהטיפול" : "Enjoy Treatment",
      description: dir === "rtl"
        ? "המטפל המקצועי יגיע אליך הביתה עם כל הציוד הנדרש. תרגיש איך הבית שלך הופך לספא פרטי ויוקרתי."
        : "The professional therapist will come to your home with all required equipment. Feel how your home becomes a private and luxurious spa.",
      color: "from-green-500 to-emerald-500"
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {dir === "rtl" ? "איך זה עובד?" : "How It Works?"}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {dir === "rtl"
              ? "3 שלבים פשוטים להזמנת טיפול יופי מקצועי בבית שלך"
              : "3 simple steps to book a professional beauty treatment at your home"
            }
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2/3 h-0.5 bg-gradient-to-r from-blue-300 via-purple-300 to-green-300"></div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="relative group text-center">
                  {/* Step number background */}
                  <div className="absolute -top-6 -right-6 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center z-10 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-sm font-bold text-gray-400">{step.number}</span>
                  </div>

                  {/* Main card */}
                  <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 relative overflow-hidden">
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-r ${step.color} mb-6 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-10 h-10" />
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                      {step.title}
                    </h3>
                    
                    <p className="text-gray-600 leading-relaxed text-lg">
                      {step.description}
                    </p>

                    {/* Decorative background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-3xl`}></div>
                  </div>

                  {/* Arrow for desktop */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2 text-gray-400 z-20">
                      <ArrowLeft className={`w-8 h-8 ${dir === "rtl" ? "rotate-180" : ""}`} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-white rounded-3xl p-8 shadow-xl max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {dir === "rtl" ? "מוכן להתחיל?" : "Ready to Start?"}
            </h3>
            <p className="text-gray-600 mb-6">
              {dir === "rtl"
                ? "הזמן את הטיפול הראשון שלך עכשיו ותגלה חוויה חדשה של טיפולי יופי"
                : "Book your first treatment now and discover a new experience of beauty treatments"
              }
            </p>
            <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg rounded-full">
              <Link href="/bookings/treatment" className="flex items-center gap-2">
                {dir === "rtl" ? "הזמן עכשיו" : "Book Now"}
                <ArrowLeft className={`w-5 h-5 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
} 