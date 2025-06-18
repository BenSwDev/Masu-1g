"use client"

import { Card, CardContent } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { useTranslation } from "@/lib/translations/i18n"
import { Star, Quote, Heart, CheckCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/common/ui/avatar"

export function Testimonials() {
  const { t } = useTranslation()

  const testimonials = [
    {
      id: 1,
      name: "רחל כהן",
      location: "תל אביב",
      rating: 5,
      treatment: "עיסוי רפואי",
      image: "/api/placeholder/150/150",
      comment: "שירות מדהים! המטפלת הגיעה בזמן, מקצועית מאוד ועיסוי מעולה. בהחלט אזמין שוב!",
      verified: true,
      date: "לפני שבוע"
    },
    {
      id: 2,
      name: "דן לוי",
      location: "חיפה",
      rating: 5,
      treatment: "פיזיותרפיה",
      image: "/api/placeholder/150/150",
      comment: "הפיזיותרפיסט היה מצוין, עזר לי עם בעיות הגב. המערכת נוחה מאוד לשימוש.",
      verified: true,
      date: "לפני 3 ימים"
    },
    {
      id: 3,
      name: "שירה אברהם",
      location: "ירושלים",
      rating: 5,
      treatment: "טיפוח פנים",
      image: "/api/placeholder/150/150",
      comment: "טיפול פנים מדהים בבית! נוח, מקצועי ותוצאות מעולות. ממליצה בחום!",
      verified: true,
      date: "לפני יומיים"
    },
    {
      id: 4,
      name: "אמיר כץ",
      location: "פתח תקווה",
      rating: 5,
      treatment: "עיסוי שוודי",
      image: "/api/placeholder/150/150",
      comment: "עיסוי מרגיע ומשחרר. המטפל מקצועי וידע בדיוק מה אני צריך.",
      verified: true,
      date: "לפני 5 ימים"
    },
    {
      id: 5,
      name: "מיכל רוזן",
      location: "רעננה",
      rating: 5,
      treatment: "מניקור + פדיקור",
      image: "/api/placeholder/150/150",
      comment: "שירות VIP בבית! המניקוריסטית הגיעה עם כל הציוד, תוצאה מושלמת.",
      verified: true,
      date: "אתמול"
    },
    {
      id: 6,
      name: "אלון יוסף",
      location: "הרצליה",
      rating: 5,
      treatment: "עיסוי ספורט",
      image: "/api/placeholder/150/150",
      comment: "כספורטאי, אני צריך עיסויים קבועים. השירות מעולה ונוח מאוד!",
      verified: true,
      date: "לפני 4 ימים"
    }
  ]

  const stats = [
    { number: "10,000+", label: "לקוחות מרוצים" },
    { number: "4.9/5", label: "דירוג ממוצע" },
    { number: "15,000+", label: "טיפולים בוצעו" },
    { number: "99%", label: "שיעור שביעות רצון" }
  ]

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="bg-gradient-to-r from-pink-600 to-rose-600 text-white mb-4">
            <Heart className="w-4 h-4 mr-2" />
            עדויות לקוחות
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            מה הלקוחות שלנו אומרים?
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            עדויות אמיתיות מלקוחות מרוצים שחוו את השירות המעולה שלנו
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-teal-600 mb-2">
                {stat.number}
              </div>
              <div className="text-slate-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="bg-white border border-slate-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
              <CardContent className="p-6">
                
                {/* Quote Icon */}
                <div className="mb-4">
                  <Quote className="w-8 h-8 text-teal-600 opacity-70" />
                </div>

                {/* Rating */}
                <div className="flex items-center justify-between mb-4">
                  {renderStars(testimonial.rating)}
                  <Badge className="bg-teal-100 text-teal-700 text-xs">
                    {testimonial.treatment}
                  </Badge>
                </div>

                {/* Comment */}
                <p className="text-slate-700 leading-relaxed mb-6 text-sm">
                  "{testimonial.comment}"
                </p>

                {/* User Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={testimonial.image} alt={testimonial.name} />
                      <AvatarFallback className="bg-teal-100 text-teal-700 font-semibold">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="font-semibold text-slate-900 text-sm">
                          {testimonial.name}
                        </div>
                        {testimonial.verified && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{testimonial.location}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">{testimonial.date}</div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-teal-600 to-turquoise-600 rounded-3xl p-8 md:p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">
            רוצים להצטרף למשפחת הלקוחות המרוצים?
          </h3>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            הזמינו את הטיפול הראשון שלכם עוד היום וגלו למה אלפי לקוחות בוחרים בנו
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-teal-600 px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-colors duration-300 shadow-lg">
              הזמינו טיפול עכשיו
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-teal-600 transition-colors duration-300">
              צפו בעוד עדויות
            </button>
          </div>
        </div>

      </div>
    </section>
  )
} 