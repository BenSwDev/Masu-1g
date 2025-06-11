import { redirect } from "next/navigation"

export default async function GuestSubscriptionPurchasePage() {
  // Get guest user ID from server-side logic (we'll enhance this)
  const guestUserId = null // TODO: Get from session/cookies
  
  if (!guestUserId) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">רכישת מנוי כאורח</h1>
          <p className="text-gray-600 mt-2">אנא בחר את המנוי המתאים לך</p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {/* TODO: Add subscription purchase component for guests */}
          <div className="text-center py-16">
            <p className="text-lg text-gray-600">קומפוננט רכישת מנוי לאורחים יתווסף בקרוב</p>
          </div>
        </div>
      </div>
    </div>
  )
} 