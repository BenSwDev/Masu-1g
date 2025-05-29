import type React from "react"

interface Subscription {
  id: string
  name: string
  price: number
  interval: string
  features: string[]
}

interface SubscriptionCardProps {
  subscription: Subscription
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ subscription }) => {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-800">{subscription.name}</h3>
      <p className="text-gray-600">
        Price: ${subscription.price?.toLocaleString() || "0"} / {subscription.interval}
      </p>
      <ul className="list-disc list-inside mt-2">
        {subscription.features.map((feature) => (
          <li key={feature} className="text-gray-700">
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SubscriptionCard
