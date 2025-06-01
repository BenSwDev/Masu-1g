import { z } from "zod"
import { UserRole } from "@/lib/db/models/user" // Assuming UserRole enum/type is defined

const availableRoles = Object.values(UserRole)

// Base schema for common fields
const ProfileSchema = z.object({
  name: z.string().min(2, { message: "validation.name.min" }),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  dateOfBirth: z.date().optional(),
})

const AccountSchema = z.object({
  email: z.string().email({ message: "validation.email.invalid" }),
  phone: z.string().optional(), // Assuming phone validation is handled by PhoneInput or a more specific regex
})

export const CreateUserSchema = ProfileSchema.merge(AccountSchema)
  .extend({
    password: z.string().min(8, { message: "validation.password.min" }),
    confirmPassword: z.string().min(8, { message: "validation.confirmPassword.min" }),
    roles: z.array(z.enum(availableRoles as [string, ...string[]])).min(1, { message: "validation.roles.min" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.password.mismatch",
    path: ["confirmPassword"],
  })

export type CreateUserSchemaType = z.infer<typeof CreateUserSchema>

export const UpdateUserProfileSchema = ProfileSchema
export type UpdateUserProfileSchemaType = z.infer<typeof UpdateUserProfileSchema>

export const UpdateUserAccountSchema = AccountSchema.extend({
  currentPassword: z.string().optional(), // For verifying identity if changing sensitive info or password
  newPassword: z.string().min(8, { message: "validation.password.min" }).optional(),
  confirmNewPassword: z.string().min(8, { message: "validation.confirmPassword.min" }).optional(),
}).refine(
  (data) => {
    if (data.newPassword && !data.confirmNewPassword) return false // if newPassword, confirmNewPassword is required
    if (data.newPassword && data.newPassword !== data.confirmNewPassword) return false // passwords must match
    return true
  },
  {
    message: "validation.password.mismatchOrMissing", // Generic message, specific can be handled in UI
    path: ["confirmNewPassword"],
  },
)
export type UpdateUserAccountSchemaType = z.infer<typeof UpdateUserAccountSchema>

export const UpdateUserRolesSchema = z.object({
  roles: z.array(z.enum(availableRoles as [string, ...string[]])).min(1, { message: "validation.roles.min" }),
})
export type UpdateUserRolesSchemaType = z.infer<typeof UpdateUserRolesSchema>

// Combined schema for the user form when editing
export const UpdateUserFormSchema = UpdateUserProfileSchema.merge(UpdateUserAccountSchema).merge(UpdateUserRolesSchema)
export type UpdateUserFormSchemaType = z.infer<typeof UpdateUserFormSchema>
