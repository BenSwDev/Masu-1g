"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/common/ui/accordion"
import { HelpCircle } from "lucide-react"

const faqs = [
  { question: "How do I book?", answer: "Simply choose your preferred massage type and time, then confirm your booking." },
  { question: "What areas do you serve?", answer: "We currently operate within the city limits and surrounding suburbs." },
  { question: "Can I cancel?", answer: "Yes, cancellations are allowed up to 24 hours before the appointment." }
]

export function FaqSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-sky-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <HelpCircle className="mx-auto mb-2 size-10 text-sky-600" />
          <h2 className="text-4xl font-bold text-slate-800">FAQ</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-4 max-w-2xl mx-auto">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-2 border-slate-200 rounded-xl shadow-lg">
              <AccordionTrigger className="text-lg font-semibold px-4 py-3 hover:text-sky-700">
                {f.question}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-slate-600">
                {f.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
