# Masu Application - Comprehensive API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Server Actions](#server-actions)
4. [API Routes](#api-routes)
5. [Database Models](#database-models)
6. [Custom Hooks](#custom-hooks)
7. [Utility Functions](#utility-functions)
8. [UI Components](#ui-components)
9. [Configuration](#configuration)

## Overview

Masu is a Next.js 15 application built with TypeScript, featuring a comprehensive booking system for professional services. The application supports multiple user roles (member, professional, partner, admin, guest), real-time notifications, payment processing, and multi-language support.

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with JWT
- **UI**: Tailwind CSS with Radix UI components
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form with Zod validation
- **Notifications**: Custom notification service with SMS/Email support

## Authentication & Authorization

### Auth Configuration (`lib/auth/auth.ts`)

#### `authOptions: NextAuthOptions`
Main NextAuth configuration object with credentials provider and MongoDB adapter.

**Features:**
- Phone-based authentication
- OTP support
- Role-based access control
- JWT session management (30 days)
- Custom user preferences

**Usage:**
```typescript
import { authOptions } from "@/lib/auth/auth"
```

#### `hashPassword(password: string): Promise<string>`
Hashes a password using bcrypt with salt rounds of 8.

**Parameters:**
- `password`: Plain text password

**Returns:** Hashed password string

**Example:**
```typescript
import { hashPassword } from "@/lib/auth/auth"
const hashedPassword = await hashPassword("myPassword123")
```

#### `verifyPassword(password: string, hashedPassword: string): Promise<boolean>`
Verifies a password against its hash.

**Parameters:**
- `password`: Plain text password to verify
- `hashedPassword`: Stored hash to compare against

**Returns:** Boolean indicating if password matches

**Example:**
```typescript
import { verifyPassword } from "@/lib/auth/auth"
const isValid = await verifyPassword("myPassword123", storedHash)
```

#### `validatePassword(password: string): { isValid: boolean; errors: string[] }`
Validates password strength requirements.

**Requirements:**
- Minimum 8 characters
- At least 3 out of 4 character types: uppercase, lowercase, numbers, special characters

**Returns:** Object with validation result and error messages

**Example:**
```typescript
import { validatePassword } from "@/lib/auth/auth"
const validation = validatePassword("MyPass123!")
if (!validation.isValid) {
  console.log(validation.errors)
}
```

#### `validateEmail(email: string): boolean`
Validates email format using regex.

**Returns:** Boolean indicating valid email format

#### `validatePhone(phone: string): boolean`
Validates phone number format (international format required).

**Returns:** Boolean indicating valid phone format

#### `hasRole(roles: string[] | undefined, role: string): boolean`
Checks if user has a specific role.

**Parameters:**
- `roles`: Array of user roles
- `role`: Role to check for

**Returns:** Boolean indicating if user has the role

## Server Actions

### Authentication Actions (`actions/auth-actions.ts`)

#### `registerUser(formData: FormData)`
Registers a new user with comprehensive validation.

**Parameters:**
- `formData`: FormData containing user registration information

**Form Fields:**
- `fullName`: User's full name (required)
- `email`: Email address (optional)
- `phone`: Phone number (required)
- `password`: Password (required)
- `gender`: Gender selection (required)
- `role`: User role (member/professional)
- `day`, `month`, `year`: Date of birth components

**Returns:**
```typescript
{
  success: boolean
  message: "userRegistered" | "userUpgraded" | "phoneExists" | "invalidEmail" | "invalidPhone" | "weakPassword" | "missingFields" | "invalidDateOfBirth" | "registrationFailed"
  errors?: string[] // Password validation errors
}
```

**Example:**
```typescript
import { registerUser } from "@/actions/auth-actions"

const formData = new FormData()
formData.append("fullName", "John Doe")
formData.append("phone", "+972501234567")
formData.append("password", "SecurePass123!")
formData.append("gender", "male")

const result = await registerUser(formData)
if (result.success) {
  console.log("User registered successfully")
}
```

#### `checkUserExists(phone: string)`
Checks if a user exists by phone number.

**Parameters:**
- `phone`: Phone number to check

**Returns:**
```typescript
{
  exists: boolean
}
```

#### `findOrCreateUserByPhone(phone: string, guestInfo?: GuestInfo)`
Finds existing user or creates a guest user by phone number.

**Parameters:**
- `phone`: Phone number
- `guestInfo`: Optional guest information for new users

**GuestInfo Interface:**
```typescript
{
  name: string
  email?: string
  gender?: "male" | "female"
  dateOfBirth?: Date
}
```

**Returns:**
```typescript
{
  success: boolean
  userId?: string
  isNewUser?: boolean
  userType?: "guest" | "registered"
  error?: string
}
```

### Booking Actions (`actions/booking-actions.ts`)

#### `getAvailableTimeSlots(dateString: string, treatmentId: string, selectedDurationId?: string)`
Retrieves available time slots for a specific treatment and date.

**Parameters:**
- `dateString`: Date in YYYY-MM-DD format
- `treatmentId`: Treatment ID
- `selectedDurationId`: Optional duration ID for duration-based treatments

**Returns:**
```typescript
{
  success: boolean
  timeSlots?: TimeSlot[]
  error?: string
  workingHoursNote?: string
}
```

**Example:**
```typescript
import { getAvailableTimeSlots } from "@/actions/booking-actions"

const result = await getAvailableTimeSlots("2024-01-15", "treatment123", "duration456")
if (result.success) {
  console.log("Available slots:", result.timeSlots)
}
```

#### `calculateBookingPrice(payload: unknown)`
Calculates booking price with all applicable discounts and fees.

**Parameters:**
- `payload`: Booking calculation payload (validated with Zod schema)

**Returns:**
```typescript
{
  success: boolean
  priceDetails?: ClientCalculatedPriceDetails
  error?: string
  issues?: z.ZodIssue[]
}
```

#### `createBooking(payload: unknown)`
Creates a new booking with comprehensive validation and processing.

**Parameters:**
- `payload`: Booking creation payload (validated with Zod schema)

**Returns:**
```typescript
{
  success: boolean
  booking?: IBooking
  error?: string
  issues?: z.ZodIssue[]
}
```

#### `getUserBookings(userId: string, filters: BookingFilters)`
Retrieves user bookings with filtering and pagination.

**Parameters:**
- `userId`: User ID
- `filters`: Filtering options

**BookingFilters Interface:**
```typescript
{
  status?: string
  treatment?: string
  dateRange?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortDirection?: "asc" | "desc"
}
```

**Returns:**
```typescript
{
  bookings: PopulatedBooking[]
  totalPages: number
  totalBookings: number
}
```

#### `cancelBooking(bookingId: string, userId: string, cancelledByRole: "user" | "admin", reason?: string)`
Cancels a booking and handles refunds.

**Parameters:**
- `bookingId`: Booking ID to cancel
- `userId`: User ID requesting cancellation
- `cancelledByRole`: Role of person cancelling
- `reason`: Optional cancellation reason

**Returns:**
```typescript
{
  success: boolean
  error?: string
}
```

#### `professionalAcceptBooking(bookingId: string)`
Allows professionals to accept a booking assignment.

**Returns:**
```typescript
{
  success: boolean
  error?: string
  booking?: IBooking
}
```

#### `professionalMarkEnRoute(bookingId: string)`
Marks booking as professional en route.

#### `professionalMarkCompleted(bookingId: string)`
Marks booking as completed.

#### `getBookingById(bookingId: string)`
Retrieves a specific booking by ID.

**Returns:**
```typescript
{
  success: boolean
  booking?: PopulatedBooking
  error?: string
}
```

#### `getAllBookings(filters: AdminBookingFilters)`
Admin function to retrieve all bookings with filtering.

**AdminBookingFilters Interface:**
```typescript
{
  status?: string
  professional?: string
  treatment?: string
  dateRange?: string
  priceRange?: string
  address?: string
  page?: number
  limit?: number
  sortBy?: string
  sortDirection?: "asc" | "desc"
  search?: string
}
```

#### `createGuestBooking(payload: unknown)`
Creates a booking for guest users without registration.

**Returns:**
```typescript
{
  success: boolean
  booking?: IBooking
  error?: string
  issues?: z.ZodIssue[]
}
```

### User Subscription Actions (`actions/user-subscription-actions.ts`)

#### `getUserSubscriptions(userId: string)`
Retrieves user's active subscriptions.

#### `purchaseSubscription(userId: string, subscriptionId: string, paymentMethodId: string)`
Purchases a subscription for a user.

#### `cancelSubscription(userId: string, subscriptionId: string)`
Cancels an active subscription.

### Gift Voucher Actions (`actions/gift-voucher-actions.ts`)

#### `createGiftVoucher(payload: GiftVoucherPayload)`
Creates a new gift voucher.

#### `redeemGiftVoucher(code: string, userId: string)`
Redeems a gift voucher code.

#### `getGiftVoucherBalance(userId: string)`
Gets user's gift voucher balance.

### Review Actions (`actions/review-actions.ts`)

#### `createReview(payload: ReviewPayload)`
Creates a new review for a booking.

#### `getUserReviews(userId: string)`
Retrieves user's reviews.

#### `getProfessionalReviews(professionalId: string)`
Retrieves reviews for a specific professional.

### Payment Method Actions (`actions/payment-method-actions.ts`)

#### `addPaymentMethod(userId: string, paymentData: PaymentMethodData)`
Adds a new payment method for a user.

#### `getActivePaymentMethods(userId: string)`
Retrieves user's active payment methods.

#### `deletePaymentMethod(userId: string, paymentMethodId: string)`
Deletes a payment method.

## API Routes

### Authentication Routes

#### `POST /api/auth/[...nextauth]`
NextAuth.js authentication endpoints.

**Available endpoints:**
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session
- `POST /api/auth/csrf` - Get CSRF token

#### `POST /api/auth/send-otp`
Sends OTP to user's phone number.

**Request Body:**
```typescript
{
  phone: string
}
```

**Response:**
```typescript
{
  success: boolean
  message?: string
  error?: string
}
```

#### `POST /api/auth/verify-otp`
Verifies OTP and authenticates user.

**Request Body:**
```typescript
{
  phone: string
  otp: string
}
```

**Response:**
```typescript
{
  success: boolean
  user?: User
  error?: string
}
```

### Booking Routes

#### `GET /api/bookings`
Retrieves bookings with filtering (admin only).

#### `POST /api/bookings`
Creates a new booking.

#### `GET /api/bookings/[id]`
Retrieves a specific booking.

#### `PUT /api/bookings/[id]`
Updates a booking (admin only).

#### `DELETE /api/bookings/[id]`
Cancels a booking.

### User Routes

#### `GET /api/user/profile`
Retrieves current user profile.

#### `PUT /api/user/profile`
Updates user profile.

#### `GET /api/user/bookings`
Retrieves user's bookings.

### Professional Routes

#### `GET /api/professional/bookings`
Retrieves professional's assigned bookings.

#### `PUT /api/professional/bookings/[id]/accept`
Accepts a booking assignment.

#### `PUT /api/professional/bookings/[id]/en-route`
Marks booking as en route.

#### `PUT /api/professional/bookings/[id]/completed`
Marks booking as completed.

### Payment Routes

#### `POST /api/payments/process`
Processes a payment.

#### `POST /api/payments/refund`
Processes a refund.

### Admin Routes

#### `GET /api/admin/users`
Retrieves all users (admin only).

#### `GET /api/admin/bookings`
Retrieves all bookings (admin only).

#### `GET /api/admin/analytics`
Retrieves analytics data (admin only).

## Database Models

### User Model (`lib/db/models/user.ts`)

**Schema Fields:**
```typescript
{
  name: string (required)
  email?: string (optional)
  phone: string (required, unique)
  password?: string (optional, hashed)
  gender?: "male" | "female"
  dateOfBirth?: Date
  image?: string
  roles: string[] (default: ["member"])
  activeRole?: string
  treatmentPreferences?: {
    therapistGender: "male" | "female" | "any"
  }
  notificationPreferences?: {
    methods: ("email" | "sms")[]
    language: "he" | "en" | "ru"
  }
  emailVerified?: Date
  phoneVerified?: Date
  isActive?: boolean
  createdAt: Date
  updatedAt: Date
}
```

**User Roles:**
- `member`: Regular user
- `professional`: Service provider
- `partner`: Business partner
- `admin`: Administrator
- `guest`: Unregistered user

### Booking Model (`lib/db/models/booking.ts`)

**Schema Fields:**
```typescript
{
  bookingNumber: string (unique)
  userId: ObjectId (ref: User)
  professionalId?: ObjectId (ref: User)
  treatmentId: ObjectId (ref: Treatment)
  bookingDateTime: Date
  durationMinutes: number
  status: BookingStatus
  priceDetails: IPriceDetails
  address: IBookingAddressSnapshot
  consents: IBookingConsents
  paymentDetails: IEnhancedPaymentDetails
  review?: IBookingReview
  professionalShare?: IProfessionalShare
  createdAt: Date
  updatedAt: Date
}
```

**Booking Statuses:**
- `pending`: Awaiting professional assignment
- `assigned`: Professional assigned
- `confirmed`: Professional confirmed
- `en_route`: Professional en route
- `in_progress`: Service in progress
- `completed`: Service completed
- `cancelled`: Booking cancelled
- `no_show`: Customer no-show

### Treatment Model (`lib/db/models/treatment.ts`)

**Schema Fields:**
```typescript
{
  name: string
  description?: string
  category: string
  pricingType: "fixed" | "duration_based"
  basePrice: number
  defaultDurationMinutes?: number
  durations?: IDuration[]
  isActive: boolean
  imageUrl?: string
  createdAt: Date
  updatedAt: Date
}
```

### Address Model (`lib/db/models/address.ts`)

**Schema Fields:**
```typescript
{
  userId: ObjectId (ref: User)
  type: "home" | "work" | "other"
  street: string
  houseNumber: string
  apartment?: string
  city: string
  postalCode: string
  country: string
  isDefault: boolean
  coordinates?: {
    lat: number
    lng: number
  }
  createdAt: Date
  updatedAt: Date
}
```

## Custom Hooks

### `useCachedUser()` (`hooks/use-cached-user.ts`)

Manages cached user profile data for performance optimization.

**Returns:**
```typescript
{
  cachedProfile: CachedUserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  status: "loading" | "authenticated" | "unauthenticated"
}
```

**CachedUserProfile Interface:**
```typescript
{
  id: string
  name: string | null | undefined
  email: string | null | undefined
  image: string | null | undefined
  roles: string[]
  activeRole: string
  lastUpdated: number
}
```

**Example:**
```typescript
import { useCachedUser } from "@/hooks/use-cached-user"

function MyComponent() {
  const { cachedProfile, isLoading, isAuthenticated } = useCachedUser()
  
  if (isLoading) return <div>Loading...</div>
  if (!isAuthenticated) return <div>Please log in</div>
  
  return <div>Welcome, {cachedProfile?.name}</div>
}
```

### `useCachedPreferences()` (`hooks/use-cached-preferences.ts`)

Manages cached user preferences for treatment and notifications.

**Returns:**
```typescript
{
  treatmentPreferences: ITreatmentPreferences | null
  notificationPreferences: INotificationPreferences | null
  isLoading: boolean
  updatePreferences: (type: "treatment" | "notification", data: any) => Promise<void>
}
```

### `useDebounce<T>(value: T, delay: number): T` (`hooks/use-debounce.ts`)

Debounces a value to prevent excessive API calls.

**Parameters:**
- `value`: Value to debounce
- `delay`: Delay in milliseconds

**Returns:** Debounced value

**Example:**
```typescript
import { useDebounce } from "@/hooks/use-debounce"

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  
  useEffect(() => {
    if (debouncedSearchTerm) {
      // Perform search
    }
  }, [debouncedSearchTerm])
  
  return <input onChange={(e) => setSearchTerm(e.target.value)} />
}
```

### `useMobile()` (`hooks/use-mobile.tsx`)

Detects if the current device is mobile.

**Returns:** Boolean indicating mobile device

### `usePaymentModal()` (`hooks/use-payment-modal.ts`)

Manages payment modal state and operations.

**Returns:**
```typescript
{
  isOpen: boolean
  openModal: () => void
  closeModal: () => void
  selectedPaymentMethod: PaymentMethod | null
  setSelectedPaymentMethod: (method: PaymentMethod | null) => void
}
```

## Utility Functions

### General Utils (`lib/utils/utils.ts`)

#### `cn(...inputs: ClassValue[]): string`
Combines class names with Tailwind CSS conflict resolution.

**Example:**
```typescript
import { cn } from "@/lib/utils/utils"

const className = cn("text-red-500", "bg-blue-500", "hover:bg-blue-600")
```

#### `formatDate(date: Date | string, language = "en-US"): string`
Formats a date into a localized string.

**Parameters:**
- `date`: Date to format
- `language`: Language code for localization

**Example:**
```typescript
import { formatDate } from "@/lib/utils/utils"

const formatted = formatDate(new Date(), "he-IL") // "15 בינו׳ 2024"
```

#### `formatCurrency(amount: number | undefined | null, currency = "ILS", language = "en-US"): string`
Formats a number into a localized currency string.

**Parameters:**
- `amount`: Amount to format
- `currency`: Currency code (ILS, USD, EUR)
- `language`: Language code for localization

**Example:**
```typescript
import { formatCurrency } from "@/lib/utils/utils"

const formatted = formatCurrency(100, "ILS", "he-IL") // "₪100.00"
```

#### `formatDateIsraeli(date: Date | string): string`
Formats date in Israeli format (DD/MM/YYYY).

#### `formatTimeIsraeli(date: Date | string): string`
Formats time in Israeli format (HH:MM).

#### `formatDateTimeIsraeli(date: Date | string): string`
Formats date and time in Israeli format.

### Phone Utils (`lib/utils/phone-utils.ts`)

#### `normalizePhoneNumber(phone: string): string`
Normalizes phone number to international format.

#### `validatePhoneNumber(phone: string): boolean`
Validates phone number format.

#### `createPhoneVariations(phone: string): string[]`
Creates variations of a phone number for search purposes.

## UI Components

### Theme Provider (`components/theme-provider.tsx`)

Provides theme context for the application.

**Props:**
```typescript
{
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
}
```

**Example:**
```typescript
import { ThemeProvider } from "@/components/theme-provider"

<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
  {children}
</ThemeProvider>
```

### UI Components (`components/ui/`)

The application uses a comprehensive set of UI components built with Radix UI and styled with Tailwind CSS. All components are located in `components/ui/` and include:

#### Button (`components/ui/button.tsx`)
Versatile button component with multiple variants.

**Variants:**
- `default`: Primary button
- `destructive`: Danger button
- `outline`: Outlined button
- `secondary`: Secondary button
- `ghost`: Ghost button
- `link`: Link-style button

**Sizes:**
- `default`: Standard size
- `sm`: Small
- `lg`: Large
- `icon`: Icon-only

**Example:**
```typescript
import { Button } from "@/components/ui/button"

<Button variant="default" size="lg" onClick={handleClick}>
  Click Me
</Button>
```

#### Dialog (`components/ui/dialog.tsx`)
Modal dialog component.

**Example:**
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger>Open Dialog</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <p>Dialog content goes here</p>
  </DialogContent>
</Dialog>
```

#### Form (`components/ui/form.tsx`)
Form component with React Hook Form integration.

**Example:**
```typescript
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"

const form = useForm()

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

#### Table (`components/ui/table.tsx`)
Data table component with sorting and pagination.

#### Card (`components/ui/card.tsx`)
Card container component.

#### Input (`components/ui/input.tsx`)
Text input component.

#### Select (`components/ui/select.tsx`)
Select dropdown component.

#### Toast (`components/ui/toast.tsx`)
Toast notification component.

#### And many more...

All UI components follow consistent patterns and are fully typed with TypeScript.

## Configuration

### Next.js Configuration (`next.config.mjs`)

**Key Features:**
- Image optimization
- Internationalization (i18n)
- Environment variable handling
- Build optimization

### Tailwind Configuration (`tailwind.config.ts`)

**Features:**
- Custom color palette
- Dark mode support
- Animation utilities
- Custom spacing and typography

### TypeScript Configuration (`tsconfig.json`)

**Features:**
- Strict type checking
- Path mapping
- Modern JavaScript features
- React JSX support

### ESLint Configuration (`.eslintrc.json`)

**Features:**
- Next.js specific rules
- TypeScript support
- React hooks rules
- Import organization

## Usage Examples

### Creating a New Booking

```typescript
import { createBooking } from "@/actions/booking-actions"

const bookingData = {
  treatmentId: "treatment123",
  bookingDateTime: "2024-01-15T14:00:00.000Z",
  durationId: "duration456",
  address: {
    street: "Main Street",
    houseNumber: "123",
    city: "Tel Aviv",
    postalCode: "12345"
  },
  recipientName: "John Doe",
  recipientPhone: "+972501234567",
  paymentMethodId: "payment123"
}

const result = await createBooking(bookingData)
if (result.success) {
  console.log("Booking created:", result.booking)
} else {
  console.error("Booking failed:", result.error)
}
```

### User Registration

```typescript
import { registerUser } from "@/actions/auth-actions"

const formData = new FormData()
formData.append("fullName", "Jane Doe")
formData.append("email", "jane@example.com")
formData.append("phone", "+972501234567")
formData.append("password", "SecurePass123!")
formData.append("gender", "female")
formData.append("day", "15")
formData.append("month", "01")
formData.append("year", "1990")

const result = await registerUser(formData)
if (result.success) {
  console.log("User registered successfully")
} else {
  console.error("Registration failed:", result.message)
}
```

### Using Custom Hooks

```typescript
import { useCachedUser } from "@/hooks/use-cached-user"
import { useDebounce } from "@/hooks/use-debounce"

function UserProfile() {
  const { cachedProfile, isLoading } = useCachedUser()
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearch = useDebounce(searchTerm, 500)
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      <h1>Welcome, {cachedProfile?.name}</h1>
      <input 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />
    </div>
  )
}
```

### Working with UI Components

```typescript
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils/utils"

function BookingCard({ booking }) {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">{booking.treatment.name}</h3>
      <p className="text-gray-600">{formatDate(booking.bookingDateTime)}</p>
      <p className="text-lg font-bold">{formatCurrency(booking.priceDetails.total)}</p>
      
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">View Details</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          <div>
            <p>Status: {booking.status}</p>
            <p>Professional: {booking.professional?.name}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

## Error Handling

The application uses consistent error handling patterns:

### Server Actions
All server actions return objects with `success` boolean and optional `error` string:

```typescript
{
  success: boolean
  error?: string
  data?: any
}
```

### API Routes
API routes return JSON responses with consistent structure:

```typescript
{
  success: boolean
  data?: any
  error?: string
  message?: string
}
```

### Client-Side Error Handling
Use try-catch blocks and check success flags:

```typescript
try {
  const result = await someAction(data)
  if (result.success) {
    // Handle success
  } else {
    // Handle error
    console.error(result.error)
  }
} catch (error) {
  // Handle unexpected errors
  console.error("Unexpected error:", error)
}
```

## Best Practices

1. **Type Safety**: Always use TypeScript interfaces and types
2. **Validation**: Use Zod schemas for data validation
3. **Error Handling**: Implement comprehensive error handling
4. **Performance**: Use caching and debouncing where appropriate
5. **Security**: Validate all inputs and sanitize data
6. **Accessibility**: Follow WCAG guidelines in UI components
7. **Internationalization**: Support multiple languages
8. **Testing**: Write unit and integration tests

## Support

For technical support or questions about the API, please refer to:
- Code comments and JSDoc documentation
- TypeScript type definitions
- Error messages and logging
- Database schema documentation

---

*This documentation covers the main public APIs, functions, and components of the Masu application. For more detailed information about specific implementations, refer to the source code and inline documentation.*