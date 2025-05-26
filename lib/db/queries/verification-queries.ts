import VerificationToken from "@/lib/db/models/verification-token"
import { logger } from "@/lib/logs/logger"

class VerificationQueries {
  static async findValidOTP(identifier: string, identifierType: "email" | "phone", code: string) {
    const now = new Date()
    return await VerificationToken.findOne({
      identifier,
      identifierType,
      code,
      expiresAt: { $gt: now },
    })
  }

  static async createOTP(identifier: string, identifierType: "email" | "phone", code: string, expiresInMinutes = 10) {
    // Delete any existing OTPs for this identifier
    await VerificationToken.deleteMany({ identifier, identifierType })
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)
    
    // Create new OTP
    return await VerificationToken.create({
      identifier,
      identifierType,
      code,
      expiresAt,
      attempts: 0
    })
  }

  static async incrementAttempts(tokenId: string) {
    return await VerificationToken.updateOne(
      { _id: tokenId },
      { $inc: { attempts: 1 } }
    )
  }

  static async deleteOTP(tokenId: string) {
    return await VerificationToken.deleteOne({ _id: tokenId })
  }
}

export default VerificationQueries 