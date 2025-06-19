"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Search, Calendar, Sparkles } from "lucide-react"

export function LandingHowItWorks() {
  const { dir } = useTranslation()

  const steps = [
    {
      step: 1,
      icon: Search,
      title: dir === "rtl" ? "בחר טיפול" : "Choose Treatment",
      description: dir === "rtl" 
        ? "בחר מתוך מגוון רחב של טיפולי יופי מקצועיים המותאמים לצרכים שלך"
        : "Choose from a wide range of professional beauty treatments tailored to your needs",
      color: "from-turquoise-500 to-turquoise-600"
    },
    {
      step: 2,
      icon: Calendar,
      title: dir === "rtl" ? "קבע זמן" : "Schedule Time",
      description: dir === "rtl"
        ? "בחר תאריך ושעה נוחים לך, והמטפל יגיע אליך הביתה עם כל הציוד הנדרש"
        : "Choose a convenient date and time, and the therapist will come to your home with all required equipment",
      color: "from-blue-500 to-blue-600"
    },
    {
      step: 3,
      icon: Sparkles,
      title: dir === "rtl" ? "תהנה מהטיפול" : "Enjoy Treatment",
      description: dir === "rtl"
        ? "רגע אמת! תיהנה מטיפול מקצועי ברמה הגבוהה ביותר בנוחות הבית שלך"
        : "Moment of truth! Enjoy professional treatment at the highest level in the comfort of your home",
      color: "from-purple-500 to-purple-600"
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-turquoise-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {dir === "rtl" ? "איך זה עובד?" : "How It Works?"}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {dir === "rtl"
              ? "3 שלבים פשוטים להזמנת טיפול יופי מקצועי עד הבית"
              : "3 simple steps to book professional beauty treatment to your home"
            }
          </p>
        </div>

        {/* Steps */}
        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="relative group">
                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-turquoise-300 to-blue-300 z-0 transform translate-x-4"></div>
                  )}
                  
                  {/* Step Card */}
                  <div className="relative bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 z-10">
                    {/* Step Number */}
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${step.color} text-white font-bold text-xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {step.step}
                    </div>

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                      <div className={`p-4 rounded-2xl bg-gradient-to-r ${step.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-8 h-8" />
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center group-hover:text-turquoise-600 transition-colors">
                      {step.title}
                    </h3>
                    
                    <p className="text-gray-600 leading-relaxed text-center">
                      {step.description}
                    </p>

                    {/* Hover effect background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-turquoise-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl -z-10"></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom Message */}
        <div className="text-center mt-16">
          <div className="inline-block bg-white rounded-2xl p-6 shadow-lg border border-turquoise-200">
            <p className="text-lg font-semibold text-gray-900 mb-2">
              {dir === "rtl" ? "מוכן להתחיל?" : "Ready to get started?"}
            </p>
            <p className="text-gray-600">
              {dir === "rtl" 
                ? "הטיפול הבא שלך רק כמה לחיצות מפה"
                : "Your next treatment is just a few clicks away"
              }
            </p>
          </div>
        </div>
      </div>
    </section>
  )
} 