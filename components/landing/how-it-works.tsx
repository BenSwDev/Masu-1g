"use client"

import { Card, CardContent } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { useTranslation } from "@/lib/translations/i18n"
import { 
  Search, 
  Calendar, 
  MapPin, 
  Clock,
  CreditCard,
  UserCheck,
  ArrowLeft,
  Sparkles,
  CheckCircle
} from "lucide-react"

export function HowItWorks() {
  const { t } = useTranslation()

  const steps = [
    {
      step: 1,
      icon: <Search className="w-8 h-8" />,
      title: "בחרו טיפול",
      description: "בחרו מתוך מגוון רחב של טיפולים מקצועיים",
      details: [
        "עיסויים טיפוליים",
        "טיפוח פנים וגוף", 
        "פיזיותרפיה",
        "מניקור ופדיקור",
        "ועוד הרבה..."
      ],
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50 border-blue-200",
      buttonText: "צפו בכל הטיפולים"
    },
    {
      step: 2,
      icon: <Calendar className="w-8 h-8" />,
      title: "קבעו מועד",
      description: "בחרו תאריך, שעה ומיקום נוח עבורכם",
      details: [
        "זמינות 24/7",
        "הזמנה עד 30 דקות מראש",
        "בחירת מטפל לפי מין",
        "אפשרות לביטול חינם",
        "התראות SMS"
      ],
      color: "from-teal-500 to-turquoise-500",
      bgColor: "bg-teal-50 border-teal-200",
      buttonText: "הזמינו עכשיו"
    },
    {
      step: 3,
      icon: <UserCheck className="w-8 h-8" />,
      title: "קבלו טיפול",
      description: "המטפל מגיע אליכם עם כל הציוד הנדרש",
      details: [
        "מטפלים מוסמכים",
        "הגעה בזמן",
        "ציוד מקצועי",
        "תשלום דיגיטלי",
        "מעקב ודירוג"
      ],
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50 border-green-200",
      buttonText: "התחילו עכשיו"
    }
  ]

  const benefits = [
    { icon: <Clock className="w-5 h-5" />, text: "חסכון בזמן נסיעה" },
    { icon: <MapPin className="w-5 h-5" />, text: "נוחות הבית שלכם" },
    { icon: <CreditCard className="w-5 h-5" />, text: "מחירים שקופים" },
    { icon: <CheckCircle className="w-5 h-5" />, text: "ביטוח מלא" }
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            איך זה עובד?
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            3 שלבים פשוטים לטיפול מושלם
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            תהליך פשוט ומהיר שמביא את המטפלים הכי טובים עד אליכם הביתה
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          
          {/* Connection Lines */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-teal-200 to-green-200 transform -translate-y-1/2 z-0"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, index) => (
              <div key={step.step} className="relative">
                
                {/* Step Number Circle */}
                <div className="absolute -top-4 right-1/2 transform translate-x-1/2 lg:right-auto lg:left-1/2 lg:-translate-x-1/2">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${step.color} text-white flex items-center justify-center font-bold text-lg shadow-lg border-4 border-white`}>
                    {step.step}
                  </div>
                </div>

                <Card className={`${step.bgColor} border-2 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group pt-8`}>
                  <CardContent className="p-8 text-center">
                    
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${step.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      {step.icon}
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">{step.title}</h3>
                    
                    {/* Description */}
                    <p className="text-slate-600 mb-6 leading-relaxed">{step.description}</p>

                    {/* Details List */}
                    <div className="space-y-3 mb-8">
                      {step.details.map((detail, detailIndex) => (
                        <div key={detailIndex} className="flex items-center justify-start space-x-3 space-x-reverse text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-slate-700">{detail}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Button 
                      className={`w-full bg-gradient-to-r ${step.color} hover:scale-105 transition-transform duration-200 shadow-lg`}
                      size="lg"
                    >
                      {step.buttonText}
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>

                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Strip */}
        <div className="mt-20 bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-slate-200">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">למה ללכת למרפאה?</h3>
            <p className="text-xl text-slate-600">קבלו טיפול מקצועי בנוחות הבית שלכם</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center justify-center space-x-3 space-x-reverse p-4 bg-slate-50 rounded-xl">
                <div className="text-teal-600">
                  {benefit.icon}
                </div>
                <span className="text-slate-700 font-medium text-sm">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 space-x-reverse bg-gradient-to-r from-teal-600 to-turquoise-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer">
            <span>מוכנים להתחיל?</span>
            <ArrowLeft className="w-5 h-5" />
          </div>
        </div>

      </div>
    </section>
  )
} 