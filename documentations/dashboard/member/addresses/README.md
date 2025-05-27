# Addresses Management Feature

This document provides comprehensive documentation for the addresses management feature in the dashboard.

## Overview

The addresses management feature allows users to manage their delivery addresses. Users can add, edit, delete, and set default addresses. The feature supports multiple address types and includes RTL/LTR support with translations in Hebrew, English, and Russian.

## File Structure

\`\`\`
├── app/
│   └── dashboard/
│       └── member/
│           └── addresses/
│               └── page.tsx           # Main addresses page component
├── components/
│   └── dashboard/
│       └── addresses/
│           ├── address-card.tsx       # Address card component
│           └── address-form.tsx       # Address form component
├── lib/
│   ├── db/
│   │   ├── models/
│   │   │   └── address.ts            # Address model and schema
│   │   └── queries/
│   │       └── address-queries.ts     # Database queries for addresses
│   └── translations/
│       ├── he.json                   # Hebrew translations
│       ├── en.json                   # English translations
│       └── ru.json                   # Russian translations
└── actions/
    └── address-actions.ts            # Server actions for address operations
\`\`\`

## Components

### AddressCard (`components/dashboard/addresses/address-card.tsx`)

Displays a single address with the following features:
- Shows address details based on type (apartment, house, office, hotel, other)
- Displays default address badge
- Provides actions for:
  - Editing address
  - Setting as default
  - Deleting address
- Handles loading states and error feedback
- Supports RTL/LTR layouts

### AddressForm (`components/dashboard/addresses/address-form.tsx`)

Form component for creating and editing addresses:
- Dynamic fields based on address type
- Validation for required fields
- Support for:
  - Street address
  - Address type selection
  - Type-specific details
  - Private parking option
  - Default address setting
  - Additional notes
- RTL/LTR support
- Loading states
- Error handling

## Data Model

### Address Schema (`lib/db/models/address.ts`)

\`\`\`typescript
interface IAddress {
  userId: mongoose.Types.ObjectId
  country: string
  street: string
  addressType: 'apartment' | 'house' | 'private' | 'office' | 'hotel' | 'other'
  
  // Type-specific details
  apartmentDetails?: {
    floor: number
    apartmentNumber: string
    entrance?: string
  }
  houseDetails?: {
    doorName: string
    entrance?: string
  }
  officeDetails?: {
    buildingName?: string
    entrance?: string
    floor?: number
  }
  hotelDetails?: {
    hotelName: string
    roomNumber: string
  }
  otherDetails?: {
    instructions?: string
  }
  
  hasPrivateParking: boolean
  additionalNotes?: string
  isDefault: boolean
  
  createdAt: Date
  updatedAt: Date
}
\`\`\`

## Database Queries

### AddressQueries (`lib/db/queries/address-queries.ts`)

Provides the following operations:
- `getUserAddresses`: Get all addresses for a user
- `getDefaultAddress`: Get user's default address
- `createAddress`: Create new address
- `updateAddress`: Update existing address
- `deleteAddress`: Delete address
- `setDefaultAddress`: Set address as default

## Server Actions

### Address Actions (`actions/address-actions.ts`)

Implements server-side operations with:
- Authentication checks
- Data validation using Zod
- Error handling
- Path revalidation
- Logging

Available actions:
- `getUserAddresses`
- `createAddress`
- `updateAddress`
- `deleteAddress`
- `setDefaultAddress`

## Translations

The feature supports three languages:
- Hebrew (he.json)
- English (en.json)
- Russian (ru.json)

Translation keys are organized under the `addresses` namespace.

## State Management

The feature uses:
- React Query for server state management
- Local state for UI interactions
- Server actions for mutations

## Styling

The feature uses:
- Tailwind CSS for styling
- Shadcn UI components
- Responsive design (mobile-first)
- RTL/LTR support

## Error Handling

- Form validation using Zod
- Server-side error handling
- Client-side error feedback using toast notifications
- Loading states for all operations

## Security

- Authentication required for all operations
- User can only access their own addresses
- Input validation and sanitization
- Server-side validation

## Performance

- Optimized database queries with indexes
- Client-side caching with React Query
- Efficient revalidation strategies
- Lazy loading of components

## Maintenance

### Adding New Address Types

1. Update the `IAddress` interface in `address.ts`
2. Add new type to the address schema
3. Update validation schemas in `address-actions.ts`
4. Add type-specific fields to `AddressForm`
5. Update `AddressCard` display logic
6. Add translations for new type

### Modifying Address Fields

1. Update the `IAddress` interface
2. Modify the Mongoose schema
3. Update validation schemas
4. Update form components
5. Update translations

### Adding New Features

1. Create necessary database queries
2. Implement server actions
3. Update UI components
4. Add translations
5. Update documentation

## Testing

Key areas to test:
- Form validation
- Address type switching
- Default address handling
- RTL/LTR layout
- Error scenarios
- Loading states
- Responsive design
- Translations

## Dependencies

- Next.js
- React Query
- Mongoose
- Zod
- Shadcn UI
- Tailwind CSS
