import VerificationToken from "@/lib/db/models/verification-token"

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

  static async incrementAttempts(tokenId: string) {
    return await VerificationToken.updateOne(
      { _id: tokenId },
      { $inc: { attempts: 1 } }
    )
  }
}

export default VerificationQueries 