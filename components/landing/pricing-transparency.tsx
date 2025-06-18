"use client"

import { Card, CardContent } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { useTranslation } from "@/lib/translations/i18n"
import { 
  DollarSign, 
  Eye, 
  Shield, 
  CheckCircle, 
  Sparkles,
  TrendingDown
} from "lucide-react"

export function PricingTransparency() {
  const { t } = useTranslation()

  const pricingFeatures = [
    {
      icon: <Eye className="w-8 h-8" />,
      title: "שקיפות מלאה",
      description: "כל המחירים גלויים מראש - ללא עלויות נסתרות או הפתעות",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50 border-blue-200"
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "מחירים הוגנים",
      description: "מחירי טיפולים תחרותיים וידידותיים לכיס",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50 border-green-200"
    },
    {
      icon: <TrendingDown className="w-8 h-8" />,
      title: "הנחות מנויים",
      description: "חסכו עד 30% עם מנויים חודשיים ושנתיים",
      color: "from-purple-500 to-indigo-500",
      bgColor: "bg-purple-50 border-purple-200"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "החזר כספי",
      description: "אם לא מרוצים - החזר כספי מלא עד 24 שעות אחרי הטיפול",
      color: "from-red-500 to-pink-500",
      bgColor: "bg-red-50 border-red-200"
    }
  ]

  const pricingBenefits = [
    "ללא דמי הרשמה או דמי חברות",
    "ביטול חינם עד 2 שעות לפני הטיפול",
    "אפשרות לתשלום במזומן או בכרטיס",
    "קבלות וחשבוניות דיגיטליות",
    "מעקב הוצאות חודשי",
    "הנחות לקבוצות ומשפחות"
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white mb-4">
            <DollarSign className="w-4 h-4 mr-2" />
            תמחור שקוף והוגן
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            בלי הפתעות, בלי עלויות נסתרות
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            אנחנו מאמינים שכל לקוח זכאי לדעת בדיוק כמה הוא משלם ועל מה
          </p>
        </div>

        {/* Pricing Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {pricingFeatures.map((feature, index) => (
            <Card key={index} className={`${feature.bgColor} border-2 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group`}>
              <CardContent className="p-8 text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pricing Benefits */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200">
          <div className="text-center mb-8">
            <Sparkles className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-slate-900 mb-4">מה כלול במחיר?</h3>
            <p className="text-lg text-slate-600">כל היתרונות הללו - ללא עלות נוספת</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pricingBenefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-3 space-x-reverse">
                <div className="flex-shrink-0 text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <span className="text-slate-700 font-medium">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Promise */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-8 md:p-12">
            <h3 className="text-3xl font-bold mb-4">ההבטחה שלנו</h3>
            <p className="text-xl leading-relaxed max-w-4xl mx-auto">
              אם תמצאו שירות דומה במחיר נמוך יותר - נשווה את המחיר + 10% הנחה נוספת!
            </p>
          </div>
        </div>

      </div>
    </section>
  )
} 