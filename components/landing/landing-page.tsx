"use client"

import { LandingHeader } from "./header"
import { LandingHero } from "./hero"
import { LandingServices } from "./services"
import { LandingHowItWorks } from "./how-it-works"
import { LandingTreatments } from "./treatments"
import { LandingPricing } from "./pricing"
import { LandingTestimonials } from "./testimonials"
import { LandingFAQ } from "./faq"
import { LandingFooter } from "./footer"

export function LandingPage() {
  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden">
      <LandingHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <LandingHero />
        <LandingServices />
        <LandingHowItWorks />
        <LandingTreatments />
        <LandingPricing />
        <LandingTestimonials />
        <LandingFAQ />
      </main>
      <LandingFooter />
    </div>
  )
} 