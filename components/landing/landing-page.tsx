"use client"

import { LandingHero } from "./hero"
import { ServicesBenefits } from "./services-benefits"
import { Testimonials } from "./testimonials"
import { HowItWorks } from "./how-it-works"
import { PopularTreatments } from "./popular-treatments"
import { PricingTransparency } from "./pricing-transparency"
import { FAQ } from "./faq"

export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <LandingHero />
      
      {/* Services & Benefits */}
      <ServicesBenefits />
      
      {/* How It Works */}
      <HowItWorks />
      
      {/* Popular Treatments */}
      <PopularTreatments />
      
      {/* Testimonials */}
      <Testimonials />
      
      {/* Pricing Transparency */}
      <PricingTransparency />
      
      {/* FAQ */}
      <FAQ />
    </div>
  )
} 