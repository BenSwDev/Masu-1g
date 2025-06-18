import { Quote, Star } from "lucide-react"

const testimonials = [
  {
    name: "Sarah L.",
    role: "Customer",
    rating: 5,
    text: "The therapist was amazing and I felt so relaxed afterward!"
  },
  {
    name: "Daniel M.",
    role: "Customer",
    rating: 4,
    text: "Great service and very convenient. Will book again."
  },
  {
    name: "Rachel P.",
    role: "Customer",
    rating: 5,
    text: "Best massage I've ever had. Highly recommended!"
  }
]

export function Testimonials() {
  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold mb-12 text-slate-800">Testimonials</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-gradient-to-br from-slate-50 via-white to-sky-50 rounded-2xl shadow-xl p-8 hover:-translate-y-1 transition"
            >
              <Quote className="size-8 text-sky-600 mb-4" />
              <p className="italic text-lg mb-6">{t.text}</p>
              <div className="flex justify-center mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-5 ${i < t.rating ? "text-yellow-400" : "text-yellow-200"}`}
                    fill={i < t.rating ? "currentColor" : "none"}
                  />
                ))}
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-gradient-to-br from-sky-500 to-teal-400 text-white flex items-center justify-center text-xl font-semibold">
                  {t.name[0]}
                </div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-slate-600">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
