"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Home, Clock, Shield, Star } from "lucide-react"
import { Button } from "@/components/common/ui/button"
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/common/ui/drawer"

export function LandingServices() {
  const { dir } = useTranslation()

  const services = [
    {
      icon: Home,
      title: dir === "rtl" ? "טיפולים בבית" : "Home Treatments",
      description: dir === "rtl" 
        ? "נהנה מעיסויים וטיפולי יופי מקצועיים בנוחות הבית שלך, ללא צורך לנסוע או להמתין בתורים"
        : "Enjoy professional beauty treatments in the comfort of your home, no need to travel or wait in queues",
      color: "from-turquoise-500 to-turquoise-600"
    },
    {
      icon: Clock,
      title: dir === "rtl" ? "זמינות 7 ימים בשבוע ואיכות מובטחת" : "7 Days Availability & Guaranteed Quality",
      description: dir === "rtl"
        ? "הזמן טיפולים 7 ימים בשבוע עם גמישות מלאה בתאריכים, ואיכות גבוהה מובטחת בכל טיפול"
        : "Book treatments 7 days a week with full flexibility in dates, and guaranteed high quality in every treatment",
      color: "from-blue-500 to-blue-600"
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
      title: dir === "rtl" ? "חוויה מושלמת" : "Perfect Experience",
      description: dir === "rtl"
        ? "אנו מתמחים ביצירת חוויה מושלמת ומותאמת אישית לכל לקוח, עם תשומת לב לכל פרט"
        : "We specialize in creating a perfect and personalized experience for every customer, with attention to every detail",
      color: "from-purple-500 to-purple-600"
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
              ? "אנחנו מציעים חוויה ייחודית הכוללת עיסויים, טיפולי פנים, איפור ועיצוב שיער בסטנדרטים הגבוהים ביותר של איכות ושירות"
              : "We offer a unique experience including massages, facials, makeup, and hair styling with the highest standards of quality and service"
            }
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <div
                key={index}
                className="group flex items-center bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg transition-all"
              >
                <div className={`p-3 rounded-lg bg-gradient-to-r ${service.color} text-white shadow-lg mr-4 rtl:ml-4 rtl:mr-0`}> 
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-turquoise-600 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-8">
          <Drawer>
            <DrawerTrigger asChild>
              <Button className="mx-auto" size="lg">
                {t("landing.seeWhatsWaiting")}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{t("landing.whatToExpect")}</DrawerTitle>
              </DrawerHeader>
              <div className="space-y-4">
                <div className="aspect-video">
                  <iframe
                    className="w-full h-full rounded"
                    src="https://www.youtube.com/embed/92m64NPdVak?si=XFbFF1ceBWDiBF2Z"
                    title="YouTube video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <p className="text-sm whitespace-pre-wrap">
                  {t("landing.expectText")}
                </p>
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-turquoise-600 to-blue-600 text-white px-6 py-3 rounded-full">
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