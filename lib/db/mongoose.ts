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

let cached = (global as any).mongooseConnection
if (!cached) {
  cached = (global as any).mongooseConnection = { conn: null, promise: null }
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

export default async function dbConnect() {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, connectionOptions).then((mongoose) => mongoose)
  }
  cached.conn = await cached.promise
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
  mongoose.set("debug", function (collectionName, method, query, doc, options) {
    const start = Date.now()
    const result = JSON.stringify(query)
    const duration = Date.now() - start
    console.log(`[Mongoose][${collectionName}.${method}] query:`, result, 'duration:', duration, 'ms')
  })
}
