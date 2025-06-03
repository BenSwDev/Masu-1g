"use client"

import type React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils/utils"

export interface AnimatedContainerProps {
  children: React.ReactNode
  isVisible: boolean
  className?: string
  key?: string | number
  direction?: "left" | "right" | "up" | "down"
}

export function AnimatedContainer({
  children,
  isVisible,
  className,
  key,
  direction = "right",
}: AnimatedContainerProps) {
  const getVariants = () => {
    switch (direction) {
      case "left":
        return {
          hidden: { x: -50, opacity: 0 },
          visible: { x: 0, opacity: 1 },
          exit: { x: 50, opacity: 0 },
        }
      case "right":
        return {
          hidden: { x: 50, opacity: 0 },
          visible: { x: 0, opacity: 1 },
          exit: { x: -50, opacity: 0 },
        }
      case "up":
        return {
          hidden: { y: -50, opacity: 0 },
          visible: { y: 0, opacity: 1 },
          exit: { y: 50, opacity: 0 },
        }
      case "down":
        return {
          hidden: { y: 50, opacity: 0 },
          visible: { y: 0, opacity: 1 },
          exit: { y: -50, opacity: 0 },
        }
    }
  }

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={key}
          variants={getVariants()}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cn("w-full", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
