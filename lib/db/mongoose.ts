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

async function dbConnect() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const mongooseOptions = { compressors: ["zlib"] } // Specify zlib compressor
    cached.promise = mongoose
      .connect(MONGODB_URI, mongooseOptions) // Pass options here
      .then((mongoose) => {
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
