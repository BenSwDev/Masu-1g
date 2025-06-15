import mongoose from "mongoose"
import { logger } from "@/lib/logs/logger"

async function createIndexes() {
  try {
    const db = mongoose.connection.db
    if (!db) {
      logger.warn("Database connection not available for index creation")
      return
    }

    // Helper function to safely get existing indexes
    const getExistingIndexes = async (collectionName: string) => {
      try {
        const collection = db.collection(collectionName)
        return await collection.indexes()
      } catch (indexError) {
        logger.error("Error getting indexes for collection", { 
          collectionName, 
          error: indexError 
        })
        return []
      }
    }

    // Create subscription indexes
    try {
      const subscriptionIndexes = await getExistingIndexes("subscriptions")
      const hasUserIdIndex = subscriptionIndexes.some((index: any) => 
        index.key && index.key.userId
      )
      
      if (!hasUserIdIndex) {
        await db.collection("subscriptions").createIndex({ userId: 1 })
        logger.info("Created userId index on subscriptions collection")
      }
    } catch (error) {
      logger.error("Error creating subscription index", { error })
    }

    // Create gift voucher indexes
    try {
      await db.collection("giftvouchers").createIndex({ code: 1 }, { unique: true })
      await db.collection("giftvouchers").createIndex({ userId: 1 })
      logger.info("Created indexes on giftvouchers collection")
    } catch (error) {
      logger.error("Error creating gift voucher indexes", { error })
    }
  } catch (error) {
    logger.error("Error initializing indexes", { error })
  }
}

export { createIndexes }
