import { MongoClient } from "mongodb"

const options = { compressors: ["zlib"] } // Specify zlib compressor, excluding snappy and zstd

let client
let clientPromise: Promise<MongoClient>

function initializeConnection() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"')
  }

  const uri = process.env.MONGODB_URI

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>
    }

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options) // New line with updated options
      globalWithMongo._mongoClientPromise = client.connect()
    }
    clientPromise = globalWithMongo._mongoClientPromise
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options) // New line with updated options
    clientPromise = client.connect()
  }

  return clientPromise
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default function getClientPromise() {
  if (!clientPromise) {
    clientPromise = initializeConnection()
  }
  return clientPromise
}

/**
 * Connects to MongoDB and returns the client
 * This is a utility function for direct MongoDB operations
 */
export async function connectDB() {
  try {
    const client = await getClientPromise()
    return client
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error)
    throw new Error("Failed to connect to the database")
  }
}
