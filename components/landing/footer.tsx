"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { MasuLogo } from "@/components/common/masu-logo"
import Link from "next/link"
import { Facebook, Instagram, Twitter, Linkedin, Phone, Mail, MapPin, Clock } from "lucide-react"

export function LandingFooter() {
  const { language, dir } = useTranslation()

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

  return (
    <section className="bg-turquoise-100 py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Social Media Links */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {dir === "rtl" ? "שמור על קשר" : "Stay Connected"}
            </h3>
            <div className="flex flex-col space-y-3">
              {socialLinks.map((social, index) => (
                <Link
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-gray-700 hover:text-turquoise-600 transition-colors"
                >
                  <social.icon className="w-5 h-5 mr-2" />
                  <span>{social.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {footerLinks.services.title}
            </h3>
            <div className="flex flex-col space-y-3">
              {footerLinks.services.links.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className="text-gray-700 hover:text-turquoise-600 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Popular Treatments */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {dir === "rtl" ? "טיפולים פופולריים" : "Popular Treatments"}
            </h3>
            <div className="flex flex-col space-y-3">
              <Link href="/treatments/massage" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "עיסוי עד הבית" : "Home Massage"}
              </Link>
              <Link href="/treatments/facial" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "עיסוי בירושלים" : "Massage in Jerusalem"}
              </Link>
              <Link href="/treatments/manicure" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "עיסוי בגבעת שמואל" : "Massage in Givat Shmuel"}
              </Link>
              <Link href="/treatments/pedicure" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "עיסוי בבת חפר" : "Massage in Bat Hefer"}
              </Link>
              <Link href="/treatments/waxing" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "עיסוי בבת גן" : "Massage in Bat Yam"}
              </Link>
              <Link href="/treatments/anti-aging" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "הזמן עכשיו" : "Order Now"}
              </Link>
            </div>
          </div>

          {/* Massage Types */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {dir === "rtl" ? "סוגי עיסויים" : "Massage Types"}
            </h3>
            <div className="flex flex-col space-y-3">
              <Link href="/treatments/swedish" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "עיסוי שוודי" : "Swedish Massage"}
              </Link>
              <Link href="/treatments/deep-tissue" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "עיסוי הקמה עמוק" : "Deep Tissue Massage"}
              </Link>
              <Link href="/treatments/sports" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "עיסוי ספורט" : "Sports Massage"}
              </Link>
              <Link href="/treatments/prenatal" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "עיסוי לנשים בהריון" : "Prenatal Massage"}
              </Link>
              <Link href="/treatments/foot" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "עיסוי רגליים" : "Foot Massage"}
              </Link>
              <Link href="/treatments/reflexology" className="text-gray-700 hover:text-turquoise-600 transition-colors">
                {dir === "rtl" ? "עיסוי רפלקסולוגיה" : "Reflexology"}
              </Link>
            </div>
          </div>

          {/* Masu Info */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <MasuLogo />
            </div>
            <div className="space-y-4">
              {contactInfo.map((contact, index) => (
                <div key={index} className="flex items-start">
                  <contact.icon className="w-5 h-5 text-turquoise-600 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">{contact.title}</div>
                    {contact.href ? (
                      <Link
                        href={contact.href}
                        className="text-gray-700 hover:text-turquoise-600 transition-colors"
                      >
                        {contact.value}
                      </Link>
                    ) : (
                      <div className="text-gray-700">{contact.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </div>
    </section>
  )
}
