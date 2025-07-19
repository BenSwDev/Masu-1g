import { compare, hash } from "bcryptjs"
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/db/mongodb"
import dbConnect from "@/lib/db/mongoose"
import User, { type ITreatmentPreferences, type INotificationPreferences } from "@/lib/db/models/user"
import { logger } from "@/lib/logs/logger"

// Add interface for our custom user type
interface CustomUser {
  _id: any
  email: string
  name?: string | null
  image?: string | null
  phone?: string
  gender?: "male" | "female"
  dateOfBirth?: Date
  roles?: string[]
  password?: string
  activeRole?: string
  treatmentPreferences?: ITreatmentPreferences // Add here
  notificationPreferences?: INotificationPreferences // Add here
}

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 8)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await compare(password, hashedPassword)
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Length check
  if (password.length < 8) {
    errors.push("הסיסמה חייבת להיות לפחות 8 תווים")
  }
  
  // Check character types (need at least 3 out of 4)
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\\/~`]/.test(password)
  
  const typesCount = [hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length
  
  if (typesCount < 3) {
    errors.push("הסיסמה חייבת להכיל לפחות 3 מתוך 4 הקטגוריות הבאות: אות גדולה (A-Z), אות קטנה (a-z), מספר (0-9), או תו מיוחד (!@#$%^&*...)")
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  // Use the centralized phone validation
  try {
    const { validatePhoneNumber } = require("@/lib/utils/phone-utils")
    return validatePhoneNumber(phone)
  } catch {
    // Fallback validation if import fails
    if (!phone) return false
    const cleaned = phone.replace(/[^\d+]/g, "")
    return cleaned.startsWith("+") && cleaned.length >= 9 && cleaned.length <= 15
    }
}

// Helper function to determine the default active role based on priority
function getDefaultActiveRole(roles: string[]): string {
  if (!roles || roles.length === 0) return "member"
  if (roles.includes("admin")) return "admin"
  if (roles.includes("professional")) return "professional"
  if (roles.includes("partner")) return "partner"
  if (roles.includes("member")) return "member"
  return roles[0] || "member"
}

const defaultTreatmentPreferences: ITreatmentPreferences = { therapistGender: "any" }
const defaultNotificationPreferences: INotificationPreferences = { methods: ["sms", "email"], language: "he" }

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as any,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        phone: { label: "Phone", type: "tel" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          throw new Error("Missing phone or password")
        }
        await dbConnect()
        const identifier = credentials.phone.toLowerCase().trim()
        let query: any = {}
        
        if (validatePhone(identifier)) {
          const { normalizePhoneNumber } = await import("@/lib/utils/phone-utils")
          const cleaned = normalizePhoneNumber(identifier)
          query = { phone: cleaned }
        } else {
          throw new Error("Invalid phone format - only phone login is supported")
        }
        
        const user = (await User.findOne(query).select(
          "+password email name image phone gender dateOfBirth roles activeRole treatmentPreferences notificationPreferences",
        )) as CustomUser // Include preferences and activeRole
        if (!user) {
          throw new Error("No user found with this identifier")
        }
        if (!user.password) {
          throw new Error("No password set for this user")
        }
        const isValid = await verifyPassword(credentials.password, user.password)
        if (!isValid) {
          throw new Error("Invalid password")
        }
        const userRoles = user.roles && user.roles.length > 0 ? user.roles : ["member"]
        const activeRole = user.activeRole || getDefaultActiveRole(userRoles)
        
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          phone: user.phone,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth,
          roles: userRoles,
          activeRole: activeRole,
          treatmentPreferences: user.treatmentPreferences || defaultTreatmentPreferences,
          notificationPreferences: user.notificationPreferences || defaultNotificationPreferences,
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
        if (!credentials?.userId) {
          throw new Error("Missing userId in OTP credentials")
        }
        await dbConnect()
        const user = (await User.findById(credentials.userId).select(
          "email name image phone gender dateOfBirth roles activeRole treatmentPreferences notificationPreferences",
        )) as CustomUser // Include preferences and activeRole
        if (!user) {
          throw new Error("User not found")
        }
        const userRoles = user.roles && user.roles.length > 0 ? user.roles : ["member"]
        const activeRole = user.activeRole || getDefaultActiveRole(userRoles)
        
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          phone: user.phone,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth,
          roles: userRoles,
          activeRole: activeRole,
          treatmentPreferences: user.treatmentPreferences || defaultTreatmentPreferences,
          notificationPreferences: user.notificationPreferences || defaultNotificationPreferences,
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
      await dbConnect()
      // On first login or when user object is passed
      if (user) {
        token.id = user.id
        const customUserFromAuth = user as unknown as CustomUser // User from authorize callback
        token.phone = customUserFromAuth.phone
        token.gender = customUserFromAuth.gender
        token.dateOfBirth = customUserFromAuth.dateOfBirth
        token.roles =
          customUserFromAuth.roles && customUserFromAuth.roles.length > 0 ? customUserFromAuth.roles : ["member"]

        // Fetch from DB to ensure latest activeRole and preferences
        const dbUser = await User.findById(token.id).select(
          "phone gender dateOfBirth roles activeRole treatmentPreferences notificationPreferences",
        )

        let activeRole = dbUser?.activeRole
        if (!activeRole || !dbUser?.roles.includes(activeRole)) {
          activeRole = getDefaultActiveRole(dbUser?.roles || [])
          if (dbUser) {
            dbUser.activeRole = activeRole
            // await dbUser.save(); // Avoid saving here if not strictly necessary, rely on updates
          }
        }
        token.activeRole = activeRole
        token.treatmentPreferences = dbUser?.treatmentPreferences || defaultTreatmentPreferences
        token.notificationPreferences = dbUser?.notificationPreferences || defaultNotificationPreferences
      }
      // On session update (e.g., role switch or preference update)
      else if (trigger === "update" && session) {
        const dbUser = await User.findById(token.id).select(
          "phone gender dateOfBirth roles activeRole treatmentPreferences notificationPreferences",
        )
        if (dbUser) {
          token.roles = dbUser.roles && dbUser.roles.length > 0 ? dbUser.roles : ["member"]

          if (session.activeRole) {
            let activeRole = session.activeRole
            // Ensure the requested role is valid for this user
            if (!dbUser.roles.includes(activeRole)) {
              activeRole = getDefaultActiveRole(dbUser.roles)
              console.warn(`User ${token.id} attempted to switch to role ${session.activeRole} but doesn't have access. Falling back to ${activeRole}`)
            }
            token.activeRole = activeRole
            
            // Update database to match the token
            if (dbUser.activeRole !== activeRole) {
              await User.findByIdAndUpdate(token.id, { activeRole })
            }
          } else {
            // Always sync with database activeRole to ensure consistency
            token.activeRole = dbUser.activeRole || getDefaultActiveRole(dbUser.roles)
          }
          
          // Update other user data
          token.phone = dbUser.phone
          token.gender = dbUser.gender
          token.dateOfBirth = dbUser.dateOfBirth
          token.treatmentPreferences = dbUser.treatmentPreferences || defaultTreatmentPreferences
          token.notificationPreferences = dbUser.notificationPreferences || defaultNotificationPreferences
        }
      }
      // On every other call, sync from DB if needed (e.g., if token is old)
      // For simplicity and to ensure freshness, we can always fetch if not first login or update
      else if (token.id) {
        const dbUser = await User.findById(token.id).select(
          "phone gender dateOfBirth roles activeRole treatmentPreferences notificationPreferences",
        )
        if (dbUser) {
          token.roles = dbUser.roles && dbUser.roles.length > 0 ? dbUser.roles : ["member"]
          let activeRole = dbUser.activeRole
          if (!activeRole || !dbUser.roles.includes(activeRole)) {
            activeRole = getDefaultActiveRole(dbUser.roles)
            // dbUser.activeRole = activeRole; // Avoid save if not changing
            // await dbUser.save();
          }
          token.activeRole = activeRole
          token.phone = dbUser.phone
          token.gender = dbUser.gender
          token.dateOfBirth = dbUser.dateOfBirth
          token.treatmentPreferences = dbUser.treatmentPreferences || defaultTreatmentPreferences
          token.notificationPreferences = dbUser.notificationPreferences || defaultNotificationPreferences
        }
      }

      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.roles = token.roles as string[]
        session.user.activeRole = token.activeRole as string
        session.user.phone = token.phone as string
        session.user.gender = token.gender as "male" | "female"
        session.user.dateOfBirth = token.dateOfBirth as Date
        session.user.treatmentPreferences = token.treatmentPreferences as ITreatmentPreferences // Add to session
        session.user.notificationPreferences = token.notificationPreferences as INotificationPreferences // Add to session
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
function hasRole(roles: string[] | undefined, role: string): boolean {
  return roles?.includes(role) || false
}
