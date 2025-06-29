/**
 * BOOKING ACTIONS - LEGACY INDEX
 * 
 * This file has been refactored into multiple focused modules.
 * All functions are now organized by responsibility following the ROLE OF ONE principle.
 * 
 * Original file: 155KB, 3,667 lines
 * New modular structure: 8 modules, 154KB total
 * 
 * Modules:
 * - booking-utils.ts (12.6KB) - Utility functions
 * - booking-availability.ts (14.1KB) - Time slots and availability
 * - booking-pricing.ts (19KB) - Price calculations
 * - booking-professional.ts (23.4KB) - Professional operations
 * - booking-crud.ts (40.4KB) - Core CRUD operations
 * - booking-guest.ts (20.2KB) - Guest booking operations
 * - booking-abandoned.ts (14KB) - Abandoned booking tracking
 * - booking-special.ts (11.2KB) - Special operations and legacy functions
 * 
 * Benefits:
 * - Better maintainability through focused modules
 * - Easier testing of individual components
 * - Reduced cognitive load when working on specific features
 * - Clear separation of concerns
 * - Improved code discoverability
 */

// Re-export all functions from the new modular structure
export * from './booking/index'

// Maintain backward compatibility - all existing imports will continue to work
// Example: import { createBooking } from '@/actions/booking-actions'
