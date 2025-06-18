import { CalendarCheck, HandHeart, Smile } from "lucide-react"

export function HowItWorks() {
  const steps = [
    {
      icon: CalendarCheck,
      title: "Choose Your Time",
      text: "Select a convenient date and time for your treatment."
    },
    {
      icon: HandHeart,
      title: "We Come To You",
      text: "A professional therapist arrives at your home or office."
    },
    {
      icon: Smile,
      title: "Relax & Enjoy",
      text: "Experience deep relaxation and feel renewed."
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-slate-50 to-white text-center">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold mb-4 text-slate-800">How It Works</h2>
        <p className="text-lg text-slate-600 mb-12">
          Getting a massage at home has never been easier
        </p>
        <div className="grid gap-8 md:grid-cols-3 relative">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center hover:shadow-2xl transition"
            >
              <div className="absolute -top-4 -right-4 h-10 w-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold">
                {i + 1}
              </div>
              <div className="mb-4 flex items-center justify-center rounded-full bg-sky-100/70 p-4">
                {<step.icon className="size-8" />}
              </div>
              <h3 className="text-2xl font-semibold mb-2">{step.title}</h3>
              <p className="text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
