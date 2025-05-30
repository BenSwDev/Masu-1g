import mongoose, { Schema, type Document, type Types } from "mongoose"

/**
 * @interface PriceAdjustment
 * @description Defines the structure for price adjustments.
 * @property {('percentage' | 'fixed')} type - The type of adjustment (percentage or fixed amount).
 * @property {number} value - The value of the adjustment. Must be non-negative.
 * @property {string} [reason] - An optional reason for the adjustment.
 */
export interface PriceAdjustment {
  type: "percentage" | "fixed"
  value: number
  reason?: string
}

/**
 * @interface WeeklyHourConfig
 * @description Defines the structure for a single day's weekly working hours configuration within the database.
 * @property {Types.ObjectId} [_id] - Optional MongoDB ObjectId, usually auto-generated for subdocuments.
 * @property {number} day - The day of the week (0 for Sunday, 6 for Saturday).
 * @property {boolean} isActive - Whether the business is open on this day.
 * @property {string} startTime - The opening time (e.g., "09:00").
 * @property {string} endTime - The closing time (e.g., "17:00").
 * @property {PriceAdjustment} [priceAdjustment] - Optional price adjustment for this day.
 */
export interface WeeklyHourConfig {
  _id?: Types.ObjectId
  day: number
  isActive: boolean
  startTime: string
  endTime: string
  priceAdjustment?: PriceAdjustment
}

/**
 * @interface SpecialDateConfig
 * @description Defines the structure for a special date configuration (e.g., holidays, events) within the database.
 * @property {Types.ObjectId} [_id] - Optional MongoDB ObjectId, usually auto-generated for subdocuments.
 * @property {Date} date - The specific date.
 * @property {string} name - The name of the special date/event.
 * @property {string} [description] - An optional description.
 * @property {boolean} isActive - Whether these special settings are active.
 * @property {string} [startTime] - Optional specific start time for this date.
 * @property {string} [endTime] - Optional specific end time for this date.
 * @property {PriceAdjustment} [priceAdjustment] - Optional price adjustment for this special date.
 */
export interface SpecialDateConfig {
  _id?: Types.ObjectId
  date: Date
  name: string
  description?: string
  isActive: boolean
  startTime?: string
  endTime?: string
  priceAdjustment?: PriceAdjustment
}

/**
 * @interface IWorkingHours
 * @extends Document
 * @description Mongoose document interface for storing working hours configurations.
 *              The `_id` for the document itself is provided by `mongoose.Document`.
 * @property {WeeklyHourConfig[]} weeklyHours - An array of weekly hour configurations for each day.
 * @property {SpecialDateConfig[]} specialDates - An array of special date configurations.
 * @property {Date} createdAt - Timestamp of creation.
 * @property {Date} updatedAt - Timestamp of last update.
 */
export interface IWorkingHours extends Document {
  weeklyHours: WeeklyHourConfig[]
  specialDates: SpecialDateConfig[]
  createdAt: Date
  updatedAt: Date
}

const PriceAdjustmentSchema = new Schema<PriceAdjustment>(
  {
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
    reason: String,
  },
  { _id: false },
)

const WeeklyHourConfigSchema = new Schema<WeeklyHourConfig>({
  day: { type: Number, required: true, min: 0, max: 6 },
  isActive: { type: Boolean, required: true, default: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  priceAdjustment: PriceAdjustmentSchema,
})

const SpecialDateConfigSchema = new Schema<SpecialDateConfig>({
  date: { type: Date, required: true },
  name: { type: String, required: true },
  description: String,
  isActive: { type: Boolean, required: true, default: true },
  startTime: String,
  endTime: String,
  priceAdjustment: PriceAdjustmentSchema,
})

const WorkingHoursSchema = new Schema<IWorkingHours>(
  {
    weeklyHours: [WeeklyHourConfigSchema],
    specialDates: [SpecialDateConfigSchema],
  },
  {
    timestamps: true,
  },
)

WorkingHoursSchema.index({ "specialDates.date": 1 })

export const WorkingHours =
  mongoose.models.WorkingHours || mongoose.model<IWorkingHours>("WorkingHours", WorkingHoursSchema)
