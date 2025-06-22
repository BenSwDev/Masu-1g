import mongoose, { Schema, type Document } from "mongoose";
import type { IProfessionalShare } from "./booking";

export interface IPriceAddition {
  amount: number;
  type: "fixed" | "percentage";
  description?: string;
  appliesToEntireDay: boolean;
  startTime?: string;
  professionalShare?: IProfessionalShare;
}

export interface IFixedHours {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isActive: boolean;
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
  hasPriceAddition: boolean;
  priceAddition?: IPriceAddition;
  notes?: string;
  // New fields for advanced booking control
  minimumBookingAdvanceHours?: number; // הזמנות ליום זה יתאפשרו לפחות X שעות מראש
  cutoffTime?: string | null; // משעה X תחסם האופציה לבצע הזמנה ביום זה לאותו היום (Format: "HH:mm")
}

export interface ISpecialDateEvent {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  eventType?: "holiday" | "special" | "closure" | "other";
  color?: string; // For UI display
  dates: Date[]; // Array of dates for multi-day events
  isActive: boolean;
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
  hasPriceAddition: boolean;
  priceAddition?: IPriceAddition;
  notes?: string;
  // New fields for advanced booking control
  minimumBookingAdvanceHours?: number;
  cutoffTime?: string;
}

// Legacy interface for backward compatibility
export interface ISpecialDate {
  name: string;
  date: Date;
  isActive: boolean;
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
  hasPriceAddition: boolean;
  priceAddition?: {
    amount: number;
    type: "fixed" | "percentage"; // 'fixed' for ₪, 'percentage' for %
    description?: string; // Optional description for the surcharge
  };
  notes?: string;
}

export interface IWorkingHoursSettings extends Document {
  fixedHours: IFixedHours[];
  specialDates: ISpecialDate[]; // Legacy field - will be migrated to specialDateEvents
  specialDateEvents?: ISpecialDateEvent[]; // New field for grouped events
  slotIntervalMinutes?: number; // Added for configuring time slot generation
  minimumBookingLeadTimeHours?: number; // Added for booking lead time
  createdAt: Date;
  updatedAt: Date;
}

const PriceAdditionSchema = new Schema(
  {
    amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    type: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },
    description: {
      // Added description to schema
      type: String,
      maxlength: 100,
    },
    appliesToEntireDay: {
      type: Boolean,
      default: true,
    },
    startTime: {
      type: String,
      validate: {
        validator: (v: string) =>
          !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
        message: "Start time must be in HH:mm format",
      },
    },
    professionalShare: {
      type: new Schema(
        {
          amount: { type: Number, default: 70 },
          type: {
            type: String,
            enum: ["fixed", "percentage"],
            default: "percentage",
          },
        },
        { _id: false },
      ),
      default: { amount: 70, type: "percentage" },
    },
  },
  { _id: false },
);

const FixedHoursSchema = new Schema<IFixedHours>({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  startTime: {
    type: String,
    default: "09:00",
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "Start time must be in HH:mm format",
    },
  },
  endTime: {
    type: String,
    default: "17:00",
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "End time must be in HH:mm format",
    },
  },
  hasPriceAddition: {
    type: Boolean,
    default: false,
  },
  priceAddition: PriceAdditionSchema, // Used the sub-schema
  notes: {
    type: String,
    maxlength: 500,
    default: "",
  },
  // New fields for advanced booking control
  minimumBookingAdvanceHours: {
    type: Number,
    min: 0,
    default: 2, // Default to 2 hours advance booking
  },
  cutoffTime: {
    type: String,
    validate: {
      validator: (v: string) =>
        !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "Cutoff time must be in HH:mm format",
    },
    default: null,
  },
});

FixedHoursSchema.pre("save", function (next) {
  if (this.isActive && !this.priceAddition) {
    this.priceAddition = { amount: 0, type: "fixed" };
  }
  if (!this.hasPriceAddition) {
    this.priceAddition = { amount: 0, type: "fixed" };
  } else if (
    this.hasPriceAddition &&
    this.priceAddition &&
    this.priceAddition.amount === 0
  ) {
    // If hasPriceAddition is true but amount is 0, maybe it should be false?
    // Or ensure description is set if amount > 0. For now, just ensure object exists.
  }
  next();
});

const SpecialDateSchema = new Schema<ISpecialDate>({
  name: {
    type: String,
    required: true,
    maxlength: 100,
  },
  date: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startTime: {
    type: String,
    default: "09:00",
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "Start time must be in HH:mm format",
    },
  },
  endTime: {
    type: String,
    default: "17:00",
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "End time must be in HH:mm format",
    },
  },
  hasPriceAddition: {
    type: Boolean,
    default: false,
  },
  priceAddition: PriceAdditionSchema,
  notes: {
    type: String,
    maxlength: 500,
    default: "",
  },
});

// New schema for special date events (multi-day support)
const SpecialDateEventSchema = new Schema<ISpecialDateEvent>({
  name: {
    type: String,
    required: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  eventType: {
    type: String,
    enum: ["holiday", "special", "closure", "other"],
    default: "special",
  },
  color: {
    type: String,
    default: "#3B82F6", // Blue color
  },
  dates: {
    type: [Date],
    required: true,
    validate: {
      validator: (v: Date[]) => v.length > 0,
      message: "At least one date is required",
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startTime: {
    type: String,
    default: "09:00",
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "Start time must be in HH:mm format",
    },
  },
  endTime: {
    type: String,
    default: "17:00",
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "End time must be in HH:mm format",
    },
  },
  hasPriceAddition: {
    type: Boolean,
    default: false,
  },
  priceAddition: PriceAdditionSchema,
  notes: {
    type: String,
    maxlength: 500,
    default: "",
  },
  // New fields for advanced booking control
  minimumBookingAdvanceHours: {
    type: Number,
    min: 0,
    default: 2,
  },
  cutoffTime: {
    type: String,
    validate: {
      validator: (v: string) =>
        !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "Cutoff time must be in HH:mm format",
    },
    default: null,
  },
});

const WorkingHoursSettingsSchema = new Schema<IWorkingHoursSettings>(
  {
    fixedHours: {
      type: [FixedHoursSchema],
      default: [],
      validate: {
        validator: (v: IFixedHours[]) => v.length === 7,
        message: "Fixed hours must contain exactly 7 days",
      },
    },
    specialDates: {
      type: [SpecialDateSchema],
      default: [],
    },
    specialDateEvents: {
      type: [SpecialDateEventSchema],
      default: [],
    },
    slotIntervalMinutes: {
      // Added field
      type: Number,
      default: 30,
      min: 5,
      max: 120,
    },
    minimumBookingLeadTimeHours: {
      // Added field
      type: Number,
      default: 2,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

WorkingHoursSettingsSchema.pre("save", function (next) {
  if (this.isNew && this.fixedHours.length === 0) {
    // Only initialize if new and empty
    for (let i = 0; i < 7; i++) {
      this.fixedHours.push({
        dayOfWeek: i,
        isActive: false, // Default to inactive
        startTime: "09:00",
        endTime: "17:00",
        hasPriceAddition: false,
        priceAddition: { amount: 0, type: "fixed" },
        notes: "",
        minimumBookingAdvanceHours: 2,
        cutoffTime: null,
      } as IFixedHours); // Cast to IFixedHours
    }
  }
  // Ensure all days 0-6 exist if not new or not empty
  for (let i = 0; i < 7; i++) {
    const existingDay = this.fixedHours.find((day) => day.dayOfWeek === i);
    if (!existingDay) {
      this.fixedHours.push({
        dayOfWeek: i,
        isActive: false,
        startTime: "09:00",
        endTime: "17:00",
        hasPriceAddition: false,
        priceAddition: { amount: 0, type: "fixed" },
        notes: "",
        minimumBookingAdvanceHours: 2,
        cutoffTime: null,
      } as IFixedHours);
    }
  }

  this.fixedHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  // Validate unique dates in legacy specialDates
  const dates = this.specialDates.map(
    (sd) => sd.date.toISOString().split("T")[0],
  );
  const uniqueDates = [...new Set(dates)];
  if (dates.length !== uniqueDates.length) {
    return next(new Error("Duplicate special dates are not allowed"));
  }

  // Validate unique event names in specialDateEvents
  if (this.specialDateEvents) {
    const eventNames = this.specialDateEvents.map((event) => event.name);
    const uniqueEventNames = [...new Set(eventNames)];
    if (eventNames.length !== uniqueEventNames.length) {
      return next(new Error("Duplicate event names are not allowed"));
    }
  }

  next();
});

// Create the model
const WorkingHoursSettings =
  mongoose.models.WorkingHoursSettings ||
  mongoose.model<IWorkingHoursSettings>(
    "WorkingHoursSettings",
    WorkingHoursSettingsSchema,
  );

export { WorkingHoursSettings };
