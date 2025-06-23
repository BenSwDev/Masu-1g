import mongoose from "mongoose"

declare global {
  var mongooseConnection: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

const MONGODB_URI = process.env.MONGODB_URI || ""

let cached = (global as any).mongooseConnection
if (!cached) {
  cached = (global as any).mongooseConnection = { conn: null, promise: null }
}

// Import all models to ensure they're registered
async function loadModels() {
  // Import all models to register them with mongoose
  await import("@/lib/db/models/user")
  await import("@/lib/db/models/address")
  await import("@/lib/db/models/booking")
  await import("@/lib/db/models/counter")
  await import("@/lib/db/models/coupon")
  await import("@/lib/db/models/coupon-usage")
  await import("@/lib/db/models/gift-voucher")
  await import("@/lib/db/models/password-reset-token")
  await import("@/lib/db/models/payment-method")
  await import("@/lib/db/models/professional-profile")
  await import("@/lib/db/models/subscription")
  await import("@/lib/db/models/treatment")
  await import("@/lib/db/models/user-subscription")
  await import("@/lib/db/models/verification-token")
  await import("@/lib/db/models/working-hours")
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined")
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const mongooseOptions = { compressors: ["zlib" as const] } // Specify zlib compressor with proper typing
    cached.promise = mongoose
      .connect(MONGODB_URI, mongooseOptions) // Pass options here
      .then(async (mongoose) => {
        // Load all models after connection
        await loadModels()
        return mongoose
      })
      .catch((error) => {
        cached.promise = null
        throw error
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

// Export connection stats function
export async function getConnectionStats() {
  const conn = await dbConnect()
  if (!conn.connection.db) {
    throw new Error("Database connection not established")
  }
  const adminDb = conn.connection.db.admin()

  try {
    const serverStatus = await adminDb.serverStatus()
    return {
      connections: serverStatus.connections,
      network: serverStatus.network,
      opcounters: serverStatus.opcounters,
    }
  } catch (error) {
    console.error("Error getting connection stats:", error)
    return null
  }
}

if (process.env.NODE_ENV === "development") {
  mongoose.set("debug", (collectionName, method, query, doc, options) => {
    const start = Date.now()
    const result = JSON.stringify(query)
    const duration = Date.now() - start
    console.log(`[Mongoose][${collectionName}.${method}] query:`, result, "duration:", duration, "ms")
  })
}

// Export both as default and named export
export default dbConnect
export { dbConnect }
// Add the missing connectDB export as an alias
export { dbConnect as connectDB }
