import mongoose from "mongoose"

async function initIndexes() {
  try {
    // Drop indexes and references to bundles
    // Get a list of all collections
    const collections = await mongoose.connection.db?.listCollections().toArray() || []

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name
      const collection = mongoose.connection.collection(collectionName)

      try {
        // Get existing indexes
        const indexes = await collection.indexes()

      } catch (indexError) {
        console.error(`Error getting indexes for collection ${collectionName}:`, indexError)
      }
    }

    // Subscription collection indexes
    const subscriptionIndexes = [
      { name: 1 },
      { isActive: 1 },
      { createdAt: -1 },
      { treatments: 1 },
      { name: "text", description: "text" }
    ] as const

    // Create Subscription indexes
    const Subscription = mongoose.connection.collection("subscriptions")
    for (const index of subscriptionIndexes) {
      try {
        await Subscription.createIndex(index as any)
      } catch (error) {
        console.error("Error creating subscription index:", error)
      }
    }

    // Create GiftVoucher indexes
    const GiftVoucher = mongoose.connection.collection("giftvouchers")
    try {
      await GiftVoucher.createIndex({ code: 1 }, { unique: true })
      await GiftVoucher.createIndex({ validFrom: 1, validUntil: 1 })
      await GiftVoucher.createIndex({ isActive: 1 })
    } catch (error) {
      console.error("Error creating gift voucher indexes:", error)
    }
  } catch (error) {
    console.error("Error initializing indexes:", error)
  }
}

export default initIndexes
