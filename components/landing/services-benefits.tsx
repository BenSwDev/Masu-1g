"use client"

import { Card, CardContent } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { useTranslation } from "@/lib/translations/i18n"
import { 
  Heart, 
  Shield, 
  Clock, 
  Star, 
  MapPin, 
  CreditCard, 
  Users, 
  Sparkles,
  CheckCircle,
  Award
} from "lucide-react"

export function ServicesBenefits() {
  const { t } = useTranslation()

  const benefits = [
    {
      icon: <Heart className="w-8 h-8" />,
      title: "טיפולים מקצועיים",
      description: "מטפלים מוסמכים עם ניסיון רב שנים בתחום הבריאות והיופי",
      color: "from-red-500 to-pink-500",
      bgColor: "bg-red-50 border-red-200"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "בטיחות מקסימלית",
      description: "כל המטפלים עברו בדיקות רקע ואימות זהות מלא",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50 border-green-200"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "זמינות 24/7",
      description: "הזמנת טיפולים בכל שעה, בכל יום בשבוע",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50 border-blue-200"
    },
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "שירות עד הבית",
      description: "טיפולים איכותיים בנוחות הבית שלכם",
      color: "from-purple-500 to-indigo-500",
      bgColor: "bg-purple-50 border-purple-200"
    },
    {
      icon: <CreditCard className="w-8 h-8" />,
      title: "תשלום גמיש",
      description: "מגוון אפשרויות תשלום, כולל מנויים וכרטיסי מתנה",
      color: "from-teal-500 to-turquoise-500",
      bgColor: "bg-teal-50 border-teal-200"
    },
    {
      icon: <Star className="w-8 h-8" />,
      title: "דירוג גבוה",
      description: "4.9/5 דירוג ממוצע מ-10,000+ לקוחות מרוצים",
      color: "from-amber-500 to-yellow-500",
      bgColor: "bg-amber-50 border-amber-200"
    }
  ]

  const features = [
    { icon: <CheckCircle className="w-5 h-5" />, text: "ביטול חינם עד 2 שעות לפני הטיפול" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "אפשרות לבחירת מטפל לפי מין" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "מערכת ביקורות ודירוגים שקופה" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "תמיכה טכנית 24/7" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "מחירים שקופים ללא הפתעות" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "זמני הגעה מדויקים" }
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="bg-gradient-to-r from-teal-600 to-turquoise-600 text-white mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            למה בדיוק MASU?
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            השירות הכי מתקדם ואמין
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            אנחנו מביאים אליכם את המטפלים הכי מקצועיים עם הטכנולוגיה הכי מתקדמת
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <Card key={index} className={`${benefit.bgColor} border-2 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group`}>
              <CardContent className="p-8 text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${benefit.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{benefit.title}</h3>
                <p className="text-slate-600 leading-relaxed">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Features */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200">
          <div className="text-center mb-8">
            <Award className="w-12 h-12 text-teal-600 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-slate-900 mb-4">מה עוד אתם מקבלים?</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3 space-x-reverse">
                <div className="flex-shrink-0 text-teal-600">
                  {feature.icon}
                </div>
                <span className="text-slate-700 font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
} 