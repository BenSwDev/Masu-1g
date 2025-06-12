"use client"

import { LandingHeader } from "./header"
import { LandingHero } from "./hero"
import { LandingFooter } from "./footer"

export function LandingPage() {
  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden">
      <LandingHeader />
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <LandingHero />
      </main>
      <LandingFooter />
    </div>
  )
} 