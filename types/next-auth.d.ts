import "next-auth"
import type { DefaultSession } from "next-auth"
import type { ITreatmentPreferences, INotificationPreferences } from "@/lib/db/models/user" // Import preference types

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      roles: string[]
      activeRole: string
      phone?: string
      treatmentPreferences?: ITreatmentPreferences // Add to Session User
      notificationPreferences?: INotificationPreferences // Add to Session User
    } & DefaultSession["user"]
  }

  // If you are extending the User object returned by the authorize callback
  interface User {
    roles: string[]
    activeRole: string
    phone?: string
    treatmentPreferences?: ITreatmentPreferences
    notificationPreferences?: INotificationPreferences
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    roles: string[]
    activeRole: string
    phone?: string
    treatmentPreferences?: ITreatmentPreferences // Add to JWT
    notificationPreferences?: INotificationPreferences // Add to JWT
  }
}
