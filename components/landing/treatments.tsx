"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Clock, Star, ArrowLeft } from "lucide-react"
import { Button } from "@/components/common/ui/button"
import Link from "next/link"

export function LandingTreatments() {
  const { dir } = useTranslation()

  const treatments = [
    {
      id: 1,
      name: dir === "rtl" ? "עיסוי רילקס מלא" : "Full Relaxation Massage",
      description: dir === "rtl" 
        ? "עיסוי מרגיע ומקצועי לכל הגוף שיעזור לך להשתחרר מלחץ ומתח יומיומי"
        : "Soothing and professional full-body massage to help you release daily stress and tension",
      duration: 90,
      price: 299,
      image: "https://images.unsplash.com/photo-1560253024-c7a0f4340475?w=400&h=300&fit=crop&crop=center",
      rating: 4.9,
      popular: true
    },
    {
      id: 2,
      name: dir === "rtl" ? "טיפול פנים מקצועי" : "Professional Facial Treatment",
      description: dir === "rtl"
        ? "טיפול פנים מעמיק הכולל ניקוי יסודי, קילוף עדין ומסכה מזינה לעור זוהר"
        : "Deep facial treatment including thorough cleansing, gentle peeling and nourishing mask for glowing skin",
      duration: 60,
      price: 199,
      image: "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?w=400&h=300&fit=crop&crop=center",
      rating: 4.8,
      popular: false
    },
    {
      id: 3,
      name: dir === "rtl" ? "מניקור ופדיקור" : "Manicure & Pedicure",
      description: dir === "rtl"
        ? "טיפול מושלם לידיים ולרגליים כולל עיצוב, צביעה וטיפוח מקצועי"
        : "Perfect treatment for hands and feet including shaping, painting and professional care",
      duration: 75,
      price: 149,
      image: "https://images.unsplash.com/photo-1599948128020-9a44fe0d9d16?w=400&h=300&fit=crop&crop=center",
      rating: 4.7,
      popular: false
    },
    {
      id: 4,
      name: dir === "rtl" ? "הסרת שיער בוואקס" : "Waxing Treatment",
      description: dir === "rtl"
        ? "הסרת שיער מקצועית ועדינה עם שעווה איכותית לתוצאות חלקות וארוכות טווח"
        : "Professional and gentle hair removal with quality wax for smooth and long-lasting results",
      duration: 45,
      price: 89,
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center",
      rating: 4.6,
      popular: false
    },
    {
      id: 5,
      name: dir === "rtl" ? "טיפול אנטי אייגינג" : "Anti-Aging Treatment",
      description: dir === "rtl"
        ? "טיפול מתקדם למיצוק העור, הפחתת קמטים ושיפור מרקם העור"
        : "Advanced treatment for skin firming, wrinkle reduction and skin texture improvement",
      duration: 90,
      price: 399,
      image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop&crop=center",
      rating: 5.0,
      popular: true
    },
    {
      id: 6,
      name: dir === "rtl" ? "עיסוי אבנים חמות" : "Hot Stone Massage",
      description: dir === "rtl"
        ? "עיסוי יוקרתי עם אבנים חמות וחלקות לרילקס עמוק וחוויה מיוחדת"
        : "Luxurious massage with hot and smooth stones for deep relaxation and special experience",
      duration: 75,
      price: 349,
      image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop&crop=center",
      rating: 4.9,
      popular: false
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {dir === "rtl" ? "הטיפולים שלנו" : "Our Treatments"}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {dir === "rtl"
              ? "מגוון רחב של טיפולי יופי מקצועיים המבוצעים על ידי מטפלים מיומנים בנוחות הבית שלך"
              : "Wide range of professional beauty treatments performed by skilled therapists in the comfort of your home"
            }
          </p>
        </div>

        {/* Treatments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {treatments.map((treatment) => (
            <div key={treatment.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              {/* Popular Badge */}
              {treatment.popular && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
                  {dir === "rtl" ? "פופולרי" : "Popular"}
                </div>
              )}

              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={treatment.image} 
                  alt={treatment.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {treatment.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-semibold text-gray-700">{treatment.rating}</span>
                  </div>
                </div>

                <p className="text-gray-600 mb-4 leading-relaxed">
                  {treatment.description}
                </p>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">
                      {treatment.duration} {dir === "rtl" ? "דקות" : "min"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600">₪{treatment.price}</span>
                  </div>
                </div>

                <Button 
                  asChild 
                  size="sm" 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Link href="/bookings/treatment" className="flex items-center justify-center gap-2">
                    {dir === "rtl" ? "הזמן טיפול" : "Book Treatment"}
                    <ArrowLeft className={`w-4 h-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl p-8 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              {dir === "rtl" ? "לא מצאת את הטיפול שאתה מחפש?" : "Can't find the treatment you're looking for?"}
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              {dir === "rtl"
                ? "צור איתנו קשר ונעזור לך למצוא את הטיפול המושלם עבורך"
                : "Contact us and we'll help you find the perfect treatment for you"
              }
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
                <Link href="/contact">
                  {dir === "rtl" ? "צור קשר" : "Contact Us"}
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link href="/bookings/treatment">
                  {dir === "rtl" ? "צפה בכל הטיפולים" : "View All Treatments"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 