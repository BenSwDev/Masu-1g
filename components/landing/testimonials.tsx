"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

export function LandingTestimonials() {
  const { dir } = useTranslation()
  const [currentSlide, setCurrentSlide] = useState(0)
  const isMobile = useIsMobile()

  const testimonials = [
    {
      id: 1,
      name: dir === "rtl" ? "שרה כהן" : "Sarah Cohen",
      location: dir === "rtl" ? "תל אביב" : "Tel Aviv",
      rating: 5,
      text:
        dir === "rtl"
          ? "חוויה פשוט מדהימה! המטפלת הגיעה בזמן, הייתה מקצועית ונעימה. הטיפול היה ברמה הכי גבוהה שחוויתי אי פעם."
          : "Simply amazing experience! The therapist arrived on time, was professional and pleasant. The treatment was of the highest level I've ever experienced.",
      treatment: dir === "rtl" ? "עיסוי רילקס מלא" : "Full Relaxation Massage",
      image:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    },
    {
      id: 2,
      name: dir === "rtl" ? "מיכאל לוי" : "Michael Levy",
      location: dir === "rtl" ? "חיפה" : "Haifa",
      rating: 5,
      text:
        dir === "rtl"
          ? "כבר שנה שאני מנוי ב-MASU וזה פשוט שינה לי את החיים. איכות השירות מעולה, המטפלים מקצועיים ונוח לי להזמין טיפולים מהבית."
          : "I've been a MASU subscriber for a year and it simply changed my life. Service quality is excellent, therapists are professional.",
      treatment: dir === "rtl" ? "מנוי חודשי" : "Monthly Subscription",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    },
    {
      id: 3,
      name: dir === "rtl" ? "רחל אברהם" : "Rachel Abraham",
      location: dir === "rtl" ? "ירושלים" : "Jerusalem",
      rating: 5,
      text:
        dir === "rtl"
          ? "טיפול הפנים שקיבלתי היה פשוט מושלם. המטפלת הבינה בדיוק מה העור שלי צריך והתוצאות היו מדהימות."
          : "The facial treatment I received was simply perfect. The therapist understood exactly what my skin needed and the results were amazing.",
      treatment: dir === "rtl" ? "טיפול פנים מקצועי" : "Professional Facial Treatment",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    },
    {
      id: 4,
      name: dir === "rtl" ? "דני שמעון" : "Danny Shimon",
      location: dir === "rtl" ? "באר שבע" : "Beer Sheva",
      rating: 5,
      text:
        dir === "rtl"
          ? "בתור גבר הייתי קצת מהסס בהתחלה, אבל הטיפול היה כל כך מקצועי ונעים. המטפל הסביר לי הכל והרגשתי בנוח."
          : "As a man I was a bit hesitant at first, but the treatment was so professional and pleasant. The therapist explained everything to me.",
      treatment: dir === "rtl" ? "עיסוי אבנים חמות" : "Hot Stone Massage",
      image:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    },
    {
      id: 5,
      name: dir === "rtl" ? "נועה גרין" : "Noa Green",
      location: dir === "rtl" ? "רמת גן" : "Ramat Gan",
      rating: 5,
      text:
        dir === "rtl"
          ? "השירות של MASU פשוט חיסך לי המון זמן. במקום לנסוע לספא, הספא בא אלי הביתה. המחירים הוגנים והאיכות מעולה."
          : "MASU's service simply saved me a lot of time. Instead of traveling to a spa, the spa comes to my home. Fair prices and excellent quality.",
      treatment: dir === "rtl" ? "מניקור ופדיקור" : "Manicure & Pedicure",
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    },
    {
      id: 6,
      name: dir === "rtl" ? "אלון דוד" : "Alon David",
      location: dir === "rtl" ? "נתניה" : "Netanya",
      rating: 5,
      text:
        dir === "rtl"
          ? "טיפול האנטי אייגינג שקיבלתי היה מעבר לציפיות. המטפלת הייתה מקצועית מאוד והסבירה לי על כל שלב."
          : "The anti-aging treatment I received exceeded expectations. The therapist was very professional and explained each step to me.",
      treatment: dir === "rtl" ? "טיפול אנטי אייגינג" : "Anti-Aging Treatment",
      image:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face",
    },
    {
      id: 7,
      name: dir === "rtl" ? "לי רון" : "Lee Ron",
      location: dir === "rtl" ? "הרצליה" : "Herzliya",
      rating: 5,
      text:
        dir === "rtl"
          ? "הזמנתי עיסוי רקמות עמוק והמטפלת הייתה פשוט מעולה. הזמינות נוחה והמחיר משתלם."
          : "I ordered a deep tissue massage and the therapist was excellent. Convenient availability and reasonable price.",
      treatment: dir === "rtl" ? "עיסוי רקמות עמוק" : "Deep Tissue Massage",
      image:
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face",
    },
    {
      id: 8,
      name: dir === "rtl" ? "יעל פרץ" : "Yael Peretz",
      location: dir === "rtl" ? "אשדוד" : "Ashdod",
      rating: 5,
      text:
        dir === "rtl"
          ? "השירות של MASU תמיד מדויק ומקצועי. אני מרוצה כל פעם מחדש."
          : "MASU's service is always precise and professional. I'm satisfied every time.",
      treatment: dir === "rtl" ? "טיפול פדיקור" : "Pedicure Treatment",
      image:
        "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=100&h=100&fit=crop&crop=face",
    },
    {
      id: 9,
      name: dir === "rtl" ? "עידן כהן" : "Idan Cohen",
      location: dir === "rtl" ? "ראשון לציון" : "Rishon LeZion",
      rating: 5,
      text:
        dir === "rtl"
          ? "הגיעו אליי בזמן והביאו את כל הציוד הנדרש. מרגיש כמו ספא בבית."
          : "They arrived on time and brought all necessary equipment. Feels like a spa at home.",
      treatment: dir === "rtl" ? "טיפול ספא בבית" : "Home Spa Treatment",
      image:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face",
    },
    {
      id: 10,
      name: dir === "rtl" ? "גלית מזרחי" : "Galit Mizrahi",
      location: dir === "rtl" ? "טבריה" : "Tiberias",
      rating: 5,
      text:
        dir === "rtl"
          ? "הזמנתי טיפול מהיום למחר וקיבלתי שירות מעולה בלי פשרות."
          : "I booked a last-minute treatment and received excellent uncompromising service.",
      treatment: dir === "rtl" ? "טיפול אקספרס" : "Express Treatment",
      image:
        "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&h=100&fit=crop&crop=face",
    },
    {
      id: 11,
      name: dir === "rtl" ? "אסף לוי" : "Asaf Levi",
      location: dir === "rtl" ? "אשקלון" : "Ashkelon",
      rating: 5,
      text:
        dir === "rtl"
          ? "שירות מקצועי ומהיר, המטפל הגיע בדיוק בזמן והטיפול היה מצוין."
          : "Professional and fast service, the therapist arrived on time and the treatment was excellent.",
      treatment: dir === "rtl" ? "עיסוי שוודי" : "Swedish Massage",
      image:
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face",
    },
    {
      id: 12,
      name: dir === "rtl" ? "חני כהן" : "Hani Cohen",
      location: dir === "rtl" ? "רעננה" : "Ra'anana",
      rating: 5,
      text:
        dir === "rtl"
          ? "היה לי יום פינוק מושלם. תודה על השירות המעולה!"
          : "Had a perfect pampering day. Thanks for the excellent service!",
      treatment: dir === "rtl" ? "יום פינוק" : "Pamper Day",
      image:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    },
  ]

  const stats = [
    {
      number: "4.9",
      label: dir === "rtl" ? "דירוג ממוצע" : "Average Rating",
      suffix: "/5",
    },
    {
      number: "10,000+",
      label: dir === "rtl" ? "ביקורות חיוביות" : "Positive Reviews",
      suffix: "",
    },
    {
      number: "98%",
      label: dir === "rtl" ? "שביעות רצון" : "Satisfaction Rate",
      suffix: "",
    },
    {
      number: "500+",
      label: dir === "rtl" ? "מטפלים מקצועיים" : "Professional Therapists",
      suffix: "",
    },
  ]

  const itemsPerSlide = isMobile ? 1 : 4
  const maxSlides = Math.ceil(testimonials.length / itemsPerSlide)

  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % maxSlides)
  }, [maxSlides])

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + maxSlides) % maxSlides)
  }, [maxSlides])

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 5000)
    return () => clearInterval(timer)
  }, [nextSlide])

  // Ensure we don't show an out-of-range slide when screen size changes
  useEffect(() => {
    setCurrentSlide(0)
  }, [maxSlides])

  const getCurrentSlideItems = () => {
    const startIndex = currentSlide * itemsPerSlide
    return testimonials.slice(startIndex, startIndex + itemsPerSlide)
  }

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {dir === "rtl" ? "מה הלקוחות שלנו אומרים" : "What Our Customers Say"}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {dir === "rtl"
              ? "אלפי לקוחות מרוצים שחווים את החוויה הייחודית של MASU מדי יום"
              : "Thousands of satisfied customers experience MASU's unique experience every day"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 bg-gradient-to-br from-turquoise-50 to-blue-50 rounded-2xl"
            >
              <div className="text-3xl md:text-4xl font-bold text-turquoise-600 mb-2">
                {stat.number}
                {stat.suffix}
              </div>
              <div className="text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials Slider */}
        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-turquoise-50 transition-colors ${
              dir === "rtl" ? "rotate-180" : ""
            }`}
          >
            <ChevronLeft className="w-6 h-6 text-turquoise-600" />
          </button>

          <button
            onClick={nextSlide}
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-turquoise-50 transition-colors ${
              dir === "rtl" ? "rotate-180" : ""
            }`}
          >
            <ChevronRight className="w-6 h-6 text-turquoise-600" />
          </button>

          {/* Testimonials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-16">
            {getCurrentSlideItems().map(testimonial => (
              <div
                key={testimonial.id}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                {/* Quote Icon */}
                <div className="flex justify-center mb-4">
                  <Quote className="w-8 h-8 text-turquoise-600 opacity-50" />
                </div>

                {/* Rating */}
                <div className="flex justify-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-gray-700 mb-6 leading-relaxed text-center italic text-sm">
                  "{testimonial.text}"
                </p>

                {/* Treatment */}
                <div className="text-center mb-4">
                  <span className="inline-block bg-turquoise-100 text-turquoise-800 px-3 py-1 rounded-full text-xs font-medium">
                    {testimonial.treatment}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="flex items-center justify-center gap-3">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                  />
                  <div className="text-center">
                    <div className="font-semibold text-gray-900 text-sm">{testimonial.name}</div>
                    <div className="text-xs text-gray-600">{testimonial.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Slide Indicators */}
          <div className="flex justify-center mt-8 gap-2">
            {Array.from({ length: maxSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  currentSlide === index ? "bg-turquoise-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Service Charter */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-turquoise-500 to-blue-600 rounded-3xl p-8 text-white max-w-5xl mx-auto">
            <h3 className="text-3xl font-bold mb-8">
              {dir === "rtl" ? "אמנת השירות" : "Service Charter"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
              <div className="bg-white/10 rounded-2xl p-6">
                <p className="text-lg text-white leading-relaxed">
                  {dir === "rtl"
                    ? "עיסוי צריך להיות חוויה מרגיעה, ללא דאגות. במאסו תמיד תקבלו את אותו טיפול איכותי במחיר קבוע ותהליך הזמנה פשוט"
                    : "Massage should be a relaxing experience, worry-free. At MASU you will always receive the same quality treatment at a fixed price and simple booking process"}
                </p>
              </div>

              <div className="bg-white/10 rounded-2xl p-6">
                <p className="text-lg text-white leading-relaxed">
                  {dir === "rtl"
                    ? "המטפלים שלנו מקצועים, אמינים ונדרשים לשמור על רמת הגיינה גבוהה"
                    : "Our therapists are professional, reliable and required to maintain a high level of hygiene"}
                </p>
              </div>

              <div className="bg-white/10 rounded-2xl p-6">
                <p className="text-lg text-white leading-relaxed">
                  {dir === "rtl"
                    ? "עם מאסו תמיד תדע בדיוק מי יטפל בך ובדיוק מתי הוא יגיע"
                    : "With MASU you will always know exactly who will treat you and exactly when they will arrive"}
                </p>
              </div>

              <div className="bg-white/10 rounded-2xl p-6">
                <p className="text-lg text-white leading-relaxed">
                  {dir === "rtl"
                    ? "תהליך הזמנה פשוט ומהיר ללא עלויות נסתרות והוצאות נוספות"
                    : "Simple and fast booking process with no hidden costs and additional expenses"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
