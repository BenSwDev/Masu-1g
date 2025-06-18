"use client"

import { Card, CardContent } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { useTranslation } from "@/lib/translations/i18n"
import { 
  Heart, 
  Clock, 
  Star, 
  TrendingUp,
  Users,
  Sparkles,
  ArrowLeft,
  Timer,
  DollarSign
} from "lucide-react"
import Image from "next/image"

export function PopularTreatments() {
  const { t } = useTranslation()

  const treatments = [
    {
      id: 1,
      name: "עיסוי רפואי",
      category: "עיסויים",
      description: "עיסוי טיפולי מקצועי לשחרור כאבים ומתחים",
      price: 350,
      duration: 60,
      rating: 4.9,
      reviews: 245,
      image: "/api/placeholder/400/300",
      popular: true,
      benefits: ["הקלה על כאבי גב", "שחרור מתחים", "שיפור הדם"],
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      name: "טיפוח פנים מתקדם",
      category: "יופי",
      description: "טיפול פנים מקצועי עם מוצרים איכותיים",
      price: 450,
      duration: 90,
      rating: 4.8,
      reviews: 189,
      image: "/api/placeholder/400/300",
      popular: true,
      benefits: ["ניקוי עמוק", "הזנה ולחות", "מראה צעיר"],
      color: "from-pink-500 to-rose-500"
    },
    {
      id: 3,
      name: "פיזיותרפיה",
      category: "רפואי",
      description: "טיפול פיזיותרפי מותאם אישית",
      price: 400,
      duration: 45,
      rating: 4.9,
      reviews: 312,
      image: "/api/placeholder/400/300",
      popular: false,
      benefits: ["שיקום פציעות", "חיזוק שרירים", "שיפור גמישות"],
      color: "from-green-500 to-emerald-500"
    },
    {
      id: 4,
      name: "מניקור + פדיקור",
      category: "יופי",
      description: "טיפוח ציפורניים מקצועי בבית",
      price: 280,
      duration: 120,
      rating: 4.7,
      reviews: 156,
      image: "/api/placeholder/400/300",
      popular: true,
      benefits: ["ציפורניים מעוצבות", "הסרת עור קשה", "לק איכותי"],
      color: "from-purple-500 to-indigo-500"
    },
    {
      id: 5,
      name: "עיסוי זוגי",
      category: "רומנטי",
      description: "חוויה רומנטית ומרגיעה לזוגות",
      price: 650,
      duration: 60,
      rating: 4.9,
      reviews: 98,
      image: "/api/placeholder/400/300",
      popular: false,
      benefits: ["חוויה זוגית", "מוזיקה רגועה", "שמנים ארומתרפיים"],
      color: "from-red-500 to-pink-500"
    },
    {
      id: 6,
      name: "עיסוי הריון",
      category: "מיוחד",
      description: "עיסוי מותאם במיוחד לנשים הרות",
      price: 380,
      duration: 50,
      rating: 4.8,
      reviews: 87,
      image: "/api/placeholder/400/300",
      popular: true,
      benefits: ["בטוח לעובר", "הקלה על כאבי גב", "רגיעה"],
      color: "from-amber-500 to-yellow-500"
    }
  ]

  const categories = [
    { name: "עיסויים", count: 12, icon: <Heart className="w-5 h-5" /> },
    { name: "יופי", count: 8, icon: <Sparkles className="w-5 h-5" /> },
    { name: "רפואי", count: 6, icon: <Users className="w-5 h-5" /> },
    { name: "מיוחד", count: 4, icon: <Star className="w-5 h-5" /> }
  ]

  const formatPrice = (price: number) => {
    return `₪${price}`
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
        <span className="mr-1 text-sm font-medium">{rating}</span>
      </div>
    )
  }

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white mb-4">
            <TrendingUp className="w-4 h-4 mr-2" />
            הכי פופולריים
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            הטיפולים המבוקשים ביותר
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            גלו את הטיפולים שהלקוחות שלנו הכי אוהבים ומזמינים שוב ושוב
          </p>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category, index) => (
            <Badge key={index} variant="outline" className="px-4 py-2 border-2 border-teal-200 text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer">
              {category.icon}
              <span className="mr-2">{category.name}</span>
              <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded-full text-xs">
                {category.count}
              </span>
            </Badge>
          ))}
        </div>

        {/* Treatments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {treatments.map((treatment) => (
            <Card key={treatment.id} className="group bg-white border border-slate-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden">
              
              {/* Image Container */}
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={treatment.image}
                  alt={treatment.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {treatment.popular && (
                  <Badge className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    פופולרי
                  </Badge>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>

              <CardContent className="p-6">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-xs font-medium">
                    {treatment.category}
                  </Badge>
                  <div className="flex items-center space-x-1 space-x-reverse">
                    {renderStars(treatment.rating)}
                    <span className="text-xs text-slate-500">({treatment.reviews})</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-teal-600 transition-colors">
                  {treatment.name}
                </h3>

                {/* Description */}
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  {treatment.description}
                </p>

                {/* Benefits */}
                <div className="space-y-2 mb-6">
                  {(treatment.benefits || []).slice(0, 3).map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-2 space-x-reverse text-xs">
                      <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                      <span className="text-slate-600">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Price & Duration */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="flex items-center space-x-1 space-x-reverse text-sm text-slate-600">
                      <Timer className="w-4 h-4" />
                      <span>{treatment.duration} דק׳</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-teal-600">
                    {formatPrice(treatment.price)}
                  </div>
                </div>

                {/* CTA Button */}
                <Button 
                  className={`w-full bg-gradient-to-r ${treatment.color} hover:scale-105 transition-transform duration-200 shadow-lg text-white`}
                  size="lg"
                >
                  הזמינו עכשיו
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>

              </CardContent>
            </Card>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center">
          <Button 
            variant="outline" 
            size="lg" 
            className="border-2 border-teal-600 text-teal-700 hover:bg-teal-50 px-8 py-4 text-lg font-semibold"
          >
            צפו בכל הטיפולים
            <ArrowLeft className="w-5 h-5 mr-2" />
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="mt-20 bg-gradient-to-r from-teal-600 to-turquoise-600 rounded-3xl p-8 md:p-12 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">30+</div>
              <div className="text-lg opacity-90">סוגי טיפולים</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-lg opacity-90">מטפלים מוסמכים</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-lg opacity-90">זמינות מלאה</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
} 