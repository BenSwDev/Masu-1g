"use client"

import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function LandingTreatments() {
  const { dir } = useTranslation()

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {dir === "rtl" ? "השירותים שלנו" : "Our Services"}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {dir === "rtl"
              ? "מגוון רחב של שירותי עיסוי מקצועיים המבוצעים על ידי מטפלים מיומנים בנוחות הבית שלך"
              : "Wide range of professional massage services performed by skilled therapists in the comfort of your home"}
          </p>
        </div>

        {/* Pricing Table */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              {dir === "rtl" ? "·· מחירון ··" : "·· Price List ··"}
            </h3>
            <p className="text-lg text-gray-600">
              {dir === "rtl"
                ? "תמחור פשוט – כל התשלומים וההוצאות למטפל כלולים במחיר"
                : "Simple pricing – all payments and therapist expenses included in the price"}
            </p>
          </div>

          <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-turquoise-50 border-b border-turquoise-200">
                  <tr>
                    <th className="text-right p-4 font-bold text-gray-800">
                      {dir === "rtl" ? "סוג טיפול" : "Treatment Type"}
                    </th>
                    <th className="text-center p-4 font-bold text-gray-800">
                      {dir === "rtl" ? "60 דק'" : "60 min"}
                    </th>
                    <th className="text-center p-4 font-bold text-gray-800">
                      {dir === "rtl" ? "75 דק'" : "75 min"}
                    </th>
                    <th className="text-center p-4 font-bold text-gray-800">
                      {dir === "rtl" ? "90 דק'" : "90 min"}
                    </th>
                    <th className="text-center p-4 font-bold text-gray-800">
                      {dir === "rtl" ? "120 דק'" : "120 min"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl" ? "עיסוי שוודי" : "Swedish Massage"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪320</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪380</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪440</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪580</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl" ? "עיסוי רקמות עמוק" : "Deep Tissue Massage"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪370</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪430</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪490</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪630</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl" ? "עיסוי נשים הרות" : "Prenatal Massage"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪320</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪380</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪440</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪580</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl" ? "עיסוי ספורטאים" : "Sports Massage"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪370</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪430</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪490</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪630</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl" ? "עיסוי רגליים" : "Foot Massage"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪370</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪430</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪490</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪630</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">
                      {dir === "rtl"
                        ? "עיסוי קצוות (רגליים, ראש וצוואר)"
                        : "Targeted Massage (feet, head & neck)"}
                    </td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪320</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪380</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪440</td>
                    <td className="text-center p-4 text-turquoise-600 font-bold">₪580</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-8 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800">
                {dir === "rtl"
                  ? '* שימו לב, מחירי טיפולים החל משעה 20:00, בימים שישי, שבת ובמועדים מיוחדים הינם בתוספת של 50 ש"ח לטיפול.'
                  : "* Please note, treatment prices from 8:00 PM, on Fridays, Saturdays and special holidays are with an additional 50 NIS per treatment."}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                {dir === "rtl"
                  ? "עיסויים מיוחדים : עיסוי תאילנדי, עיסוי אבנים חמות ניתן להזמין בתיאום מול נציג השירות"
                  : "Special massages: Thai massage, hot stone massage can be ordered in coordination with the service representative"}
              </p>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Gift Voucher Service */}
          <div className="group relative bg-turquoise-100 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-8">
            {/* Icon */}
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg className="w-10 h-10 text-turquoise-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {dir === "rtl" ? "שובר עיסוי במתנה" : "Massage Gift Voucher"}
              </h3>

              <p className="text-gray-700 mb-6 leading-relaxed">
                {dir === "rtl"
                  ? "עיסוי הוא המתנה המושלמת לכל אירוע הפתע ופנק את חבריך וקרוביך בשובר מתנה להזמנת עיסוי מקצועי מתי ואיפה שירצו בלי לצאת מהבית"
                  : "Massage is the perfect gift for any occasion. Surprise and pamper your friends and family with a gift voucher for professional massage whenever and wherever they want without leaving home"}
              </p>

              <p className="text-lg font-semibold text-gray-800 mb-6">
                {dir === "rtl"
                  ? 'הראו למישהו חשוב שאתם אוהבים אותו עם שובר מתנה החל מ290 ש"ח'
                  : "Show someone special that you love them with a gift voucher starting from 290 NIS"}
              </p>

              <Button
                asChild
                size="lg"
                className="bg-white text-turquoise-600 hover:bg-gray-50 border-2 border-white font-semibold px-8 py-3 rounded-full"
              >
                <Link
                  href="/purchase/gift-voucher"
                  className="flex items-center justify-center gap-2"
                >
                  {dir === "rtl" ? "הזמן עכשיו" : "Order Now"}
                </Link>
              </Button>
            </div>
          </div>

          {/* Office Massage Service */}
          <div className="group relative bg-turquoise-100 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-8">
            {/* Icon */}
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg className="w-10 h-10 text-turquoise-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z" />
              </svg>
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {dir === "rtl" ? "עיסוי במשרד" : "Office Massage"}
              </h3>

              <p className="text-gray-700 mb-6 leading-relaxed">
                {dir === "rtl"
                  ? "מאסו מפנקת עובדים לאירוע של יום כיף ומפנק או קבוע לבריאות פעם בשבוע או פעם בחודש. מטפלים בדוקים ומבוטחים מגיעים עם כיסא או מיטת טיפולים ויוצרים אווירת ספא מרגיעה ומפנקת במשרד."
                  : "Masu pampers employees for a fun and relaxing day event or regularly for health once a week or once a month. Certified and insured therapists arrive with a chair or treatment bed and create a relaxing and pampering spa atmosphere in the office."}
              </p>

              <p className="text-lg font-semibold text-gray-800 mb-6">
                {dir === "rtl"
                  ? "מחירים מתחילים מ -450 ₪ לטיפול של עד 10 עובדים."
                  : "Prices start from 450 NIS for treatment of up to 10 employees."}
              </p>

              <Button
                asChild
                size="lg"
                className="bg-white text-turquoise-600 hover:bg-gray-50 border-2 border-white font-semibold px-8 py-3 rounded-full"
              >
                <Link href="/bookings/treatment" className="flex items-center justify-center gap-2">
                  {dir === "rtl" ? "הזמן עכשיו" : "Order Now"}
                </Link>
              </Button>
            </div>
          </div>

          {/* Event Massage Service */}
          <div className="group relative bg-turquoise-100 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-8">
            {/* Icon */}
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg className="w-10 h-10 text-turquoise-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
              </svg>
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {dir === "rtl" ? "עיסוי באירועים" : "Event Massage"}
              </h3>

              <p className="text-gray-700 mb-6 leading-relaxed">
                {dir === "rtl"
                  ? "אין דבר יותר מרשים או מפנק ממעסה פרטי משלך באירוע חברה או מסיבה. עם מאסו תוכל לארגן מעסים מקצועיים לאירועים במשרד, מפגשים חברתיים, מסיבות רווקים ועוד. אנחנו נארגן מטפלים עם ציוד שיגיעו לאן שתרצה ויעזרו לאורחים שלך להשתחרר ולהרגע."
                  : "Nothing is more impressive or pampering than your own private masseur at a company event or party. With Masu you can arrange professional masseurs for office events, social gatherings, bachelor parties and more. We will arrange therapists with equipment who will come wherever you want and help your guests relax and unwind."}
              </p>

              <Button
                asChild
                size="lg"
                className="bg-white text-turquoise-600 hover:bg-gray-50 border-2 border-white font-semibold px-8 py-3 rounded-full"
              >
                <Link href="/bookings/treatment" className="flex items-center justify-center gap-2">
                  {dir === "rtl" ? "הזמן עכשיו" : "Order Now"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
