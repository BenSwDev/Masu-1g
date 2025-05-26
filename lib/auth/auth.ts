import { compare, hash } from "bcryptjs"
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/db/mongodb"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import { logger } from "@/lib/logs/logger"

// Add interface for our custom user type
interface CustomUser {
  _id: any
  email: string
  name?: string | null
  image?: string | null
  roles?: string[]
  password?: string
}

export async function hashPassword(password: string): Promise<string> {
  logger.info("Hashing password")
  return await hash(password, 8)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  logger.info("Verifying password")
  return await compare(password, hashedPassword)
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  logger.info("Validating password strength")
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  logger.info(`Password validation result: ${errors.length === 0 ? "Valid" : `Invalid with ${errors.length} errors`}`)
  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isValid = emailRegex.test(email)
  logger.info(
    `Email validation for ${email.substring(0, 3)}***${email.split("@")[1]}: ${isValid ? "Valid" : "Invalid"}`,
  )
  return isValid
}

export function validatePhone(phone: string): boolean {
  // Remove all non-digit characters except the plus sign
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
    } else if (cleaned.length === 10 && /^[5-9]/.test(cleaned)) {
      // Israeli mobile number without country code (e.g., 5251317777)
      cleaned = "+972" + cleaned
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

  // Validate Israeli mobile number format
  if (cleaned.startsWith("+972")) {
    const nationalNumber = cleaned.substring(4)
    // Israeli mobile numbers must:
    // 1. Start with 5 after country code
    // 2. Be exactly 9 digits after country code
    if (!nationalNumber.startsWith("5") || nationalNumber.length !== 9) {
      logger.info(`Phone validation for ${cleaned.substring(0, 5)}***: Invalid Israeli mobile format`)
      return false
    }
  }

  logger.info(`Phone validation for ${cleaned.substring(0, 5)}***: Valid`)
  return true
}

// Helper function to determine the default active role based on priority
function getDefaultActiveRole(roles: string[]): string {
  // Role priority: admin > professional > partner > member
  if (roles.includes("admin")) return "admin"
  if (roles.includes("professional")) return "professional"
  if (roles.includes("partner")) return "partner"
  if (roles.includes("member")) return "member"

  // If no recognized role, return the first one
  return roles[0] || "member"
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const authId = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

        if (!credentials?.email || !credentials?.password) {
          logger.warn(`[${authId}] Missing credentials`)
          throw new Error("Invalid credentials")
        }

        try {
          logger.info(`[${authId}] Password login attempt started`)
          await dbConnect()
          logger.info(`[${authId}] Database connection established`)

          // Determine if the identifier is email or phone
          const identifier = credentials.email.toLowerCase().trim()
          let query: any = {}
          
          // First try email validation
          if (validateEmail(identifier)) {
            query = { email: identifier }
            logger.info(`[${authId}] Attempting email login for: ${identifier.substring(0, 3)}***${identifier.split("@")[1]}`)
          } 
          // If not email, try phone validation
          else if (validatePhone(identifier)) {
            // Normalize phone number for consistent querying
            let cleaned = identifier.replace(/[^\d+]/g, "")
            if (!cleaned.startsWith("+")) {
              if (cleaned.startsWith("0")) {
                cleaned = "+972" + cleaned.substring(1)
              } else if (cleaned.length === 9 && /^[5-9]/.test(cleaned)) {
                cleaned = "+972" + cleaned
              } else if (cleaned.length === 10 && cleaned.startsWith("972")) {
                cleaned = "+" + cleaned
              } else {
                cleaned = "+972" + cleaned
              }
            }
            if (cleaned.startsWith("+9720")) {
              cleaned = "+972" + cleaned.substring(5)
            }
            query = { phone: cleaned }
            logger.info(`[${authId}] Attempting phone login for: ${cleaned.substring(0, 5)}***`)
          } else {
            logger.warn(`[${authId}] Invalid identifier format: neither valid email nor phone`)
            throw new Error("Invalid email or phone")
          }

          const user = await User.findOne(query).select("+password email name image roles") as CustomUser

          if (!user) {
            logger.warn(`[${authId}] No user found with identifier`)
            throw new Error("No user found")
          }
          logger.info(`[${authId}] User found with ID: ${user._id}`)

          if (!user.password) {
            logger.warn(`[${authId}] User found but no password set`)
            throw new Error("No password set for user")
          }

          logger.info(`[${authId}] Verifying password...`)
          const isValid = await verifyPassword(credentials.password, user.password)
          logger.info(`[${authId}] Password verification result: ${isValid ? "Valid" : "Invalid"}`)

          if (!isValid) {
            logger.warn(`[${authId}] Invalid password for user: ${user._id}`)
            throw new Error("Invalid password")
          }

          const userRoles = user.roles || ["member"]
          logger.info(`[${authId}] Login successful for user: ${user._id} with roles: ${userRoles.join(", ")}`)

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            roles: userRoles,
          }
        } catch (error) {
          logger.error(`[${authId}] Authorization error:`, error)
          throw error
        }
      },
    }),
    CredentialsProvider({
      id: "otp",
      name: "OTP",
      credentials: {
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        const otpAuthId = `otp_auth_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

        if (!credentials?.userId) {
          logger.warn(`[${otpAuthId}] Missing userId in OTP credentials`)
          throw new Error("Invalid credentials")
        }

        try {
          logger.info(`[${otpAuthId}] OTP login attempt started for user ID: ${credentials.userId}`)
          await dbConnect()
          logger.info(`[${otpAuthId}] Database connection established`)

          const user = await User.findById(credentials.userId) as CustomUser

          if (!user) {
            logger.warn(`[${otpAuthId}] User not found with ID: ${credentials.userId}`)
            throw new Error("User not found")
          }
          logger.info(`[${otpAuthId}] User found with ID: ${credentials.userId}`)

          const userRoles = user.roles || ["member"]
          logger.info(
            `[${otpAuthId}] OTP login successful for user: ${credentials.userId} with roles: ${userRoles.join(", ")}`,
          )

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            roles: userRoles,
          }
        } catch (error) {
          logger.error(`[${otpAuthId}] OTP authorization error:`, error)
          throw error
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      const jwtId = `jwt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

      // When user signs in, add their data to the token
      if (user) {
        logger.info(`[${jwtId}] Creating JWT for user: ${user.id}`)
        token.id = user.id
        // Cast to unknown first, then to CustomUser
        const customUser = user as unknown as CustomUser
        token.roles = customUser.roles || ["member"]
        // Set default active role based on priority
        token.activeRole = getDefaultActiveRole(token.roles as string[])
        logger.info(
          `[${jwtId}] JWT created with roles: ${(customUser.roles || ["member"]).join(", ")}, active role: ${token.activeRole}`,
        )
        return token
      }

      // Handle session updates (like role switching)
      if (trigger === "update" && session) {
        if (session.activeRole) {
          logger.info(`[${jwtId}] Updating JWT with new active role: ${session.activeRole}`)
          token.activeRole = session.activeRole
        }
        return token
      }

      // If this is a session refresh, only refresh if necessary
      if (trigger === "update" && token.id && !session) {
        try {
          logger.info(`[${jwtId}] Refreshing user data for JWT: ${token.id}`)
          await dbConnect()
          const dbUser = await User.findById(token.id).select("roles")
          if (dbUser) {
            token.roles = dbUser.roles || ["member"]
            // Keep the active role if it exists in the updated roles, otherwise set default
            if (!token.activeRole || !dbUser.roles.includes(token.activeRole as string)) {
              token.activeRole = getDefaultActiveRole(dbUser.roles)
              logger.info(`[${jwtId}] Updated active role to: ${token.activeRole}`)
            }
          }
        } catch (error) {
          logger.error(`[${jwtId}] Error refreshing user data:`, error)
        }
        return token
      }

      if (account) {
        logger.info(`[${jwtId}] Adding access token to JWT`)
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

      if (session.user && token) {
        logger.info(`[${sessionId}] Creating session for user: ${token.id}`)
        session.user.id = token.id as string
        session.user.roles = token.roles as string[]
        session.user.activeRole = token.activeRole as string
        logger.info(
          `[${sessionId}] Session created with roles: ${(token.roles as string[]).join(", ")}, active role: ${token.activeRole}`,
        )
      }
      return session
    },
    async signIn({ user }) {
      const signInId = `signin_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
      logger.info(`[${signInId}] User signed in: ${user.id}`)
      return true
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, metadata) {
      logger.error(`NextAuth error: ${code}`, metadata)
    },
    warn(code) {
      logger.warn(`NextAuth warning: ${code}`)
    },
    debug(code, metadata) {
      logger.debug(`NextAuth debug: ${code}`, metadata)
    },
  },
}

// Helper function to check if user has a specific role
export function hasRole(roles: string[] | undefined, role: string): boolean {
  return roles?.includes(role) || false
}
