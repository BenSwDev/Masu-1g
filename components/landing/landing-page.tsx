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
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-1">
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