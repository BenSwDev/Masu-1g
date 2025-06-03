"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils/utils"

interface AnimatedContainerProps {
  children: React.ReactNode
  isActive: boolean
  className?: string
}

export function AnimatedContainer({ children, isActive, className }: AnimatedContainerProps) {
  const [shouldRender, setShouldRender] = useState(isActive)
  const [animationClass, setAnimationClass] = useState("")

  useEffect(() => {
    if (isActive) {
      setShouldRender(true)
      // Small delay to ensure the element is in the DOM before animating
      setTimeout(() => {
        setAnimationClass("opacity-100 translate-y-0")
      }, 50)
    } else {
      setAnimationClass("opacity-0 translate-y-4")
      // Wait for animation to complete before removing from DOM
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300) // Match this with the transition duration
      return () => clearTimeout(timer)
    }
  }, [isActive])

  if (!shouldRender) return null

  return (
    <div
      className={cn("transition-all duration-300 ease-in-out", animationClass, isActive ? "z-10" : "z-0", className)}
    >
      {children}
    </div>
  )
}
