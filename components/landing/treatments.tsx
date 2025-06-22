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

        {/* Pricing Table */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              {dir === "rtl" ? "·· מחירון ··" : "·· Price List ··"}
            </h3>
            <p className="text-lg text-gray-600">
              {dir === "rtl" 
                ? "תמחור פשוט – כל התשלומים וההוצאות למטפל כלולים במחיר"
                : "Simple pricing – all payments and therapist expenses included in the price"
              }
            </p>
          </div>

          <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-turquoise-50 border-b border-turquoise-200">
                  <tr>
                    <th className="text-right p-4 font-bold text-gray-800">
                      {dir === "rtl" ? "סוג טיפול" : "Treatment Type"}
                    </th>
                    <th className="text-center p-4 font-bold text-gray-800">
                      {dir === "rtl" ? "60 דק'" : "60 min"}
                    </th>
                    <th className="text-center p-4 font-bold text-gray-800">
                      {dir === "rtl" ? "75 דק'" : "75 min"}
                    </th>
                    <th className="text-center p-4 font-bold text-gray-800">
                      {dir === "rtl" ? "90 דק'" : "90 min"}
                    </th>
                    <th className="text-center p-4 font-bold text-gray-800">
                      {dir === "rtl" ? "120 דק'" : "120 min"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl" ? "עיסוי שוודי" : "Swedish Massage"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪320</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪380</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪440</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪580</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl" ? "עיסוי רקמות עמוק" : "Deep Tissue Massage"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪370</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪430</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪490</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪630</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl" ? "עיסוי נשים הרות" : "Prenatal Massage"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪320</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪380</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪440</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪580</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl" ? "עיסוי ספורטאים" : "Sports Massage"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪370</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪430</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪490</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪630</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl" ? "עיסוי רגליים" : "Foot Massage"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪370</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪430</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪490</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪630</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl" ? "עיסוי קצוות (רגליים, ראש וצוואר)" : "Targeted Massage (feet, head & neck)"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪320</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪380</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪440</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪580</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-8 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                {dir === "rtl" 
                  ? "* שימו לב, מחירי טיפולים החל משעה 20:00, בימים שישי, שבת ובמועדים מיוחדים הינם בתוספת של 50 ש\"ח לטיפול."
                  : "* Please note, treatment prices from 8:00 PM, on Fridays, Saturdays and special holidays are with an additional 50 NIS per treatment."
                }
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                {dir === "rtl" 
                  ? "עיסויים מיוחדים : עיסוי תאילנדי, עיסוי אבנים חמות ניתן להזמין בתיאום מול נציג השירות"
                  : "Special massages: Thai massage, hot stone massage can be ordered in coordination with the service representative"
                }
              </p>
            </div>
          </div>
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
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-turquoise-600 transition-colors">
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
                    <span className="text-2xl font-bold text-turquoise-600">₪{treatment.price}</span>
                  </div>
                </div>

                <Button 
                  asChild 
                  size="sm" 
                  className="w-full bg-turquoise-600 hover:bg-turquoise-700 text-white"
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
      </div>
    </section>
  )
} 