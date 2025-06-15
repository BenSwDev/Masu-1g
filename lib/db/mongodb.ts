import mongoose from "mongoose"
import { logger } from "@/lib/logs/logger"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (error) {
    logger.error("Failed to connect to MongoDB", { error })
    throw error
  }

  return cached.conn
}

export default connectToDatabase

/**
 * Connects to MongoDB and returns the client
 * This is a utility function for direct MongoDB operations
 */
export async function connectDB() {
  try {
    const client = await connectToDatabase()
    return client
  } catch (error) {
    logger.error("Failed to connect to MongoDB", { error })
    throw new Error("Failed to connect to the database")
  }
}
