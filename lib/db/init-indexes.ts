import mongoose from "mongoose"
import dbConnect from "./mongoose"

/**
 * Initialize database indexes for optimal query performance
 * Run this during application startup or as a separate script
 */
export async function initializeIndexes() {
  try {
    await dbConnect()
    console.log("Initializing database indexes...")

    // User collection indexes
    const userIndexes = [
      // Single field indexes
      { email: 1 }, // For login and email lookups
      { phone: 1 }, // For phone number lookups
      { roles: 1 }, // For role-based queries
      { createdAt: -1 }, // For sorting by creation date

      // Compound indexes for common query patterns
      { email: 1, password: 1 }, // For login queries
      { roles: 1, createdAt: -1 }, // For admin user listings
      { email: 1, phone: 1 }, // For checking existing users

      // Text index for search functionality
      { name: "text", email: "text" , phone: "text" }, // For user search
    ]

    // Password Reset Token indexes
    const passwordResetIndexes = [
      { token: 1 },
      { email: 1 },
      { expiresAt: 1 }, // For TTL
      { email: 1, token: 1 }, // Compound for verification
    ]

    // Verification Token indexes
    const verificationIndexes = [
      { identifier: 1, type: 1 },
      { code: 1 },
      { expiresAt: 1 }, // For TTL
      { identifier: 1, type: 1, code: 1 }, // Compound for OTP verification
    ]

    // Create indexes
    const User = mongoose.connection.collection("users")
    const PasswordResetToken = mongoose.connection.collection("passwordresettokens")
    const VerificationToken = mongoose.connection.collection("verificationtokens")

    // Create User indexes
    for (const index of userIndexes) {
      await User.createIndex(index)
    }

    // Create unique indexes
    await User.createIndex({ email: 1 }, { unique: true })
    await User.createIndex({ phone: 1 }, { unique: true })

    // Create PasswordResetToken indexes
    for (const index of passwordResetIndexes) {
      await PasswordResetToken.createIndex(index)
    }

    // TTL index for automatic cleanup
    await PasswordResetToken.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

    // Create VerificationToken indexes
    for (const index of verificationIndexes) {
      await VerificationToken.createIndex(index)
    }

    // TTL index for automatic cleanup
    await VerificationToken.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

    console.log("Database indexes initialized successfully")

    // Get index statistics
    const userIndexStats = await User.indexInformation()
    console.log("User collection indexes:", userIndexStats)

    return { success: true }
  } catch (error) {
    console.error("Error initializing indexes:", error)
    return { success: false, error }
  }
}

/**
 * Analyze query performance and suggest optimizations
 */
export async function analyzeQueryPerformance() {
  try {
    await dbConnect()

    const db = mongoose.connection.db

    // Get collection stats
    const userStats = await db.collection("users").stats()
    const tokenStats = await db.collection("passwordresettokens").stats()

    console.log("Collection Statistics:")
    console.log("Users:", {
      count: userStats.count,
      size: `${(userStats.size / 1024 / 1024).toFixed(2)} MB`,
      avgObjSize: `${(userStats.avgObjSize / 1024).toFixed(2)} KB`,
      indexCount: userStats.nindexes,
      totalIndexSize: `${(userStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`,
    })

    return { userStats, tokenStats }
  } catch (error) {
    console.error("Error analyzing performance:", error)
    return null
  }
}
