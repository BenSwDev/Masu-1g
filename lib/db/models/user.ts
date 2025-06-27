import mongoose, { Schema, type Document, type Model } from "mongoose"

export enum UserRole {
  MEMBER = "member",
  PROFESSIONAL = "professional",
  PARTNER = "partner",
  ADMIN = "admin",
  GUEST = "guest",
}

// Define interfaces for preferences
export interface ITreatmentPreferences {
  therapistGender: "male" | "female" | "any"
}

export interface INotificationPreferences {
  methods: ("email" | "sms")[]
  language: "he" | "en" | "ru"
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  email?: string
  phone: string
  password?: string
  gender?: "male" | "female" | "other"
  dateOfBirth?: Date
  image?: string
  emailVerified?: Date
  phoneVerified?: Date
  roles: string[] // Array of roles
  activeRole?: string // Add activeRole
  treatmentPreferences?: ITreatmentPreferences // New field
  notificationPreferences?: INotificationPreferences // New field
  originalGuestEmail?: string // Store original email for guest users
  originalGuestPhone?: string // Store original phone for guest users
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return this.isModified("password") && this.password != null
      },
      select: false, // Don't include password by default in queries
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    image: {
      type: String,
      required: false,
    },
    roles: {
      type: [String],
      default: [UserRole.MEMBER],
      enum: Object.values(UserRole),
    },
    activeRole: {
      type: String,
      enum: Object.values(UserRole),
      required: false,
    },
    emailVerified: {
      type: Date,
      required: false,
    },
    phoneVerified: {
      type: Date,
      required: false,
    },
    treatmentPreferences: {
      // New field definition
      therapistGender: {
        type: String,
        enum: ["male", "female", "any"],
        default: "any",
      },
    },
    notificationPreferences: {
      // New field definition
      methods: {
        type: [String],
        enum: ["email", "sms"],
        default: ["email", "sms"],
      },
      language: {
        type: String,
        enum: ["he", "en", "ru"],
        default: "he",
      },
    },
    originalGuestEmail: {
      type: String,
      required: false,
    },
    originalGuestPhone: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
)

// Ensure defaults are applied if the objects themselves are missing
UserSchema.pre("save", function (next) {
  if (this.isNew || !this.treatmentPreferences) {
    this.treatmentPreferences = { therapistGender: "any" }
  }
  if (this.isNew || !this.notificationPreferences) {
    this.notificationPreferences = { methods: ["sms", "email"], language: "he" }
  }
  if (this.treatmentPreferences && (this.treatmentPreferences as any).therapistGender === undefined) {
    (this.treatmentPreferences as any).therapistGender = "any"
  }
  if (this.notificationPreferences && (this.notificationPreferences as any).methods === undefined) {
    (this.notificationPreferences as any).methods = ["sms", "email"]
  }
  if (this.notificationPreferences && (this.notificationPreferences as any).language === undefined) {
    (this.notificationPreferences as any).language = "he"
  }
  next()
})

// שאר האינדקסים
UserSchema.index({ roles: 1 })
UserSchema.index({ createdAt: -1 })

// Text search index
UserSchema.index({
  name: "text",
  email: "text",
})

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema)

export default User
export { User }
