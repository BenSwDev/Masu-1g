import mongoose from "mongoose"

declare global {
  var mongooseConnection: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local")
}

let cached = global.mongooseConnection

if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null }
}

// MongoDB connection options optimized for performance
const connectionOptions = {
  bufferCommands: false,

  // Connection pool settings
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2, // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close idle connections after 30 seconds

  // Timeout settings
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity

  // Write concern for better performance
  writeConcern: {
    w: 1, // Wait for acknowledgment from primary only
    j: false, // Don't wait for journal sync
    wtimeout: 5000, // Write timeout
  },

  // Read preference for distributed reads
  readPreference: "primaryPreferred" as const, // Read from primary, fallback to secondary

  // Enable retries
  retryWrites: true,
  retryReads: true,
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, connectionOptions)
      .then((mongoose) => {
        console.log("MongoDB connected successfully")

        // Set up connection monitoring
        mongoose.connection.on("connected", () => {
          console.log("Mongoose connected to MongoDB")
        })

        mongoose.connection.on("error", (err) => {
          console.error("Mongoose connection error:", err)
        })

        mongoose.connection.on("disconnected", () => {
          console.log("Mongoose disconnected")
        })

        // Monitor slow queries in development
        if (process.env.NODE_ENV === "development") {
          mongoose.set("debug", (collectionName: string, method: string, query: any, doc: any, options: any) => {
            const start = Date.now()
            console.log(`${collectionName}.${method}`, JSON.stringify(query), options)

            // Log slow queries (> 100ms)
            const duration = Date.now() - start
            if (duration > 100) {
              console.warn(`Slow query detected: ${duration}ms`, {
                collection: collectionName,
                method,
                query,
              })
            }
          })
        }

        return mongoose
      })
      .catch((error) => {
        console.error("MongoDB connection error:", error)
        cached.promise = null
        throw error
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    console.error("Failed to connect to MongoDB:", e)
    throw e
  }

  return cached.conn
}

export default dbConnect

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
