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
    <footer className="flex-shrink-0 border-t bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="text-center text-sm text-gray-600">{getFooterText()}</div>
      </div>
    </footer>
  )
} 