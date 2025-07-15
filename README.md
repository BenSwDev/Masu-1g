# Masu - Professional Services Booking Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.17.0-green)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC)](https://tailwindcss.com/)

A comprehensive booking platform for professional services, built with Next.js 15, TypeScript, and MongoDB. Supports multiple user roles, real-time notifications, payment processing, and multi-language support.

## 🌟 Features

### Core Functionality
- **Multi-role User System**: Member, Professional, Partner, Admin, and Guest roles
- **Advanced Booking System**: Real-time availability, professional matching, and scheduling
- **Payment Processing**: Multiple payment methods with secure transactions
- **Notification System**: SMS and email notifications with smart delivery
- **Multi-language Support**: Hebrew, English, and Russian localization
- **Guest Booking**: Allow users to book without registration

### User Experience
- **Responsive Design**: Mobile-first approach with touch-friendly interfaces
- **Real-time Updates**: Live booking status and professional location tracking
- **Smart Notifications**: Context-aware messaging based on user preferences
- **Accessibility**: WCAG compliant with keyboard navigation and screen reader support

### Business Features
- **Professional Management**: Profile management, availability settings, and earnings tracking
- **Subscription System**: Recurring service packages with flexible pricing
- **Gift Vouchers**: Digital gift certificates with redemption tracking
- **Review System**: Customer feedback and rating management
- **Analytics Dashboard**: Comprehensive business insights and reporting

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB 6.0+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd masu-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your environment variables:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/masu
   
   # Authentication
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   
   # Payment Processing
   CARDCOM_TERMINAL_NUMBER=your-terminal-number
   CARDCOM_USERNAME=your-username
   CARDCOM_PASSWORD=your-password
   
   # Notifications
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   RESEND_API_KEY=your-resend-key
   
   # Email
   EMAIL_FROM=noreply@yourdomain.com
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB (if using local instance)
   mongod
   
   # Run database initialization
   npm run db:init
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Open Application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
masu-app/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   └── (main)/           # Main application routes
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── auth/             # Authentication components
│   ├── booking/          # Booking-related components
│   └── dashboard/        # Dashboard components
├── actions/              # Server actions
├── lib/                  # Utility libraries
│   ├── auth/             # Authentication utilities
│   ├── db/               # Database models and utilities
│   ├── utils/            # General utilities
│   └── notifications/    # Notification services
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── styles/               # Global styles
```

## 🔧 Configuration

### Database Configuration

The application uses MongoDB with Mongoose ODM. Configure your database connection in `lib/db/mongoose.ts`:

```typescript
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default dbConnect
```

### Authentication Configuration

NextAuth.js is configured in `lib/auth/auth.ts` with phone-based authentication and OTP support:

```typescript
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      // Phone-based authentication
    }),
    CredentialsProvider({
      id: "otp",
      // OTP authentication
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // ... additional configuration
}
```

### Notification Configuration

Configure notification services in `lib/notifications/`:

```typescript
// SMS notifications via Twilio
const twilioClient = new twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

// Email notifications via Resend
const resend = new Resend(process.env.RESEND_API_KEY)
```

## 🎯 Usage Examples

### Creating a Booking

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

const result = await registerUser(formData)
if (result.success) {
  console.log("User registered successfully")
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

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Testing Utilities

The application includes testing utilities for common scenarios:

```typescript
import { renderWithProviders } from "@/test-utils/render-with-providers"
import { mockUser } from "@/test-utils/mocks"

test("user can create booking", async () => {
  const { user } = renderWithProviders(<BookingForm />, {
    preloadedState: {
      auth: { user: mockUser }
    }
  })
  
  // Test implementation
})
```

## 📚 Documentation

- **[API Documentation](./API_DOCUMENTATION.md)** - Comprehensive API reference
- **[Component Library](./COMPONENT_LIBRARY_DOCUMENTATION.md)** - UI component documentation
- **[Database Schema](./docs/database-schema.md)** - Database models and relationships
- **[Deployment Guide](./docs/deployment.md)** - Production deployment instructions

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Variables

Ensure all required environment variables are set in production:

```env
# Required for production
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://yourdomain.com
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow the existing code style
- Ensure accessibility compliance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- 📧 Email: support@masu.com
- 📖 Documentation: [docs.masu.com](https://docs.masu.com)
- 🐛 Issues: [GitHub Issues](https://github.com/masu-app/issues)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Radix UI](https://www.radix-ui.com/) - Accessible UI primitives
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [MongoDB](https://www.mongodb.com/) - NoSQL database
- [NextAuth.js](https://next-auth.js.org/) - Authentication for Next.js

---

**Built with ❤️ by the Masu Team**