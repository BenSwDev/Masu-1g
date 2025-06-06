import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface ICounter extends Document {
  _id: string // Name of the sequence (e.g., "bookingNumber")
  sequence_value: number
}

const CounterSchema: Schema<ICounter> = new Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 },
})

// Ensure the model is not recompiled if it already exists
const Counter: Model<ICounter> = mongoose.models.Counter || mongoose.model<ICounter>("Counter", CounterSchema)

export default Counter

/**
 * Atomically finds and updates a counter document to get the next sequence value.
 * If the counter doesn't exist, it creates one starting from 1.
 * @param sequenceName The name of the sequence (e.g., "bookingNumber").
 * @returns The next sequence value.
 */
export async function getNextSequenceValue(sequenceName: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }, // new: true returns the document AFTER update
  )
  return counter.sequence_value
}
