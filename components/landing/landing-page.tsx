"use client"

import { LandingHeader } from "./header"
import { LandingHero } from "./hero"
import { LandingFooter } from "./footer"

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
      </main>
      <LandingFooter />
    </div>
  )
} 