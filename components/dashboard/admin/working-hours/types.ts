/**
 * @file types.ts
 * @description Defines shared TypeScript types for the working hours feature on the client-side.
 * These types are typically used after data serialization from the server (e.g., ObjectIds to strings, Dates to ISO strings).
 */

/**
 * @interface ClientPriceAdjustment
 * @description Client-side representation of price adjustments.
 * @property {('percentage' | 'fixed')} type - The type of adjustment.
 * @property {number} value - The value of the adjustment.
 * @property {string} [reason] - An optional reason for the adjustment.
 */
export interface ClientPriceAdjustment {
  type: "percentage" | "fixed"
  value: number
  reason?: string
}

/**
 * @interface ClientWeeklyHourConfig
 * @description Client-side representation of a single day's weekly working hours configuration.
 *              Used in UI components and forms.
 * @property {string} [_id] - Optional ID, typically a string after serialization from MongoDB ObjectId.
 * @property {number} day - The day of the week (0 for Sunday, 6 for Saturday).
 * @property {boolean} isActive - Whether the business is open on this day.
 * @property {string} startTime - The opening time (e.g., "09:00").
 * @property {string} endTime - The closing time (e.g., "17:00").
 * @property {boolean} hasPriceAdjustment - UI flag to control visibility and logic of price adjustment section.
 * @property {ClientPriceAdjustment} [priceAdjustment] - Optional price adjustment details.
 */
export interface ClientWeeklyHourConfig {
  _id?: string
  day: number
  isActive: boolean
  startTime: string
  endTime: string
  hasPriceAdjustment: boolean
  priceAdjustment?: ClientPriceAdjustment
}

/**
 * @interface ClientSpecialDateConfig
 * @description Client-side representation of a special date configuration.
 *              Used in UI components and forms.
 * @property {string} _id - The ID of the special date, a string after serialization from MongoDB ObjectId.
 * @property {string} date - The specific date as an ISO string. Converted to a Date object in forms.
 * @property {string} name - The name of the special date/event.
 * @property {string} [description] - An optional description.
 * @property {boolean} isActive - Whether these special settings are active.
 * @property {string} [startTime] - Optional specific start time (e.g., "09:00").
 * @property {string} [endTime] - Optional specific end time (e.g., "17:00").
 * @property {boolean} hasPriceAdjustment - UI flag to control visibility and logic of price adjustment section.
 * @property {ClientPriceAdjustment} [priceAdjustment] - Optional price adjustment details.
 */
export interface ClientSpecialDateConfig {
  _id: string
  date: string // ISO string
  name: string
  description?: string
  isActive: boolean
  startTime?: string
  endTime?: string
  hasPriceAdjustment: boolean
  priceAdjustment?: ClientPriceAdjustment
}

/**
 * @interface SerializedWorkingHoursData
 * @description Structure of the working hours data as returned by `getWorkingHours` action (fully serialized for client consumption).
 * @property {ClientWeeklyHourConfig[]} weeklyHours - Array of weekly hour configurations.
 * @property {ClientSpecialDateConfig[]} specialDates - Array of special date configurations.
 */
export interface SerializedWorkingHoursData {
  weeklyHours: ClientWeeklyHourConfig[]
  specialDates: ClientSpecialDateConfig[]
}

/**
 * @type SpecialDateFormValues
 * @description Defines the shape of the form values for the SpecialDateForm.
 *              Dates are handled as Date objects within the form.
 */
export type SpecialDateFormValues = {
  date: Date // Date object for calendar picker
  name: string
  description?: string
  isActive: boolean
  startTime?: string
  endTime?: string
  hasPriceAdjustment: boolean
  priceAdjustmentType?: "percentage" | "fixed"
  priceAdjustmentValue?: number
  priceAdjustmentReason?: string
}
