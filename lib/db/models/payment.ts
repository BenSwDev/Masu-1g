import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IPayment extends Document {
  _id: string
  order_id: string
  booking_id?: string // קישור להזמנה
  pay_type: "ccard" | "refund" | "cash"
  sub_type: "direct" | "token" | "manual"
  start_time: Date
  end_time?: Date
  sum: number
  complete: boolean
  has_token: boolean
  transaction_id?: string
  cardcom_internal_deal_number?: string
  input_data?: any // נתוני הקלט שנשלחו ל-CARDCOM
  result_data?: any // התגובה המלאה מ-CARDCOM (כולל טוקן)
  created_at: Date
  updated_at: Date
}

const PaymentSchema: Schema<IPayment> = new Schema(
  {
    _id: { 
      type: String, 
      required: true,
      default: () => crypto.randomUUID()
    },
    order_id: { 
      type: String, 
      required: true,
      index: true
    },
    booking_id: {
      type: String,
      index: true,
      sparse: true
    },
    
    // סוג התשלום
    pay_type: { 
      type: String, 
      enum: ["ccard", "refund", "cash"], 
      default: "ccard" 
    },
    sub_type: { 
      type: String, 
      enum: ["direct", "token", "manual"], 
      default: "direct" 
    },
    
    // זמנים
    start_time: { 
      type: Date, 
      default: Date.now,
      index: true
    },
    end_time: { type: Date },
    
    // פרטי תשלום
    sum: { 
      type: Number, 
      required: true,
      min: 0
    },
    complete: { 
      type: Boolean, 
      default: false,
      index: true
    },
    has_token: { 
      type: Boolean, 
      default: false 
    },
    
    // מזהי CARDCOM
    transaction_id: { 
      type: String,
      index: true,
      sparse: true
    },
    cardcom_internal_deal_number: {
      type: String,
      sparse: true
    },
    
    // נתוני JSON
    input_data: { type: Schema.Types.Mixed },
    result_data: { type: Schema.Types.Mixed },
    
    // מטא-דטה
    created_at: { 
      type: Date, 
      default: Date.now,
      index: true
    },
    updated_at: { 
      type: Date, 
      default: Date.now 
    }
  },
  { 
    timestamps: { updatedAt: "updated_at" },
    collection: "payments"
  }
)

// אינדקסים מורכבים
PaymentSchema.index({ order_id: 1, created_at: -1 })
PaymentSchema.index({ booking_id: 1, created_at: -1 })
PaymentSchema.index({ complete: 1, has_token: 1 })
PaymentSchema.index({ transaction_id: 1 }, { sparse: true })

export const Payment: Model<IPayment> = mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema) 