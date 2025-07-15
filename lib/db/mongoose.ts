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
  await import("@/lib/db/models/subscription")
  await import("@/lib/db/models/treatment")
  await import("@/lib/db/models/user-subscription")
  await import("@/lib/db/models/verification-token")
  await import("@/lib/db/models/working-hours")
  await import("@/lib/db/models/city-distance")
  await import("@/lib/db/models/review")
  await import("@/lib/db/models/professional-profile")
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined")
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const mongooseOptions = { 
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout for initial connection
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 30000, // 30 seconds connection timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain a minimum of 5 socket connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      // Remove unsupported options that cause errors
    }
    cached.promise = mongoose
      .connect(MONGODB_URI, mongooseOptions) // Pass options here
      .then(async (mongoose) => {
        console.log("✅ MongoDB connected successfully")
        
        // Set up connection event listeners
        mongoose.connection.on('error', (error) => {
          console.error('❌ MongoDB connection error:', error)
        })
        
        mongoose.connection.on('disconnected', () => {
          console.warn('⚠️ MongoDB disconnected')
        })
        
        mongoose.connection.on('reconnected', () => {
          console.log('🔄 MongoDB reconnected')
        })
        
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
async function getConnectionStats() {
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
    // TODO: Remove debug log

  })
}

// Export both as default and named export
export default dbConnect
export { dbConnect }
// Add the missing connectDB export as an alias
export { dbConnect as connectDB }
