import { compare, hash } from "bcryptjs"
import type { NextAuthOptions, User as NextAuthUser } from "next-auth" // Import User as NextAuthUser
import { getServerSession } from "next-auth/next" // Import getServerSession
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/db/mongodb"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user" // This is your Mongoose User model
import { logger } from "@/lib/logs/logger"

// Add interface for our custom user type from the session/token
interface SessionUser extends NextAuthUser {
  id: string
  roles?: string[]
  activeRole?: string
}

// Interface for the Mongoose User model (if different or for clarity)
interface CustomMongooseUser {
  _id: any
  email: string
  name?: string | null
  image?: string | null
  roles?: string[]
  password?: string
  activeRole?: string
}

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 8)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await compare(password, hashedPassword)
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
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
  let cleaned = phone.replace(/[^\d+]/g, "")
  if (!cleaned.startsWith("+")) {
    if (cleaned.startsWith("0")) {
      cleaned = "+972" + cleaned.substring(1)
    } else if (cleaned.length === 9 && /^[5-9]/.test(cleaned)) {
      cleaned = "+972" + cleaned
    } else if (cleaned.length === 10 && cleaned.startsWith("972")) {
      cleaned = "+" + cleaned
    } else if (cleaned.length === 10 && /^[5-9]/.test(cleaned)) {
      cleaned = "+972" + cleaned
    } else {
      cleaned = "+972" + cleaned
    }
  } else {
    if (cleaned.startsWith("+9720")) {
      cleaned = "+972" + cleaned.substring(5)
    }
  }
  if (cleaned.startsWith("+972")) {
    const nationalNumber = cleaned.substring(4)
    if (!nationalNumber.startsWith("5") || nationalNumber.length !== 9) {
      return false
    }
  }
  return true
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
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password")
        }
        await dbConnect()
        const identifier = credentials.email.toLowerCase().trim()
        let query: any = {}
        if (validateEmail(identifier)) {
          query = { email: identifier }
        } else if (validatePhone(identifier)) {
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
        } else {
          throw new Error("Invalid email or phone format")
        }
        const user = (await User.findOne(query).select("+password email name image roles")) as CustomMongooseUser
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
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          roles: userRoles,
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
        const user = (await User.findById(credentials.userId)) as CustomMongooseUser
        if (!user) {
          throw new Error("User not found")
        }
        const userRoles = user.roles && user.roles.length > 0 ? user.roles : ["member"]
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          roles: userRoles,
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
      // On first login
      if (user) {
        token.id = user.id
        const customUserFromProvider = user as unknown as { roles?: string[] } // User from provider
        token.roles =
          customUserFromProvider.roles && customUserFromProvider.roles.length > 0
            ? customUserFromProvider.roles
            : ["member"]

        const dbUser = (await User.findById(token.id).select("roles activeRole")) as CustomMongooseUser | null
        let activeRole = dbUser?.activeRole
        if (!activeRole || (dbUser && !dbUser.roles?.includes(activeRole))) {
          activeRole = getDefaultActiveRole(dbUser?.roles || token.roles)
          if (dbUser) {
            dbUser.activeRole = activeRole
            await User.findByIdAndUpdate(dbUser._id, { activeRole: activeRole })
          }
        }
        token.activeRole = activeRole
        return token
      }
      // On session update (role switch)
      if (trigger === "update" && session && (session as { activeRole?: string }).activeRole) {
        const dbUser = (await User.findById(token.id).select("roles activeRole")) as CustomMongooseUser | null
        if (dbUser) {
          token.roles = dbUser.roles && dbUser.roles.length > 0 ? dbUser.roles : ["member"]
          let activeRole = (session as { activeRole: string }).activeRole
          if (!dbUser.roles?.includes(activeRole)) {
            activeRole = getDefaultActiveRole(dbUser.roles)
          }
          // Update activeRole in DB
          await User.findByIdAndUpdate(dbUser._id, { activeRole: activeRole })
          token.activeRole = activeRole
        }
        return token
      }
      // On every other call, always sync from DB
      if (token.id) {
        const dbUser = (await User.findById(token.id).select("roles activeRole")) as CustomMongooseUser | null
        if (dbUser) {
          token.roles = dbUser.roles && dbUser.roles.length > 0 ? dbUser.roles : ["member"]
          let activeRole = dbUser.activeRole
          if (!activeRole || !dbUser.roles?.includes(activeRole)) {
            activeRole = getDefaultActiveRole(dbUser.roles)
            await User.findByIdAndUpdate(dbUser._id, { activeRole: activeRole })
          }
          token.activeRole = activeRole
        }
      }
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        ;(session.user as SessionUser).id = token.id as string
        ;(session.user as SessionUser).roles = token.roles as string[]
        ;(session.user as SessionUser).activeRole = token.activeRole as string
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

/**
 * Retrieves the current authenticated user's session.
 * This function is intended for use in Server Components and Route Handlers.
 * @returns {Promise<SessionUser | null>} The user object from the session, or null if not authenticated.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return null
  }
  // Ensure the user object conforms to SessionUser, especially the id, roles, and activeRole
  return {
    id: (session.user as any).id || "", // Make sure id is present
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    roles: (session.user as any).roles,
    activeRole: (session.user as any).activeRole,
  } as SessionUser
}
