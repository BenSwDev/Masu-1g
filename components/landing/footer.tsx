"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { MasuLogo } from "@/components/common/masu-logo"
import Link from "next/link"
import { Facebook, Instagram, Twitter, Linkedin, Phone, Mail, MapPin, Clock } from "lucide-react"

export function LandingFooter() {
  const { language, dir } = useTranslation()
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    services: {
      title: dir === "rtl" ? "שירותים" : "Services",
      links: [
        { name: dir === "rtl" ? "הזמנת טיפול" : "Book Treatment", href: "/bookings/treatment" },
        { name: dir === "rtl" ? "מנויים" : "Subscriptions", href: "/purchase/subscription" },
        { name: dir === "rtl" ? "שוברי מתנה" : "Gift Vouchers", href: "/purchase/gift-voucher" },
        { name: dir === "rtl" ? "טיפולי פנים" : "Facial Treatments", href: "/treatments/facial" },
        { name: dir === "rtl" ? "עיסויים" : "Massages", href: "/treatments/massage" }
      ]
    },
    company: {
      title: dir === "rtl" ? "החברה" : "Company",
      links: [
        { name: dir === "rtl" ? "אודותינו" : "About Us", href: "/about" },
        { name: dir === "rtl" ? "הצוות שלנו" : "Our Team", href: "/team" },
        { name: dir === "rtl" ? "קריירה" : "Careers", href: "/careers" },
        { name: dir === "rtl" ? "בלוג" : "Blog", href: "/blog" },
        { name: dir === "rtl" ? "חדשות" : "News", href: "/news" }
      ]
    },
    support: {
      title: dir === "rtl" ? "תמיכה" : "Support",
      links: [
        { name: dir === "rtl" ? "שאלות נפוצות" : "FAQ", href: "#faq" },
        { name: dir === "rtl" ? "צור קשר" : "Contact", href: "/contact" },
        { name: dir === "rtl" ? "תמיכה טכנית" : "Technical Support", href: "/support" },
        { name: dir === "rtl" ? "מדריך למטפלים" : "Therapist Guide", href: "/therapist-guide" },
        { name: dir === "rtl" ? "מרכז עזרה" : "Help Center", href: "/help" }
      ]
    },
    legal: {
      title: dir === "rtl" ? "משפטי" : "Legal",
      links: [
        { name: dir === "rtl" ? "תנאי שימוש" : "Terms of Service", href: "/terms" },
        { name: dir === "rtl" ? "מדיניות פרטיות" : "Privacy Policy", href: "/privacy" },
        { name: dir === "rtl" ? "הסכם רישיון" : "License Agreement", href: "/license" },
        { name: dir === "rtl" ? "אבטחת מידע" : "Data Security", href: "/security" },
        { name: dir === "rtl" ? "קובצי Cookie" : "Cookie Policy", href: "/cookies" }
      ]
    }
  }

  const contactInfo = [
    {
      icon: Phone,
      title: dir === "rtl" ? "טלפון" : "Phone",
      value: "*6999",
      href: "tel:*6999"
    },
    {
      icon: Mail,
      title: dir === "rtl" ? "אימייל" : "Email",
      value: "hello@masu.co.il",
      href: "mailto:hello@masu.co.il"
    },
    {
      icon: MapPin,
      title: dir === "rtl" ? "כתובת" : "Address",
      value: dir === "rtl" ? "תל אביב, ישראל" : "Tel Aviv, Israel",
      href: null
    },
    {
      icon: Clock,
      title: dir === "rtl" ? "שעות פעילות" : "Hours",
      value: dir === "rtl" ? "24/7" : "24/7",
      href: null
    }
  ]

  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com/masu", label: "Facebook" },
    { icon: Instagram, href: "https://instagram.com/masu", label: "Instagram" },
    { icon: Twitter, href: "https://twitter.com/masu", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com/company/masu", label: "LinkedIn" }
  ]

  const getFooterText = () => {
    switch (language) {
      case "he":
        return `© ${currentYear} Masu. כל הזכויות שמורות.`
      case "ru":
        return `© ${currentYear} Masu. Все права защищены.`
      default:
        return `© ${currentYear} Masu. All rights reserved.`
    }
  }

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-12">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <MasuLogo variant="white" />
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              {dir === "rtl"
                ? "MASU היא הפלטפורמה המובילה לטיפולי יופי בבית. אנחנו מביאים אליך את הטוב ביותר מעולם הספא והיופי, ישירות לנוחות הבית שלך."
                : "MASU is the leading platform for home beauty treatments. We bring you the best from the spa and beauty world, directly to the comfort of your home."
              }
            </p>
            
            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social, index) => {
                const Icon = social.icon
                return (
                  <a
                    key={index}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-800 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors duration-300"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([key, section]) => (
            <div key={key}>
              <h3 className="text-lg font-semibold mb-4 text-white">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link, index) => (
                  <li key={index}>
                    <Link
                      href={link.href}
                      className="text-gray-300 hover:text-white transition-colors duration-300"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <h3 className="text-xl font-semibold mb-6 text-center">
            {dir === "rtl" ? "צור קשר" : "Get in Touch"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, index) => {
              const Icon = info.icon
              const content = (
                <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors duration-300">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">{info.title}</p>
                    <p className="font-semibold text-white">{info.value}</p>
                  </div>
                </div>
              )

              return info.href ? (
                <a key={index} href={info.href} className="block">
                  {content}
                </a>
              ) : (
                <div key={index}>
                  {content}
                </div>
              )
            })}
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-4">
              {dir === "rtl" ? "הישאר מעודכן" : "Stay Updated"}
            </h3>
            <p className="text-gray-300 mb-6">
              {dir === "rtl"
                ? "קבל עדכונים על טיפולים חדשים, הנחות מיוחדות וטיפים לטיפוח"
                : "Get updates on new treatments, special discounts and beauty tips"
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder={dir === "rtl" ? "הכנס את האימייל שלך" : "Enter your email"}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-600 text-white"
              />
              <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors duration-300">
                {dir === "rtl" ? "הירשם" : "Subscribe"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 bg-gray-950">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-gray-400 text-sm">{getFooterText()}</div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span>{dir === "rtl" ? "מיוצר באהבה בישראל" : "Made with ❤️ in Israel"}</span>
              <span>•</span>
              <span>
                {dir === "rtl" ? "אתר מאובטח" : "Secured Site"} 🔒
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
} 