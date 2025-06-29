# מפרט מערכת ניהול מודולרית עם Supabase

## 1. ארכיטקטורה כללית

### 1.1 מבנה הפרוייקט
```
/src
  /lib
    /supabase
      /client.ts              # Supabase client configuration
      /auth.ts               # Authentication utilities
      /types.ts              # Database types (generated)
    /models                  # Data models and schemas
    /services               # Business logic services
    /hooks                  # React hooks for data fetching
    /utils                  # Utility functions
  /components
    /admin                  # Admin-specific components
      /shared               # Shared admin components
      /[model-name]         # Model-specific components
    /ui                     # UI components
  /app
    /admin
      /[model-name]         # Admin pages for each model
```

### 1.2 עקרונות עיצוב
- **מודולריות**: כל מודל עם קבצים נפרדים
- **עקביות**: API אחיד לכל הפעולות CRUD
- **טיפוס בטוח**: TypeScript עם טיפוסים מדוייקים
- **ביצועים**: Optimistic updates + Real-time subscriptions
- **אבטחה**: Row Level Security (RLS) policies

## 2. הגדרת מודלים

### 2.1 מודל משתמש (User)
```typescript
interface User {
  id: string
  email: string
  phone: string
  name: string
  gender: 'male' | 'female' | 'other'
  date_of_birth?: Date
  roles: UserRole[]
  active_role?: UserRole
  treatment_preferences: TreatmentPreferences
  notification_preferences: NotificationPreferences
  email_verified: boolean
  phone_verified: boolean
  created_at: Date
  updated_at: Date
}

enum UserRole {
  MEMBER = 'member',
  PROFESSIONAL = 'professional',
  PARTNER = 'partner',
  ADMIN = 'admin'
}
```

### 2.2 מודל הזמנה (Booking)
```typescript
interface Booking {
  id: string
  booking_number: string
  user_id?: string
  treatment_id: string
  professional_id?: string
  booking_date_time: Date
  status: BookingStatus
  price_details: PriceDetails
  payment_details: PaymentDetails
  address_snapshot: AddressSnapshot
  created_at: Date
  updated_at: Date
}

enum BookingStatus {
  PENDING_PAYMENT = 'pending_payment',
  IN_PROCESS = 'in_process',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}
```

### 2.3 מודל טיפול (Treatment)
```typescript
interface Treatment {
  id: string
  name: string
  category: TreatmentCategory
  description?: string
  is_active: boolean
  pricing_type: 'fixed' | 'duration_based'
  fixed_price?: number
  fixed_professional_price?: number
  durations?: TreatmentDuration[]
  created_at: Date
  updated_at: Date
}
```

## 3. שירותי Supabase

### 3.1 הגדרת Client
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// For admin operations
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### 3.2 Authentication Service
```typescript
// lib/supabase/auth.ts
export class AuthService {
  static async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  static async signUp(email: string, password: string, metadata: any) {
    return await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
  }

  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  static async hasRole(role: UserRole): Promise<boolean> {
    const user = await this.getCurrentUser()
    if (!user) return false
    
    const { data } = await supabase
      .from('users')
      .select('roles')
      .eq('id', user.id)
      .single()
    
    return data?.roles?.includes(role) || false
  }
}
```

## 4. שירותי מודלים (Model Services)

### 4.1 Base Service Class
```typescript
// lib/services/base-service.ts
export abstract class BaseService<T> {
  protected tableName: string
  protected supabase = supabase

  constructor(tableName: string) {
    this.tableName = tableName
  }

  async getAll(options?: QueryOptions): Promise<ServiceResponse<T[]>> {
    try {
      let query = this.supabase.from(this.tableName).select('*')
      
      if (options?.filters) {
        options.filters.forEach(filter => {
          query = query.filter(filter.column, filter.operator, filter.value)
        })
      }
      
      if (options?.sort) {
        query = query.order(options.sort.column, { ascending: options.sort.ascending })
      }
      
      if (options?.pagination) {
        const { page, limit } = options.pagination
        query = query.range((page - 1) * limit, page * limit - 1)
      }

      const { data, error } = await query
      
      if (error) throw error
      return { success: true, data: data as T[] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async getById(id: string): Promise<ServiceResponse<T>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return { success: true, data: data as T }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async create(item: Partial<T>): Promise<ServiceResponse<T>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(item)
        .select()
        .single()
      
      if (error) throw error
      return { success: true, data: data as T }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async update(id: string, updates: Partial<T>): Promise<ServiceResponse<T>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return { success: true, data: data as T }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return { success: true, data: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
```

### 4.2 User Service
```typescript
// lib/services/user-service.ts
export class UserService extends BaseService<User> {
  constructor() {
    super('users')
  }

  async getUsersByRole(role: UserRole): Promise<ServiceResponse<User[]>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .contains('roles', [role])
      
      if (error) throw error
      return { success: true, data: data as User[] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async updateUserRole(userId: string, roles: UserRole[]): Promise<ServiceResponse<User>> {
    return this.update(userId, { roles })
  }

  async searchUsers(query: string): Promise<ServiceResponse<User[]>> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      
      if (error) throw error
      return { success: true, data: data as User[] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}
```

## 5. React Hooks למודלים

### 5.1 Base Hook
```typescript
// lib/hooks/use-model.ts
export function useModel<T>(service: BaseService<T>) {
  const queryClient = useQueryClient()

  const useGetAll = (options?: QueryOptions) => {
    return useQuery({
      queryKey: [service.tableName, 'all', options],
      queryFn: () => service.getAll(options)
    })
  }

  const useGetById = (id: string) => {
    return useQuery({
      queryKey: [service.tableName, id],
      queryFn: () => service.getById(id),
      enabled: !!id
    })
  }

  const useCreate = () => {
    return useMutation({
      mutationFn: (data: Partial<T>) => service.create(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [service.tableName] })
      }
    })
  }

  const useUpdate = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => 
        service.update(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [service.tableName] })
      }
    })
  }

  const useDelete = () => {
    return useMutation({
      mutationFn: (id: string) => service.delete(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [service.tableName] })
      }
    })
  }

  return {
    useGetAll,
    useGetById,
    useCreate,
    useUpdate,
    useDelete
  }
}
```

### 5.2 Specific Model Hooks
```typescript
// lib/hooks/use-users.ts
const userService = new UserService()

export const useUsers = () => {
  const baseHooks = useModel(userService)
  
  const useSearchUsers = (query: string) => {
    return useQuery({
      queryKey: ['users', 'search', query],
      queryFn: () => userService.searchUsers(query),
      enabled: query.length > 2
    })
  }

  const useUsersByRole = (role: UserRole) => {
    return useQuery({
      queryKey: ['users', 'role', role],
      queryFn: () => userService.getUsersByRole(role)
    })
  }

  return {
    ...baseHooks,
    useSearchUsers,
    useUsersByRole
  }
}
```

## 6. Real-time Subscriptions

### 6.1 מתי להשתמש ב-Real-time
- **הזמנות**: עדכונים בזמן אמת לסטטוס הזמנות
- **הודעות**: התראות חדשות למנהלים
- **דוחות**: עדכון נתונים בזמן אמת בדשבורד
- **לא להשתמש**: בעריכת פרופילים, הגדרות מערכת

### 6.2 Real-time Hook
```typescript
// lib/hooks/use-realtime.ts
export function useRealtimeSubscription<T>(
  tableName: string,
  filter?: string,
  callback?: (payload: any) => void
) {
  const [data, setData] = useState<T[]>([])

  useEffect(() => {
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter
        },
        (payload) => {
          if (callback) {
            callback(payload)
          } else {
            // Default behavior - update local state
            if (payload.eventType === 'INSERT') {
              setData(prev => [...prev, payload.new as T])
            } else if (payload.eventType === 'UPDATE') {
              setData(prev => prev.map(item => 
                (item as any).id === payload.new.id ? payload.new as T : item
              ))
            } else if (payload.eventType === 'DELETE') {
              setData(prev => prev.filter(item => 
                (item as any).id !== payload.old.id
              ))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableName, filter, callback])

  return data
}
```

## 7. Events System

### 7.1 מתי להשתמש ב-Events
- **אחרי יצירת הזמנה**: שליחת אימייל, עדכון מלאי
- **אחרי ביטול הזמנה**: החזר כספי, עדכון זמינות
- **אחרי עדכון סטטוס**: הודעות למשתמשים
- **אחרי רישום משתמש חדש**: אימייל ברוכים הבאים

### 7.2 Event System
```typescript
// lib/events/event-system.ts
export class EventSystem {
  private static handlers: Map<string, Function[]> = new Map()

  static on(event: string, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
  }

  static emit(event: string, data: any) {
    const handlers = this.handlers.get(event) || []
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error)
      }
    })
  }

  static off(event: string, handler: Function) {
    const handlers = this.handlers.get(event) || []
    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
    }
  }
}

// Event handlers
EventSystem.on('booking:created', async (booking: Booking) => {
  await EmailService.sendBookingConfirmation(booking)
  await NotificationService.notifyAdmins('new_booking', booking)
})

EventSystem.on('booking:cancelled', async (booking: Booking) => {
  await PaymentService.processRefund(booking)
  await EmailService.sendCancellationNotice(booking)
})
```

## 8. שירותי Supabase נוספים

### 8.1 Storage לקבצים
```typescript
// lib/supabase/storage.ts
export class StorageService {
  static async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file)
    
    if (error) throw error
    return data
  }

  static async getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return data.publicUrl
  }

  static async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw error
  }
}
```

### 8.2 Edge Functions לעיבוד מורכב
```typescript
// supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { type, data } = await req.json()
  
  switch (type) {
    case 'booking_reminder':
      await sendBookingReminder(data)
      break
    case 'payment_failed':
      await handlePaymentFailure(data)
      break
  }
  
  return new Response(JSON.stringify({ success: true }))
})
```

## 9. Row Level Security (RLS)

### 9.1 הגדרת מדיניות אבטחה
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Admins can see all data
CREATE POLICY "Admins can view all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND 'admin' = ANY(roles)
    )
  );

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Professionals can view assigned bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = professional_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND ('admin' = ANY(roles) OR 'professional' = ANY(roles))
    )
  );
```

## 10. רכיבי UI מודולריים

### 10.1 Admin Table Component
```typescript
// components/admin/shared/admin-table.tsx
interface AdminTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  onEdit?: (item: T) => void
  onDelete?: (id: string) => void
  onCreate?: () => void
  loading?: boolean
  pagination?: PaginationProps
}

export function AdminTable<T>({ 
  data, 
  columns, 
  onEdit, 
  onDelete, 
  onCreate,
  loading,
  pagination 
}: AdminTableProps<T>) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ניהול נתונים</h2>
        {onCreate && (
          <Button onClick={onCreate}>
            <Plus className="w-4 h-4 mr-2" />
            הוסף חדש
          </Button>
        )}
      </div>
      
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        pagination={pagination}
      />
    </div>
  )
}
```

### 10.2 Admin Form Component
```typescript
// components/admin/shared/admin-form.tsx
interface AdminFormProps<T> {
  initialData?: T
  onSubmit: (data: T) => Promise<void>
  onCancel: () => void
  schema: z.ZodSchema<T>
  fields: FormField[]
}

export function AdminForm<T>({ 
  initialData, 
  onSubmit, 
  onCancel, 
  schema, 
  fields 
}: AdminFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: initialData
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {fields.map(field => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  {field.type === 'select' ? (
                    <Select onValueChange={formField.onChange} value={formField.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input {...formField} type={field.type} placeholder={field.placeholder} />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        
        <div className="flex gap-2">
          <Button type="submit">שמור</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            ביטול
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

## 11. דוגמה מלאה - ניהול משתמשים

### 11.1 Admin Users Page
```typescript
// app/admin/users/page.tsx
export default function AdminUsersPage() {
  const { useGetAll, useCreate, useUpdate, useDelete } = useUsers()
  const { data: users, isLoading } = useGetAll()
  const createMutation = useCreate()
  const updateMutation = useUpdate()
  const deleteMutation = useDelete()

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: 'שם'
    },
    {
      accessorKey: 'email',
      header: 'אימייל'
    },
    {
      accessorKey: 'roles',
      header: 'תפקידים',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.roles.map(role => (
            <Badge key={role} variant="secondary">
              {role}
            </Badge>
          ))}
        </div>
      )
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleEdit(row.original)}>
            עריכה
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => handleDelete(row.original.id)}
          >
            מחיקה
          </Button>
        </div>
      )
    }
  ]

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const handleSubmit = async (data: User) => {
    if (selectedUser) {
      await updateMutation.mutateAsync({ id: selectedUser.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
    setIsFormOpen(false)
    setSelectedUser(null)
  }

  return (
    <div className="container mx-auto py-6">
      <AdminTable
        data={users?.data || []}
        columns={columns}
        loading={isLoading}
        onCreate={() => setIsFormOpen(true)}
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
            </DialogTitle>
          </DialogHeader>
          
          <AdminForm
            initialData={selectedUser}
            onSubmit={handleSubmit}
            onCancel={() => setIsFormOpen(false)}
            schema={userSchema}
            fields={userFormFields}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

## 12. הגדרות נוספות

### 12.1 Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 12.2 Database Migrations
```sql
-- Create enum types
CREATE TYPE user_role AS ENUM ('member', 'professional', 'partner', 'admin');
CREATE TYPE booking_status AS ENUM ('pending_payment', 'in_process', 'confirmed', 'completed', 'cancelled', 'refunded');

-- Create tables with proper relationships
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  roles user_role[] DEFAULT ARRAY['member'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_users_roles ON users USING GIN (roles);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_phone ON users (phone);
```

## 13. סיכום עקרונות

### 13.1 מבנה קוד
- **שירותים**: כל מודל עם שירות נפרד
- **Hooks**: React hooks לכל מודל
- **רכיבים**: רכיבי UI מודולריים וניתנים לשימוש חוזר
- **טיפוסים**: TypeScript מלא עם טיפוסים מדוייקים

### 13.2 ביצועים
- **Caching**: React Query לניהול cache
- **Optimistic Updates**: עדכונים מיידיים בממשק
- **Pagination**: עימוד לטבלאות גדולות
- **Lazy Loading**: טעינה עצלה של רכיבים

### 13.3 אבטחה
- **RLS**: Row Level Security לכל הטבלאות
- **Authentication**: אימות מלא עם Supabase Auth
- **Authorization**: בדיקת הרשאות בכל פעולה
- **Validation**: ולידציה בצד שרת וקליינט

### 13.4 תחזוקה
- **Logging**: רישום פעולות ושגיאות
- **Error Handling**: טיפול בשגיאות מקיף
- **Testing**: בדיקות יחידה ואינטגרציה
- **Documentation**: תיעוד מפורט לכל רכיב
