# Technical Guide: Booking Lifecycle System

## System Overview

The booking lifecycle system is a distributed, event-driven architecture built on Next.js 14 with MongoDB Atlas, handling 10,000+ monthly bookings with 99.9% uptime.

## Architecture Deep Dive

### Core Components
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Client App    │  │   Admin Panel   │  │  Professional   │
│    (React)      │  │    (React)      │  │    Dashboard    │
└─────────┬───────┘  └─────────┬───────┘  └─────────┬───────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
┌─────────────────────────────┐│
│        Next.js API          ││
│     (API Routes + RSC)      ││
└─────────────────────────────┘│
                               │
┌─────────────────────────────┐│
│      Service Layer          ││
│  - BookingService          ││
│  - NotificationService     ││
│  - ProfessionalMatching    ││
│  - AutoReviewService       ││
└─────────────────────────────┘│
                               │
┌─────────────────────────────┐│
│     Event System            ││
│  - BookingEventBus         ││
│  - EventHandlers           ││
│  - BackgroundWorkers       ││
└─────────────────────────────┘│
                               │
┌─────────────────────────────┐│
│    Data Layer               ││
│  - MongoDB Atlas           ││
│  - Redis Cache             ││
│  - File Storage            ││
└─────────────────────────────┘│
                               │
┌─────────────────────────────┐│
│   External Services         ││
│  - SMS Provider            ││
│  - Email Service           ││
│  - Payment Gateway         ││
└─────────────────────────────┘
```

## Database Schema

### Booking Collection
```javascript
{
  _id: ObjectId("..."),
  bookingNumber: "MASU-2024-001234",
  userId: ObjectId("..."),
  professionalId: ObjectId("..."),
  treatmentId: ObjectId("..."),
  
  // Status Management
  status: "pending_professional", // enum
  statusHistory: [
    { status: "pending_professional", timestamp: Date, triggeredBy: "system" }
  ],
  
  // Timing
  bookingDateTime: Date,
  createdAt: Date,
  confirmedAt: Date,
  treatmentCompletedAt: Date,
  
  // Professional Matching
  suitableProfessionals: [
    {
      professionalId: ObjectId("..."),
      matchScore: 0.85,
      notifiedAt: Date,
      responseStatus: "pending", // pending, accepted, declined, expired
      responseAt: Date
    }
  ],
  
  // Pricing
  priceDetails: {
    basePrice: 200,
    finalAmount: 180,
    totalProfessionalPayment: 150,
    companyFee: 30,
    discount: 20
  },
  
  // Review System
  reviewRequestSentAt: Date,
  firstReminderSentAt: Date,
  secondReminderSentAt: Date,
  finalReminderSentAt: Date,
  
  // Indexes
  indexes: [
    { "status": 1, "bookingDateTime": 1 },
    { "userId": 1, "createdAt": -1 },
    { "professionalId": 1, "status": 1 },
    { "bookingNumber": 1 },
    { "suitableProfessionals.professionalId": 1 }
  ]
}
```

## Performance Optimization

### Database Indexing Strategy
```javascript
// Compound indexes for common queries
db.bookings.createIndex({ "status": 1, "bookingDateTime": 1 })
db.bookings.createIndex({ "userId": 1, "createdAt": -1 })
db.bookings.createIndex({ "professionalId": 1, "status": 1 })
db.bookings.createIndex({ "bookingNumber": 1 })

// Partial index for pending bookings
db.bookings.createIndex(
  { "createdAt": 1 },
  { 
    partialFilterExpression: { 
      "status": { $in: ["pending_professional", "confirmed"] } 
    }
  }
)
```

### Caching Strategy
```typescript
// Redis caching for hot data
const cacheKeys = {
  activeBookings: (userId: string) => `user:${userId}:active-bookings`,
  professionalAvailability: (professionalId: string) => 
    `professional:${professionalId}:availability`,
  treatmentPricing: (treatmentId: string) => `treatment:${treatmentId}:pricing`
}

// Cache TTL settings
const cacheTTL = {
  activeBookings: 300,        // 5 minutes
  professionalAvailability: 60, // 1 minute
  treatmentPricing: 3600      // 1 hour
}
```

## Event System Implementation

### Event Bus
```typescript
// lib/events/booking-event-system.ts
export class BookingEventBus {
  private static instance: BookingEventBus
  private handlers: Map<string, Function[]> = new Map()
  
  static getInstance(): BookingEventBus {
    if (!BookingEventBus.instance) {
      BookingEventBus.instance = new BookingEventBus()
    }
    return BookingEventBus.instance
  }
  
  async emit(event: BookingEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || []
    
    // Process handlers in parallel
    await Promise.allSettled(
      handlers.map(handler => handler(event))
    )
    
    // Log event for monitoring
    await this.logEvent(event)
  }
  
  subscribe(eventType: string, handler: Function): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push(handler)
  }
}
```

### Background Workers
```typescript
// lib/workers/booking-workers.ts
export class BookingBackgroundWorkers {
  
  // Process expired professional responses
  static async processExpiredResponses(): Promise<void> {
    const expiredResponses = await ProfessionalResponse.find({
      status: "pending",
      sentAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) } // 15 minutes ago
    })
    
    for (const response of expiredResponses) {
      await this.handleExpiredResponse(response)
    }
  }
  
  // Send review reminders
  static async sendReviewReminders(): Promise<void> {
    const bookingsNeedingReminders = await Booking.find({
      status: "pending_review",
      reviewRequestSentAt: { $exists: true },
      $or: [
        { 
          firstReminderSentAt: { $exists: false },
          reviewRequestSentAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        {
          secondReminderSentAt: { $exists: false },
          firstReminderSentAt: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
        }
      ]
    })
    
    for (const booking of bookingsNeedingReminders) {
      await AutomaticReviewService.sendReminder(booking._id.toString())
    }
  }
}
```

## Monitoring & Observability

### Metrics Collection
```typescript
// lib/monitoring/booking-metrics.ts
export class BookingMetrics {
  static async trackBookingCreated(bookingId: string): Promise<void> {
    await Promise.all([
      metrics.increment("booking.created"),
      metrics.timing("booking.creation_time", Date.now()),
      this.trackGeographicDistribution(bookingId)
    ])
  }
  
  static async trackProfessionalMatchingTime(
    bookingId: string, 
    duration: number
  ): Promise<void> {
    await metrics.timing("professional.matching_time", duration)
    
    if (duration > 30000) { // 30 seconds
      await this.alertSlowMatching(bookingId)
    }
  }
  
  static async trackBookingCompletion(bookingId: string): Promise<void> {
    const booking = await Booking.findById(bookingId)
    if (booking) {
      const completionTime = booking.treatmentCompletedAt.getTime() - 
                            booking.bookingDateTime.getTime()
      await metrics.timing("booking.completion_time", completionTime)
    }
  }
}
```

### Health Checks
```typescript
// lib/monitoring/health-checks.ts
export class HealthChecks {
  static async checkBookingSystem(): Promise<HealthCheckResult> {
    const checks = await Promise.allSettled([
      this.checkDatabaseConnection(),
      this.checkRedisConnection(),
      this.checkExternalServices(),
      this.checkActiveBookings(),
      this.checkProfessionalResponseTimes()
    ])
    
    return {
      status: checks.every(check => check.status === "fulfilled") ? "healthy" : "unhealthy",
      details: checks.map(check => 
        check.status === "fulfilled" ? check.value : check.reason
      )
    }
  }
}
```

## Security Implementation

### Authentication & Authorization
```typescript
// lib/auth/booking-auth.ts
export class BookingAuth {
  static async authorizeBookingAccess(
    userId: string, 
    bookingId: string
  ): Promise<boolean> {
    const booking = await Booking.findById(bookingId)
    
    if (!booking) return false
    
    // User can access their own bookings
    if (booking.userId.toString() === userId) return true
    
    // Professional can access assigned bookings
    if (booking.professionalId?.toString() === userId) return true
    
    // Admin can access all bookings
    const userRole = await this.getUserRole(userId)
    if (userRole === "admin") return true
    
    return false
  }
  
  static async rateLimitBookingCreation(userId: string): Promise<boolean> {
    const recentBookings = await Booking.countDocuments({
      userId,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    })
    
    return recentBookings < 5 // Max 5 bookings per hour
  }
}
```

### Data Validation
```typescript
// lib/validation/booking-validation.ts
export const bookingValidationSchema = z.object({
  treatmentId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  bookingDateTime: z.date()
    .min(new Date(Date.now() + 2 * 60 * 60 * 1000)) // Min 2 hours from now
    .max(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // Max 30 days
  recipientName: z.string().min(2).max(50),
  recipientPhone: z.string().regex(/^(\+972|0)[0-9]{9}$/),
  address: z.object({
    street: z.string().min(5).max(100),
    city: z.string().min(2).max(50),
    building: z.string().optional(),
    apartment: z.string().optional()
  })
})
```

## Error Handling & Recovery

### Retry Logic
```typescript
// lib/utils/retry-logic.ts
export class RetryLogic {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (i === maxRetries) break
        
        // Exponential backoff
        await this.delay(backoffMs * Math.pow(2, i))
      }
    }
    
    throw lastError
  }
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### Circuit Breaker
```typescript
// lib/resilience/circuit-breaker.ts
export class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED"
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "HALF_OPEN"
      } else {
        throw new Error("Circuit breaker is OPEN")
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
}
```

## Performance Tuning

### Database Optimization
```typescript
// Aggregation pipeline optimization
const getBookingStats = async (userId: string) => {
  return await Booking.aggregate([
    { $match: { userId: new ObjectId(userId) } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$priceDetails.finalAmount" }
      }
    },
    { $sort: { count: -1 } }
  ])
}

// Use projections to limit data transfer
const getBookingsList = async (userId: string) => {
  return await Booking.find(
    { userId },
    {
      bookingNumber: 1,
      status: 1,
      bookingDateTime: 1,
      treatmentId: 1,
      priceDetails: 1
    }
  ).sort({ createdAt: -1 }).limit(20)
}
```

### Memory Management
```typescript
// Streaming large datasets
const processLargeBookingReport = async () => {
  const cursor = Booking.find({
    createdAt: { $gte: new Date("2024-01-01") }
  }).cursor()
  
  for (let booking = await cursor.next(); booking != null; booking = await cursor.next()) {
    await processBooking(booking)
  }
}
```

## Deployment & Infrastructure

### Docker Configuration
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb+srv://prod-cluster/masu
REDIS_URL=redis://redis-cluster:6379

# External Services
SMS_API_KEY=xxxxx
EMAIL_API_KEY=xxxxx
PAYMENT_GATEWAY_KEY=xxxxx

# Feature Flags
ENABLE_PROFESSIONAL_MATCHING=true
ENABLE_AUTOMATIC_REVIEWS=true
MAX_PROFESSIONAL_RESPONSES=5
PROFESSIONAL_RESPONSE_TIMEOUT_MINUTES=15

# Monitoring
SENTRY_DSN=https://xxxxx
DATADOG_API_KEY=xxxxx
```

## Troubleshooting Guide

### Common Issues

**Professional Matching Failures**
```bash
# Check professional availability
db.professionals.find({ 
  isActive: true, 
  "workingHours.isAvailable": true 
}).count()

# Check matching algorithm logs
grep "professional-matching" /var/log/app.log | tail -100
```

**Notification Delivery Issues**
```bash
# Check SMS service status
curl -X GET "https://api.sms-provider.com/status" \
  -H "Authorization: Bearer $SMS_API_KEY"

# Check email queue
redis-cli LLEN email_queue
```

**Database Performance Issues**
```bash
# Check slow queries
db.runCommand({
  profile: 2,
  slowms: 100
})

# Analyze query performance
db.bookings.find({ status: "pending_professional" }).explain("executionStats")
```

---

## Maintenance Procedures

### Regular Tasks
- **Daily**: Check error logs and performance metrics
- **Weekly**: Review professional response times and booking success rates
- **Monthly**: Analyze booking patterns and optimize matching algorithm
- **Quarterly**: Review database indexes and query performance

### Emergency Procedures
- **High Error Rate**: Enable circuit breakers and fallback mechanisms
- **Database Issues**: Switch to read-only mode and use cached data
- **External Service Outage**: Queue requests and process when service recovers

---

For detailed system logs and metrics, access the monitoring dashboard at `/admin/system-health`. 