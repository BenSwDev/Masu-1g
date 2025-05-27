import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IUser extends Document {
  name: string
  email: string
  phone?: string
  password?: string
  gender?: "male" | "female" | "other"
  dateOfBirth?: Date
  image?: string
  emailVerified?: Date
  phoneVerified?: Date
  roles: string[] // Array of roles
  activeRole?: string // Add activeRole
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
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
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
      default: ["member"],
      enum: ["member", "professional", "partner", "admin"],
    },
    activeRole: {
      type: String,
      enum: ["member", "professional", "partner", "admin"],
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
  },
  {
    timestamps: true,
  },
)

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
