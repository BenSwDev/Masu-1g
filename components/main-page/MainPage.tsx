import React from "react"

import { Hero } from "./sections/Hero"
import { HowItWorks } from "./sections/HowItWorks"
import { AboutSection } from "./sections/AboutSection"
import { MassageTypes } from "./sections/MassageTypes"
import { Testimonials } from "./sections/Testimonials"
import { FaqSection } from "./sections/FaqSection"
import { CtaSection } from "./sections/CtaSection"

export function MainPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 text-slate-800 selection:bg-sky-500 selection:text-white">
      <Hero />
      <HowItWorks />
      <AboutSection />
      <MassageTypes />
      <Testimonials />
      <FaqSection />
      <CtaSection />
    </div>
  )
}
