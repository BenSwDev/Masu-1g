import Address, { IAddress } from "@/lib/db/models/address"
import { logger } from "@/lib/logs/logger"

class AddressQueries {
  // Get all addresses for a user
  static async getUserAddresses(userId: string) {
    return await Address.find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean()
      .exec()
  }

  // Get default address for a user
  static async getDefaultAddress(userId: string) {
    return await Address.findOne({ userId, isDefault: true })
      .lean()
      .exec()
  }

  // Create new address
  static async createAddress(data: Partial<IAddress>) {
    // If this is the first address or marked as default, update other addresses
    if (data.isDefault) {
      await Address.updateMany(
        { userId: data.userId },
        { $set: { isDefault: false } }
      ).exec()
    }

    return await Address.create(data)
  }

  // Update address
  static async updateAddress(id: string, userId: string, data: Partial<IAddress>) {
    // If setting as default, update other addresses
    if (data.isDefault) {
      await Address.updateMany(
        { userId, _id: { $ne: id } },
        { $set: { isDefault: false } }
      ).exec()
    }

    return await Address.findOneAndUpdate(
      { _id: id, userId },
      { $set: data },
      { new: true }
    ).exec()
  }

  // Delete address
  static async deleteAddress(id: string, userId: string) {
    const address = await Address.findOne({ _id: id, userId }).exec()
    
    if (!address) {
      throw new Error("Address not found")
    }

    // If deleting default address, set another address as default
    if (address.isDefault) {
      const nextAddress = await Address.findOne({ userId, _id: { $ne: id } })
        .sort({ createdAt: -1 })
        .exec()

      if (nextAddress) {
        nextAddress.isDefault = true
        await nextAddress.save()
      }
    }

    return await Address.deleteOne({ _id: id, userId }).exec()
  }

  // Set address as default
  static async setDefaultAddress(id: string, userId: string) {
    // Update all addresses to not default
    await Address.updateMany(
      { userId },
      { $set: { isDefault: false } }
    ).exec()

    // Set the specified address as default
    return await Address.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isDefault: true } },
      { new: true }
    ).exec()
  }
}

export default AddressQueries 