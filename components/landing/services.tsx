"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Home, Clock, Shield, Star, Headphones, CreditCard } from "lucide-react"

export function LandingServices() {
  const { dir } = useTranslation()

  const services = [
    {
      icon: Home,
      title: dir === "rtl" ? "טיפולים בבית" : "Home Treatments",
      description: dir === "rtl" 
        ? "נהנה מטיפולי יופי מקצועיים בנוחות הבית שלך, ללא צורך לנסוע או להמתין בתורים"
        : "Enjoy professional beauty treatments in the comfort of your home, no need to travel or wait in queues",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Clock,
      title: dir === "rtl" ? "זמינות 24/7" : "24/7 Availability",
      description: dir === "rtl"
        ? "הזמן טיפולים בכל שעה שנוחה לך, כולל סופי שבוע וחגים, עם גמישות מלאה בתאריכים"
        : "Book treatments at any time convenient for you, including weekends and holidays, with full flexibility",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Shield,
      title: dir === "rtl" ? "מטפלים מוסמכים" : "Certified Therapists",
      description: dir === "rtl"
        ? "כל המטפלים שלנו עברו הכשרה מקצועית ומוסמכים, עם ביטוח מלא ובדיקות רקע יסודיות"
        : "All our therapists are professionally trained and certified, with full insurance and thorough background checks",
      color: "from-green-500 to-green-600"
    },
    {
      icon: Star,
      title: dir === "rtl" ? "איכות מובטחת" : "Guaranteed Quality",
      description: dir === "rtl"
        ? "אנו מבטיחים איכות גבוהה בכל טיפול עם אחריות מלאה ומדיניות החזר כספי נוחה"
        : "We guarantee high quality in every treatment with full warranty and comfortable money-back policy",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Headphones,
      title: dir === "rtl" ? "שירות לקוחות מעולה" : "Excellent Support",
      description: dir === "rtl"
        ? "צוות שירות הלקוחות שלנו זמין עבורך בכל שאלה או בעיה, עם מענה מהיר ומקצועי"
        : "Our customer service team is available for any question or issue, with fast and professional response",
      color: "from-pink-500 to-red-500"
    },
    {
      icon: CreditCard,
      title: dir === "rtl" ? "תשלום גמיש" : "Flexible Payment",
      description: dir === "rtl"
        ? "מגוון אפשרויות תשלום נוחות כולל תשלומים, מנויים, ושוברי מתנה עם אבטחה מלאה"
        : "Various convenient payment options including installments, subscriptions, and gift vouchers with full security",
      color: "from-indigo-500 to-purple-500"
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {dir === "rtl" ? "למה בדיוק MASU?" : "Why Choose MASU?"}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {dir === "rtl"
              ? "אנחנו מציעים חוויה ייחודית של טיפולי יופי עם הסטנדרטים הגבוהים ביותר של איכות ושירות"
              : "We offer a unique beauty treatment experience with the highest standards of quality and service"
            }
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <div 
                key={index}
                className="group relative bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              >
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${service.color} mb-6 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-8 h-8" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                  {service.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {service.description}
                </p>

                {/* Hover effect background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl -z-10"></div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full">
            <Star className="w-5 h-5" />
            <span className="font-semibold">
              {dir === "rtl" ? "מעל 10,000 לקוחות מרוצים!" : "Over 10,000 satisfied customers!"}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
} 