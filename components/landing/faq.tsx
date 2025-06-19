"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react"

export function LandingFAQ() {
  const { dir } = useTranslation()
  const [openItem, setOpenItem] = useState<number | null>(0)

  const faqs = [
    {
      question: dir === "rtl" ? "איך עובד השירות של MASU?" : "How does MASU's service work?",
      answer: dir === "rtl" 
        ? "השירות שלנו פשוט מאוד: אתה בוחר טיפול באפליקציה או באתר, קובע תאריך ושעה נוחים, ומטפל מקצועי מגיע אליך הביתה עם כל הציוד הנדרש. התשלום מתבצע בתום הטיפול."
        : "Our service is very simple: you choose a treatment in the app or website, set a convenient date and time, and a professional therapist comes to your home with all required equipment. Payment is made after the treatment."
    },
    {
      question: dir === "rtl" ? "האם המטפלים מקצועיים ומוסמכים?" : "Are the therapists professional and certified?",
      answer: dir === "rtl"
        ? "כמובן! כל המטפלים שלנו עברו הכשרה מקצועית מקיפה, מוסמכים על ידי הרשויות המוסמכות, ועוברים בדיקות רקע יסודיות. בנוסף, יש לנו ביטוח מלא לכל הטיפולים."
        : "Of course! All our therapists have undergone comprehensive professional training, are certified by authorized authorities, and undergo thorough background checks. In addition, we have full insurance for all treatments."
    },
    {
      question: dir === "rtl" ? "כמה זמן לפני הטיפול צריך להזמין?" : "How far in advance should I book before the treatment?",
      answer: dir === "rtl"
        ? "אנחנו ממליצים להזמין לפחות 24 שעות מראש כדי להבטיח זמינות. עם זאת, במקרים רבים נוכל לספק טיפולים גם באותו היום, בהתאם לזמינות המטפלים באזור שלך."
        : "We recommend booking at least 24 hours in advance to ensure availability. However, in many cases we can provide same-day treatments, subject to therapist availability in your area."
    },
    {
      question: dir === "rtl" ? "מה קורה אם אני צריך לבטל או לדחות?" : "What happens if I need to cancel or reschedule?",
      answer: dir === "rtl"
        ? "ביטול עד 24 שעות לפני הטיפול הוא ללא תשלום. שינוי מועד ניתן עד 4 שעות לפני הטיפול ללא תשלום נוסף. ביטול מתחת ל-24 שעות יגרור תשלום של 50% מעלות הטיפול."
        : "Cancellation up to 24 hours before treatment is free. Rescheduling is possible up to 4 hours before treatment without additional payment. Cancellation under 24 hours will incur a payment of 50% of treatment cost."
    },
    {
      question: dir === "rtl" ? "איך מתבצע התשלום?" : "How is payment made?",
      answer: dir === "rtl"
        ? "התשלום מתבצע בתום הטיפול דרך האפליקציה, בכרטיס אשראי או PayPal. לחברי מנוי, החיוב הוא חודשי אוטומטי. אנחנו לא מקבלים מזומן."
        : "Payment is made after treatment through the app, by credit card or PayPal. For subscription members, billing is automatic monthly. We do not accept cash."
    },
    {
      question: dir === "rtl" ? "באילו אזורים אתם משרתים?" : "Which areas do you serve?",
      answer: dir === "rtl"
        ? "אנחנו משרתים כרגע את גוש דן, ירושלים, חיפה והקריות, באר שבע ואילת. אנחנו מתרחבים כל הזמן ומוסיפים אזורים חדשים. בדוק באתר או באפליקציה את הזמינות באזור שלך."
        : "We currently serve Greater Tel Aviv, Jerusalem, Haifa and the Krayot, Beer Sheva and Eilat. We are constantly expanding and adding new areas. Check the website or app for availability in your area."
    },
    {
      question: dir === "rtl" ? "מה כלול במחיר הטיפול?" : "What is included in the treatment price?",
      answer: dir === "rtl"
        ? "המחיר כולל את כל הציוד הנדרש, חומרי הטיפול, הגעת המטפל לביתך ואת הטיפול עצמו. אין עלויות נוספות למטפל או ציוד. היחיד שעלול להיות חיוב נוסף הוא זמן המתנה מעל 15 דקות."
        : "The price includes all required equipment, treatment materials, therapist arrival to your home and the treatment itself. There are no additional costs for therapist or equipment. The only possible additional charge is waiting time over 15 minutes."
    },
    {
      question: dir === "rtl" ? "איך אני יודע שהמטפל בדרך?" : "How do I know the therapist is on the way?",
      answer: dir === "rtl"
        ? "תקבל התראות SMS ודחיפה באפליקציה כשהמטפל יוצא לדרך, כולל זמן הגעה משוער. תוכל גם לעקוב אחר המיקום שלו בזמן אמת דרך האפליקציה, בדיוק כמו ברכב שירות."
        : "You'll receive SMS and push notifications in the app when the therapist is on the way, including estimated arrival time. You can also track their location in real-time through the app, just like with a ride service."
    }
  ]

  const toggleItem = (index: number) => {
    setOpenItem(openItem === index ? null : index)
  }

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-turquoise-100 text-turquoise-800 px-4 py-2 rounded-full mb-6">
            <HelpCircle className="w-5 h-5" />
            <span className="font-semibold">{dir === "rtl" ? "שאלות נפוצות" : "FAQ"}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {dir === "rtl" ? "שאלות שאנחנו מקבלים הכי הרבה" : "Questions We Get Asked Most"}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {dir === "rtl"
              ? "כל מה שרצית לדעת על השירות שלנו, במקום אחד נוח"
              : "Everything you wanted to know about our service, in one convenient place"
            }
          </p>
        </div>

        {/* FAQ Items */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-xl"
              >
                <button
                  onClick={() => toggleItem(index)}
                  className={`w-full px-6 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    openItem === index ? 'bg-turquoise-50' : ''
                  }`}
                >
                  <h3 className="text-lg font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  <div className="flex-shrink-0">
                    {openItem === index ? (
                      <ChevronUp className="w-6 h-6 text-turquoise-600" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </button>
                
                {openItem === index && (
                  <div className="px-6 pb-6">
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-gray-700 leading-relaxed text-lg">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
} 