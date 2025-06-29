"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User, { type IUser } from "@/lib/db/models/user"
import PasswordResetToken from "@/lib/db/models/password-reset-token"
import { emailService } from "@/lib/notifications/email-service" // Use the singleton instance
import type { NotificationData } from "@/lib/notifications/notification-types"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { revalidatePath } from "next/cache"

// All user management functions moved to app/dashboard/(user)/(roles)/admin/users/actions.ts
