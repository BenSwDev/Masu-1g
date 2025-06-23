import User from "./models/user"
import PasswordResetToken from "./models/password-reset-token"
import VerificationToken from "./models/verification-token"

/**
 * Optimized query builders with proper projections and lean queries
 */

// User queries
export const UserQueries = {
  // Find user by email for login (only required fields)
  async findForLogin(email: string) {
    return User.findOne({ email: email.toLowerCase() }).select("+password email name image roles").lean().exec()
  },

  // Find user by ID (no password)
  async findById(id: string) {
    return User.findById(id).select("-password").lean().exec()
  },

  // Find user for profile update
  async findForProfile(id: string) {
    return User.findById(id).select("name email phone gender dateOfBirth image").exec() // Not lean because we need to save
  },

  // Check if email exists (minimal data)
  async emailExists(email: string, excludeId?: string) {
    const query: any = { email: email.toLowerCase() }
    if (excludeId) {
      query._id = { $ne: excludeId }
    }
    return User.exists(query).exec()
  },

  /**
   * בדוק אם קיים משתמש עם מספר טלפון מסוים
   * תומך בחיפוש עם או בלי 0 בהתחלה (לאחר קידומת המדינה)
   */
  async phoneExists(phone: string): Promise<boolean> {
    if (!phone) return false

    // Clean and normalize the phone number
    let cleaned = phone.replace(/[^\d+]/g, "")

    // If there's no plus sign, assume it's a local number
    if (!cleaned.startsWith("+")) {
      // Handle Israeli numbers specifically
      if (cleaned.startsWith("0")) {
        // Israeli number starting with 0 (e.g., 0525131777)
        cleaned = "+972" + cleaned.substring(1)
      } else if (cleaned.length === 9 && /^[5-9]/.test(cleaned)) {
        // Israeli mobile number without 0 (e.g., 525131777)
        cleaned = "+972" + cleaned
      } else if (cleaned.length === 10 && cleaned.startsWith("972")) {
        // Number with 972 but no plus (e.g., 972525131777)
        cleaned = "+" + cleaned
      } else {
        // Default: assume Israeli number and add +972
        cleaned = "+972" + cleaned
      }
    } else {
      // Handle +972 numbers that might have 0 after country code
      if (cleaned.startsWith("+9720")) {
        // Remove the 0 after +972 (e.g., +9720525131777 -> +972525131777)
        cleaned = "+972" + cleaned.substring(5)
      }
    }

    // Create variations of the phone number for searching
    const countryCode = cleaned.substring(0, cleaned.indexOf("+") + 4) // +972
    const nationalNumber = cleaned.substring(cleaned.indexOf("+") + 4).replace(/\D/g, "")
    
    // Create variations with and without leading zero
    const withZero = `${countryCode}0${nationalNumber}`
    const withoutZero = `${countryCode}${nationalNumber}`

    // Search for both variations
    const user = await User.findOne({
      $or: [
        { phone: withZero },
        { phone: withoutZero },
        { phone: cleaned } // The original cleaned number
      ]
    }).lean()

    return !!user
  },

  // Find users for admin (paginated)
  async findForAdmin(page = 1, limit = 20, filter?: any) {
    const skip = (page - 1) * limit

    const query = filter || {}

    const [users, total] = await Promise.all([
      User.find(query)
        .select("name email phone roles createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      User.countDocuments(query).exec(),
    ])

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  },

  // Search users (using text index)
  async searchUsers(searchTerm: string, limit = 10) {
    return User.find({ $text: { $search: searchTerm } }, { score: { $meta: "textScore" } })
      .select("name email phone roles")
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .lean()
      .exec()
  },

  // Bulk update roles (for admin operations)
  async bulkUpdateRoles(userIds: string[], roles: string[]) {
    return User.updateMany({ _id: { $in: userIds } }, { $set: { roles } }).exec()
  },

  // Get role statistics
  async getRoleStats() {
    return User.aggregate([
      {
        $unwind: "$roles",
      },
      {
        $group: {
          _id: "$roles",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]).exec()
  },
}

// Password Reset Token queries
export const PasswordResetQueries = {
  // Find valid token
  async findValidToken(token: string) {
    return PasswordResetToken.findOne({
      token,
      expiryDate: { $gt: new Date() },
      used: false,
    })
      .select("userId expiryDate used")
      .lean()
      .exec()
  },

  // Create token with automatic cleanup
  async createToken(userId: string, token: string, expiresInMinutes = 60) {
    // Delete any existing tokens for this user
    await PasswordResetToken.deleteMany({ userId }).exec()

    return PasswordResetToken.create({
      userId,
      token,
      expiryDate: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      used: false,
    })
  },

  // Cleanup expired tokens (run periodically)
  async cleanupExpired() {
    return PasswordResetToken.deleteMany({
      expiryDate: { $lt: new Date() },
    }).exec()
  },
}

// Verification Token queries
export const VerificationQueries = {
  // Find valid OTP
  async findValidOTP(identifier: string, type: string, code: string) {
    // Use UTC time for consistent expiry checks
    const now = new Date()
    return VerificationToken.findOne({
      identifier,
      type,
      code,
      expiresAt: { $gt: now },
    })
      .select("attempts")
      .exec() // Not lean because we need to update attempts
  },

  // Create OTP with cleanup
  async createOTP(identifier: string, type: string, code: string, expiresInMinutes = 10) {
    // Delete any existing OTPs for this identifier/type
    await VerificationToken.deleteMany({ identifier, type }).exec()

    // Calculate expiry time in UTC
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000)

    return VerificationToken.create({
      identifier,
      type,
      code,
      expiresAt,
      attempts: 0,
    })
  },

  // Increment attempts
  async incrementAttempts(id: string) {
    return VerificationToken.findByIdAndUpdate(id, { $inc: { attempts: 1 } }, { new: true }).exec()
  },
}

// Aggregation pipelines for analytics
export const AnalyticsQueries = {
  // User registration trends
  async getRegistrationTrends(days = 30) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]).exec()
  },

  // User demographics
  async getUserDemographics() {
    return User.aggregate([
      {
        $facet: {
          byGender: [{ $group: { _id: "$gender", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          byAgeGroup: [
            {
              $match: { dateOfBirth: { $exists: true } },
            },
            {
              $project: {
                age: {
                  $divide: [{ $subtract: [new Date(), "$dateOfBirth"] }, 365 * 24 * 60 * 60 * 1000],
                },
              },
            },
            {
              $bucket: {
                groupBy: "$age",
                boundaries: [0, 18, 25, 35, 45, 55, 65, 100],
                default: "Unknown",
                output: { count: { $sum: 1 } },
              },
            },
          ],
        },
      },
    ]).exec()
  },
}
