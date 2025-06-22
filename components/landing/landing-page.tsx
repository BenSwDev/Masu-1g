"use client"

import { LandingHeader } from "./header"
import { LandingHero } from "./hero"
import { LandingServices } from "./services"
import { LandingHowItWorks } from "./how-it-works"
import { LandingTreatments } from "./treatments"
import { LandingTestimonials } from "./testimonials"
import { LandingFAQ } from "./faq"
import { LandingFooter } from "./footer"
import { SiteFooter } from "@/components/common/site-footer"

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen max-h-screen overflow-hidden">
      <LandingHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <LandingHero />
        <LandingServices />
        <LandingHowItWorks />
        <LandingTreatments />
        <LandingTestimonials />
        <LandingFAQ />
        <LandingFooter />
      </main>
      <SiteFooter />
    </div>
  )
}
