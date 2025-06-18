import { Button } from "@/components/common/ui/button"

export function CtaSection() {
  return (
    <section className="relative py-20 text-white bg-gradient-to-br from-slate-800 via-sky-800 to-teal-700 overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "url('/hero-pattern.svg')" }}
      />
      <div className="relative container mx-auto px-4 flex flex-col items-center gap-6 bg-white/10 backdrop-blur rounded-3xl shadow-2xl border border-white/20 p-12">
        <h2 className="text-4xl font-bold">Ready to Book?</h2>
        <p className="text-lg text-sky-100/90 text-center max-w-2xl">
          Experience relaxation like never before. Schedule your massage today.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button className="px-8 py-7 text-lg bg-cyan-500 text-slate-900 shadow-xl rounded-xl hover:bg-cyan-400">
            Book Now
          </Button>
          <Button variant="outline" className="px-8 py-7 text-lg border-white/50 text-white hover:bg-white/10 backdrop-blur rounded-xl">
            Gift Voucher
          </Button>
        </div>
      </div>
    </section>
  )
}
