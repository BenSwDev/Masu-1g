"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Clock, Sparkles, Tag } from "lucide-react"

const massages = [
  {
    id: "swedish",
    label: "Swedish Massage",
    description: "Gentle full-body massage for relaxation.",
    pricing: [
      { duration: 60, price: 70 },
      { duration: 90, price: 100 }
    ]
  },
  {
    id: "deep",
    label: "Deep Tissue",
    description: "Targets deeper layers to relieve tension.",
    pricing: [
      { duration: 60, price: 80 },
      { duration: 90, price: 110 }
    ]
  },
  {
    id: "thai",
    label: "Thai Massage",
    description: "Traditional stretching and pressure points.",
    pricing: [
      { duration: 60, price: 75 },
      { duration: 90, price: 105 }
    ]
  }
]

export function MassageTypes() {
  const [selected, setSelected] = useState<string | null>(null)
  const massage = massages.find((m) => m.id === selected)

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-sky-50">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold mb-4 text-slate-800 text-center">Massage Types</h2>
        <div className="max-w-md mx-auto mb-10">
          <Select onValueChange={setSelected} value={selected ?? undefined}>
            <SelectTrigger className="h-16 rounded-xl border-2 border-slate-300 text-lg">
              <SelectValue placeholder="Select massage" />
            </SelectTrigger>
            <SelectContent>
              {massages.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-lg">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {massage && (
          <div className="max-w-3xl mx-auto animate-in fade-in">
            <Card className="rounded-2xl shadow-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-sky-600 to-teal-500 text-white flex items-center gap-4">
                  <Sparkles className="size-8" />
                  <div>
                    <CardTitle className="text-3xl">{massage.label}</CardTitle>
                    <p className="text-white/90 mt-2">{massage.description}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 py-8">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold text-xl">
                    <Tag className="size-5" />
                    Pricing
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {massage.pricing.map((p) => (
                      <div
                        key={p.duration}
                        className="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-4 shadow hover:shadow-lg transition"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="size-4 text-slate-600" />
                          <span>{p.duration} min</span>
                        </div>
                        <div className="text-3xl font-bold text-sky-700 mb-4">
                          ${p.price}
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => console.log("book", massage.id, p.duration)}
                        >
                          Book This
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
          </div>
        )}
      </div>
    </section>
  )
}
