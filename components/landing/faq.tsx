"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import { useTranslation } from "@/lib/translations/i18n"
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  Shield,
  CreditCard,
  MapPin,
  Users,
  Star
} from "lucide-react"

export function FAQ() {
  const { t } = useTranslation()
  const [openQuestion, setOpenQuestion] = useState<number | null>(null)

  const faqCategories = [
    {
      title: "הזמנות וביטולים",
      icon: <Clock className="w-5 h-5" />,
      color: "from-blue-500 to-cyan-500",
      questions: [
        {
          q: "איך מזמינים טיפול?",
          a: "פשוט מאוד! בחרו טיפול, תאריך ושעה, הכניסו פרטי יצירת קשר ותשלום - וזה הכל! תקבלו אישור מיידי ב-SMS ובאימייל."
        },
        {
          q: "כמה זמן מראש צריך להזמין?",
          a: "אפשר להזמין עד 30 דקות מראש, אבל מומלץ להזמין מראש לזמינות טובה יותר. לטיפולים פופולריים או בסופי שבוע מומלץ להזמין יום מראש."
        },
        {
          q: "אפשר לבטל או לשנות הזמנה?",
          a: "כן! ביטול חינם עד 2 שעות לפני הטיפול. שינוי מועד אפשרי עד שעה לפני הטיפול ללא תוספת מחיר."
        },
        {
          q: "מה קורה אם המטפל מאחר?",
          a: "אם המטפל מאחר יותר מ-15 דקות, תקבלו פיצוי של 20% הנחה. אם המטפל לא מגיע, התשלום יוחזר במלואו."
        }
      ]
    },
    {
      title: "מטפלים ובטיחות",
      icon: <Shield className="w-5 h-5" />,
      color: "from-green-500 to-emerald-500",
      questions: [
        {
          q: "איך אתם בוחרים את המטפלים?",
          a: "כל המטפלים שלנו מוסמכים ובעלי ניסיון של לפחות 3 שנים. הם עוברים בדיקות רקע, ראיון אישי, וטסט מעשי לפני ההצטרפות."
        },
        {
          q: "אפשר לבחור מטפל לפי מין?",
          a: "כן! לרוב הטיפולים אפשר לבחור מטפל או מטפלת. זמינות המטפלים משתנה לפי אזור ושעה."
        },
        {
          q: "מה אם לא מרוצה מהטיפול?",
          a: "אם לא מרוצים מהטיפול, צרו קשר תוך 24 שעות ונפתור את הבעיה. במקרים מוצדקים נחזיר את הכסף או נשלח מטפל אחר בחינם."
        },
        {
          q: "המטפלים מבוטחים?",
          a: "כן! כל המטפלים מבוטחים בביטוח אחריות מקצועית ואישית. גם אתם מכוסים בביטוח נזקים במהלך הטיפול."
        }
      ]
    },
    {
      title: "תשלומים ומחירים",
      icon: <CreditCard className="w-5 h-5" />,
      color: "from-purple-500 to-pink-500",
      questions: [
        {
          q: "איך משלמים על הטיפול?",
          a: "התשלום מתבצע מראש דרך האפליקציה או האתר. אנחנו מקבלים כרטיסי אשראי, אפל פיי, גוגל פיי ופיפאל."
        },
        {
          q: "יש עלויות נסתרות?",
          a: "לא! המחיר שאתם רואים כולל הכל: הטיפול, הגעה, ציוד וביטוח. אין תוספות מחיר או הפתעות."
        },
        {
          q: "איך עובד המנוי החודשי?",
          a: "המנוי החודשי כולל 4 טיפולים בהנחה של 25%. הטיפולים תקפים למשך החודש, ואפשר לחדש את המנוי בכל עת."
        },
        {
          q: "אפשר לקבל חשבונית?",
          a: "כן! אפשר לקבל חשבונית רגילה או חשבונית עסקית. החשבונית נשלחת אוטומטית לאימייל לאחר התשלום."
        }
      ]
    },
    {
      title: "הטיפולים עצמם",
      icon: <Users className="w-5 h-5" />,
      color: "from-teal-500 to-turquoise-500",
      questions: [
        {
          q: "איזה ציוד המטפל מביא?",
          a: "המטפל מגיע עם כל הציוד הנדרש: מיטת טיפולים מקצועית, שמנים, מגבות נקיות, ומוזיקה רגועה. אתם לא צריכים להכין כלום."
        },
        {
          q: "איפה מתבצע הטיפול?",
          a: "הטיפול מתבצע בבית שלכם, בחדר שתבחרו. המטפל יעזור לכם להכין את החלל ולארגן אותו בחזרה לאחר הטיפול."
        },
        {
          q: "כמה זמן לוקח הטיפול?",
          a: "משך הטיפול משתנה בין 45-120 דקות תלוי בסוג הטיפול שבחרתם. הזמן כולל הכנה וסיום."
        },
        {
          q: "אפשר לקבל טיפול בזוג?",
          a: "כן! יש לנו טיפולי זוגות מיוחדים עם שני מטפלים שמגיעים יחד. זו חוויה רומנטית ומיוחדת."
        }
      ]
    }
  ]

  const contactOptions = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "צ'אט בזמן אמת",
      description: "תמיכה מיידית 24/7",
      action: "פתחו צ'אט",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "טלפון",
      description: "*1234 או 03-1234567",
      action: "התקשרו עכשיו",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "אימייל",
      description: "support@masu.co.il",
      action: "שלחו הודעה",
      color: "from-purple-500 to-pink-500"
    }
  ]

  const toggleQuestion = (categoryIndex: number, questionIndex: number) => {
    const questionId = categoryIndex * 100 + questionIndex
    setOpenQuestion(openQuestion === questionId ? null : questionId)
  }

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="bg-gradient-to-r from-orange-600 to-red-600 text-white mb-4">
            <HelpCircle className="w-4 h-4 mr-2" />
            שאלות נפוצות
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            יש לכם שאלות? יש לנו תשובות!
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            מצאו תשובות מהירות לשאלות הנפוצות ביותר, או צרו קשר לתמיכה אישית
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-12 mb-20">
          {faqCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              
              {/* Category Header */}
              <div className="flex items-center space-x-3 space-x-reverse mb-8">
                <div className={`p-3 rounded-full bg-gradient-to-r ${category.color} text-white`}>
                  {category.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900">{category.title}</h3>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {category.questions.map((qa, questionIndex) => {
                  const questionId = categoryIndex * 100 + questionIndex
                  const isOpen = openQuestion === questionId

                  return (
                    <Card key={questionIndex} className="bg-white border border-slate-200 hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-0">
                        
                        {/* Question Button */}
                        <button
                          onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                          className="w-full p-6 text-right flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3 space-x-reverse">
                            <span className="text-lg font-semibold text-slate-900">{qa.q}</span>
                          </div>
                          <div className="flex-shrink-0">
                            {isOpen ? (
                              <ChevronUp className="w-5 h-5 text-slate-600" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                        </button>

                        {/* Answer */}
                        {isOpen && (
                          <div className="px-6 pb-6 pt-0">
                            <div className="border-t border-slate-100 pt-4">
                              <p className="text-slate-700 leading-relaxed">{qa.a}</p>
                            </div>
                          </div>
                        )}

                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Options */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-slate-900 mb-4">לא מצאתם את התשובה?</h3>
            <p className="text-lg text-slate-600">צוות התמיכה שלנו כאן לעזור לכם 24/7</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {contactOptions.map((option, index) => (
              <Card key={index} className="bg-white border border-slate-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
                <CardContent className="p-8 text-center">
                  
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${option.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    {option.icon}
                  </div>
                  
                  <h4 className="text-xl font-bold text-slate-900 mb-2">{option.title}</h4>
                  <p className="text-slate-600 mb-6">{option.description}</p>
                  
                  <Button 
                    className={`w-full bg-gradient-to-r ${option.color} hover:scale-105 transition-transform duration-200 shadow-lg text-white`}
                    size="lg"
                  >
                    {option.action}
                  </Button>

                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-gradient-to-r from-teal-600 to-turquoise-600 rounded-3xl p-8 md:p-12">
          <div className="text-center text-white mb-8">
            <Star className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-3xl font-bold mb-4">עצות מהירות להזמנה מוצלחת</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center text-white">
              <div className="bg-white/20 rounded-xl p-4 mb-3">
                <Clock className="w-8 h-8 mx-auto" />
              </div>
              <div className="font-semibold mb-1">הזמינו מראש</div>
              <div className="text-sm opacity-90">לזמינות טובה יותר</div>
            </div>
            
            <div className="text-center text-white">
              <div className="bg-white/20 rounded-xl p-4 mb-3">
                <MapPin className="w-8 h-8 mx-auto" />
              </div>
              <div className="font-semibold mb-1">הכינו מקום</div>
              <div className="text-sm opacity-90">חדר נוח ושקט</div>
            </div>
            
            <div className="text-center text-white">
              <div className="bg-white/20 rounded-xl p-4 mb-3">
                <Phone className="w-8 h-8 mx-auto" />
              </div>
              <div className="font-semibold mb-1">היו זמינים</div>
              <div className="text-sm opacity-90">לקריאה מהמטפל</div>
            </div>
            
            <div className="text-center text-white">
              <div className="bg-white/20 rounded-xl p-4 mb-3">
                <Star className="w-8 h-8 mx-auto" />
              </div>
              <div className="font-semibold mb-1">דרגו ועזרו</div>
              <div className="text-sm opacity-90">לשיפור השירות</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
} 