# 🤖 CODEX AUTO-FIX AGENT INSTRUCTIONS

## 🎯 MISSION OBJECTIVE
Systematically fix ALL TypeScript errors, architectural violations, and code quality issues in the Next.js App Router project. Execute fixes in precise order with zero breaking changes.

## 📋 EXECUTION PRIORITY ORDER

### 🔴 PHASE 1: CRITICAL FOUNDATION (Execute First)
1. **Schema/Model Issues** (226 errors) - Fix all model inconsistencies
2. **Type Mismatches** (90 errors) - Resolve all type conflicts
3. **ObjectId/Unknown Issues** (44 errors) - Fix MongoDB type issues

### 🟡 PHASE 2: ARCHITECTURE & SAFETY (Execute Second)
1. **Service Layer Creation** - Create missing `/services` directory structure
2. **Undefined/Null Issues** (34 errors) - Add all safety checks
3. **Interface Issues** (7 errors) - Fix interface mismatches

### 🟢 PHASE 3: REFINEMENT (Execute Last)
1. **Code Duplication** - Consolidate repeated logic
2. **Translation Issues** (3 errors) - Fix i18n calls
3. **Property Missing** (1 error) - Add missing properties
4. **Other Issues** (192 errors) - Handle remaining edge cases

---

## 🛠️ DETAILED FIX PATTERNS

### 1. TYPE MISMATCH FIXES

#### Pattern: `string | undefined` to MongoDB Query
```typescript
// BEFORE (ERROR):
const userId = user.id; // string | undefined
await User.findById(userId); // Type error

// AFTER (FIXED):
const userId = user.id;
if (!userId) {
  return { success: false, error: "User ID required" };
}
await User.findById(userId);
```

#### Pattern: ObjectId Conversion
```typescript
// BEFORE (ERROR):
const id = someId; // unknown type
filterQuery.professionalId = new mongoose.Types.ObjectId(id);

// AFTER (FIXED):
const id = someId?.toString();
if (!id || !mongoose.Types.ObjectId.isValid(id)) {
  return { success: false, error: "Invalid ID format" };
}
filterQuery.professionalId = new mongoose.Types.ObjectId(id);
```

#### Pattern: Array Type Safety
```typescript
// BEFORE (ERROR):
const roles = user.roles; // unknown[]
if (roles.includes("admin")) { // Type error

// AFTER (FIXED):
const roles = user.roles as string[];
if (Array.isArray(roles) && roles.includes("admin")) {
```

### 2. SCHEMA/MODEL ISSUE FIXES

#### Pattern: Missing Interface Properties
```typescript
// BEFORE (ERROR):
interface IUser {
  name: string;
  email: string;
  // Missing properties causing errors
}

// AFTER (FIXED):
interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  roles: string[];
  activeRole?: string;
  treatmentPreferences?: ITreatmentPreferences;
  notificationPreferences?: INotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Pattern: Schema Field Consistency
```typescript
// BEFORE (ERROR):
const UserSchema = new Schema({
  name: String, // Inconsistent with interface
  email: { type: String, required: true }
});

// AFTER (FIXED):
const UserSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
}, {
  timestamps: true,
});
```

### 3. SERVICE LAYER CREATION

#### Pattern: Extract Database Logic to Services
```typescript
// CREATE: /services/user-service.ts
export class UserService {
  static async findById(id: string): Promise<IUser | null> {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    await dbConnect();
    return User.findById(id).lean();
  }

  static async updateUser(id: string, updates: Partial<IUser>): Promise<{ success: boolean; user?: IUser; error?: string }> {
    try {
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return { success: false, error: "Invalid user ID" };
      }
      
      await dbConnect();
      const user = await User.findByIdAndUpdate(id, updates, { new: true }).lean();
      
      if (!user) {
        return { success: false, error: "User not found" };
      }
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: "Failed to update user" };
    }
  }
}
```

#### Pattern: Refactor Actions to Use Services
```typescript
// BEFORE (ACTION WITH INLINE LOGIC):
export async function updateProfile(data: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, message: "notAuthenticated" };
  }
  
  await dbConnect();
  const user = await User.findByIdAndUpdate(session.user.id, data, { new: true });
  // ... complex logic
}

// AFTER (ACTION DELEGATING TO SERVICE):
export async function updateProfile(data: any) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, message: "notAuthenticated" };
  }
  
  return UserService.updateUser(session.user.id, data);
}
```

### 4. UNDEFINED/NULL SAFETY FIXES

#### Pattern: Optional Chaining and Guards
```typescript
// BEFORE (ERROR):
const name = user.name; // possibly undefined
console.log(name.length); // Runtime error

// AFTER (FIXED):
const name = user?.name;
if (!name) {
  return { success: false, error: "Name is required" };
}
console.log(name.length);
```

#### Pattern: Array Safety
```typescript
// BEFORE (ERROR):
user.roles.forEach(role => { // roles might be undefined

// AFTER (FIXED):
const roles = user?.roles || [];
roles.forEach(role => {
```

#### Pattern: Object Property Safety
```typescript
// BEFORE (ERROR):
const preferences = user.notificationPreferences.methods; // nested undefined

// AFTER (FIXED):
const preferences = user?.notificationPreferences?.methods || ["email"];
```

### 5. OBJECTID/UNKNOWN TYPE FIXES

#### Pattern: Type Assertion with Validation
```typescript
// BEFORE (ERROR):
const id = doc._id; // unknown
await Model.findById(id); // Type error

// AFTER (FIXED):
const id = doc._id?.toString();
if (!id || !mongoose.Types.ObjectId.isValid(id)) {
  throw new Error("Invalid document ID");
}
await Model.findById(id);
```

#### Pattern: Population Type Safety
```typescript
// BEFORE (ERROR):
const booking = await Booking.findById(id).populate('userId');
const userName = booking.userId.name; // Type unknown

// AFTER (FIXED):
const booking = await Booking.findById(id).populate('userId') as PopulatedBooking;
const userName = (booking.userId as IUser)?.name;
if (!userName) {
  throw new Error("User name not available");
}
```

### 6. TRANSLATION FIXES

#### Pattern: Correct i18n Function Calls
```typescript
// BEFORE (ERROR):
t("key", "fallback"); // Too many parameters

// AFTER (FIXED):
t("key") || "fallback";
```

---

## 🎯 SPECIFIC FILE FIXES

### Actions Directory Restructuring
```bash
# MOVE: Relocate actions to appropriate directories
/actions/account-actions.ts → /app/dashboard/account/actions.ts
/actions/booking-actions.ts → /app/bookings/actions.ts
/actions/notification-service.ts → /services/notification-service.ts
```

### Fix Critical Files:

#### 1. actions/unified-booking-actions.ts
```typescript
// REMOVE: "use client" directive (line 1)
// REPLACE WITH: "use server"
```

#### 2. Create Services Structure:
```
/services/
├── booking-service.ts
├── user-service.ts
├── notification-service.ts
├── payment-service.ts
├── gift-voucher-service.ts
├── subscription-service.ts
└── index.ts
```

#### 3. API Route Fixes:
```typescript
// BEFORE: Inline business logic in API routes
export async function GET(request: NextRequest) {
  // 50+ lines of business logic
}

// AFTER: Delegate to services
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.roles?.includes("admin")) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const filters = extractFiltersFromSearchParams(request.url);
  const result = await BookingService.getAllBookings(filters);
  
  return NextResponse.json(result);
}
```

---

## 🔒 SAFETY RULES

### ✅ MUST DO:
1. **Test after each fix** - Ensure no breaking changes
2. **Preserve existing functionality** - Don't change business logic
3. **Add proper error handling** - Every database operation must have try/catch
4. **Validate all inputs** - Check types, null/undefined before operations
5. **Use consistent patterns** - Follow established code style
6. **Add TypeScript strict checks** - Ensure type safety

### ❌ NEVER DO:
1. **Remove existing functionality** - Only fix types/structure
2. **Change database schemas** without migration plan
3. **Modify public API contracts** - Keep interfaces consistent
4. **Skip error handling** - Every fix must include proper error handling
5. **Ignore edge cases** - Handle all possible null/undefined scenarios

---

## 🚀 EXECUTION COMMANDS

### Phase 1: Foundation Fixes
```bash
# Fix all model interfaces first
# Fix type mismatches in critical paths
# Resolve ObjectId conversion issues
```

### Phase 2: Architecture Migration
```bash
# Create services directory
# Move notification-service from actions to services
# Extract database logic from API routes
# Add comprehensive error handling
```

### Phase 3: Final Cleanup
```bash
# Consolidate duplicated code
# Fix remaining translation issues
# Handle edge case errors
# Optimize type definitions
```

---

## 📊 SUCCESS CRITERIA

- ✅ Zero TypeScript compilation errors
- ✅ All services properly abstracted
- ✅ No direct database calls in actions/API routes
- ✅ Comprehensive error handling everywhere
- ✅ Type safety for all ObjectId operations
- ✅ Proper null/undefined checking
- ✅ Consistent code structure
- ✅ No breaking changes to existing functionality

## 🎯 FINAL VALIDATION

After completion, verify:
1. `npm run build` succeeds with no errors
2. All tests pass (if any exist)
3. Development server starts without warnings
4. Type checking passes with strict mode
5. No console errors in browser
6. All existing functionality still works

---

**EXECUTE SYSTEMATICALLY. FIX COMPLETELY. MAINTAIN FUNCTIONALITY.** 