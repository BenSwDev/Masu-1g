import mongoose, { Schema, type Document, type Types } from "mongoose"

interface PriceAdjustment {
  type: "percentage" | "fixed"
  value: number
  reason?: string
}

interface WeeklyHourItem {
  _id?: Types.ObjectId
  day: number // 0 (Sunday) to 6 (Saturday)
  isActive: boolean
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  priceAdjustment?: PriceAdjustment
}

interface SpecialDateItem {
  _id?: Types.ObjectId
  date: Date
  name: string
  description?: string
  isActive: boolean
  isClosed?: boolean // New field to explicitly mark as closed, overriding times
  startTime?: string // HH:mm format, optional
  endTime?: string // HH:mm format, optional
  priceAdjustment?: PriceAdjustment
}

export interface IWorkingHours extends Document {
  _id: Types.ObjectId // Mongoose _id is Types.ObjectId
  weeklyHours: WeeklyHourItem[]
  specialDates: SpecialDateItem[]
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

const WeeklyHourItemSchema = new Schema<WeeklyHourItem>(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    isActive: { type: Boolean, required: true, default: true },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    priceAdjustment: PriceAdjustmentSchema,
  },
  { _id: true },
) // _id: true will auto-generate ObjectId for subdocuments if not provided

const SpecialDateItemSchema = new Schema<SpecialDateItem>(
  {
    date: { type: Date, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, required: true, default: true },
    isClosed: { type: Boolean, default: false },
    startTime: { type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    endTime: { type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    priceAdjustment: PriceAdjustmentSchema,
  },
  { _id: true },
) // _id: true will auto-generate ObjectId for subdocuments

const WorkingHoursSchema = new Schema<IWorkingHours>(
  {
    weeklyHours: [WeeklyHourItemSchema],
    specialDates: [SpecialDateItemSchema],
  },
  {
    timestamps: true,
  },
)

WorkingHoursSchema.index({ "specialDates.date": 1 })

// Ensure weeklyHours always has 7 days, one for each day of the week
WorkingHoursSchema.pre("save", function (next) {
  if (this.isNew && this.weeklyHours.length === 0) {
    const defaultWeeklyHours: WeeklyHourItem[] = [
      { day: 0, isActive: false, startTime: "09:00", endTime: "17:00" }, // Sunday
      { day: 1, isActive: true, startTime: "09:00", endTime: "17:00" }, // Monday
      { day: 2, isActive: true, startTime: "09:00", endTime: "17:00" }, // Tuesday
      { day: 3, isActive: true, startTime: "09:00", endTime: "17:00" }, // Wednesday
      { day: 4, isActive: true, startTime: "09:00", endTime: "17:00" }, // Thursday
      { day: 5, isActive: true, startTime: "09:00", endTime: "14:00" }, // Friday
      { day: 6, isActive: false, startTime: "09:00", endTime: "17:00" }, // Saturday
    ]
    this.weeklyHours = defaultWeeklyHours
  }
  // Sort weeklyHours by day to ensure consistent order
  this.weeklyHours.sort((a, b) => a.day - b.day)
  next()
})

export const WorkingHours =
  mongoose.models.WorkingHours || mongoose.model<IWorkingHours>("WorkingHours", WorkingHoursSchema)

// Helper type for client-side data, converting ObjectId to string
export type ClientWorkingHours = Omit<
  IWorkingHours,
  "_id" | "weeklyHours" | "specialDates" | "createdAt" | "updatedAt"
> & {
  _id: string
  weeklyHours: (Omit<WeeklyHourItem, "_id"> & { _id?: string })[]
  specialDates: (Omit<SpecialDateItem, "_id" | "date"> & { _id?: string; date: string })[]
  createdAt: string
  updatedAt: string
}
