import Image from "next/image"
import { CheckCircle, HeartHandshake } from "lucide-react"

export function AboutSection() {
  const features = [
    "Certified therapists",
    "Personalized approach",
    "Premium oils and equipment"
  ]

  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-4 grid gap-16 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6 order-2 lg:order-1">
          <h2 className="text-4xl font-bold text-slate-800">About MASU</h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            We believe everyone deserves high quality treatments without the hassle of travel. Our mission is to bring wellness directly to your door.
          </p>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle className="text-sky-600 mt-1" />
                <span className="text-slate-600">{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative order-1 lg:order-2">
          <div className="rounded-3xl bg-gradient-to-br from-sky-100 via-teal-50 to-sky-100 shadow-2xl p-6 transform lg:rotate-3 hover:rotate-0 transition">
            <Image
              src="/abstract-wellness.png"
              alt="Wellness"
              width={600}
              height={400}
              className="rounded-2xl opacity-70"
            />
            <div className="absolute inset-10 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur p-8 shadow-xl">
              <div className="p-4 rounded-full bg-cyan-500/30 mb-4">
                <HeartHandshake className="size-8" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Our Mission</h3>
              <p className="text-slate-600 text-center">Delivering relaxation and wellness straight to your home.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
