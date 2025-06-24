# 📊 דוח שגיאות TypeScript - ניתוח מפורט

## 📈 סיכום כללי
- **סה"כ שגיאות:** 597
- **קטגוריות:** 8

### 📋 פירוט לפי קטגוריות:
- **Type Mismatches:** 90 שגיאות
- **Schema/Model Issues:** 226 שגיאות
- **Undefined/Null Issues:** 34 שגיאות
- **Translation Issues:** 3 שגיאות
- **ObjectId/Unknown Issues:** 44 שגיאות
- **Property Missing:** 1 שגיאות
- **Interface Issues:** 7 שגיאות
- **Other:** 192 שגיאות

## 🔧 Type Mismatches (90 שגיאות)

### 📁 actions/admin-actions.ts

**שורה 233:25** - Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
```typescript
// קובץ: actions/admin-actions.ts
// שורה: 233
// שגיאה: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
```

### 📁 actions/gift-voucher-actions.ts

**שורה 1447:7** - Type 'null' is not assignable to type 'ObjectId | undefined'.
```typescript
// קובץ: actions/gift-voucher-actions.ts
// שורה: 1447
// שגיאה: Type 'null' is not assignable to type 'ObjectId | undefined'.
```

**שורה 1448:7** - Type 'null' is not assignable to type 'ObjectId | undefined'.
```typescript
// קובץ: actions/gift-voucher-actions.ts
// שורה: 1448
// שגיאה: Type 'null' is not assignable to type 'ObjectId | undefined'.
```

### 📁 actions/partner-coupon-batch-actions.ts

**שורה 106:5** - Type 'unknown[]' is not assignable to type 'ObjectId[]'.
```typescript
// קובץ: actions/partner-coupon-batch-actions.ts
// שורה: 106
// שגיאה: Type 'unknown[]' is not assignable to type 'ObjectId[]'.
```

### 📁 actions/subscription-actions.ts

**שורה 37:29** - Type '{ _id: any; treatmentId: any; __v: number; }[]' is not assignable to type 'ISubscription[]'.
```typescript
// קובץ: actions/subscription-actions.ts
// שורה: 37
// שגיאה: Type '{ _id: any; treatmentId: any; __v: number; }[]' is not assignable to type 'ISubscription[]'.
```

**שורה 75:29** - Type '{ _id: any; treatmentId: any; length: number; toString(): string; toLocaleString(): string; toLocaleString(locales: string | string[], options?: (NumberFormatOptions & DateTimeFormatOptions) | undefined): string; ... 37 more ...; [Symbol.unscopables]: { ...; }; } | { ...; }' is not assignable to type 'ISubscription | undefined'.
```typescript
// קובץ: actions/subscription-actions.ts
// שורה: 75
// שגיאה: Type '{ _id: any; treatmentId: any; length: number; toString(): string; toLocaleString(): string; toLocaleString(locales: string | string[], options?: (NumberFormatOptions & DateTimeFormatOptions) | undefined): string; ... 37 more ...; [Symbol.unscopables]: { ...; }; } | { ...; }' is not assignable to type 'ISubscription | undefined'.
```

### 📁 app/(orders)/purchase/subscription/actions.ts

**שורה 107:7** - Type '{ _id: string; name: string; description: string | undefined; category: "massages" | "facial_treatments"; pricingType: "fixed" | "duration_based"; fixedPrice: number | undefined; durations: { ...; }[] | undefined; isActive: boolean; createdAt: string; updatedAt: string; }[]' is not assignable to type 'SerializedTreatment[]'.
```typescript
// קובץ: app/(orders)/purchase/subscription/actions.ts
// שורה: 107
// שגיאה: Type '{ _id: string; name: string; description: string | undefined; category: "massages" | "facial_treatments"; pricingType: "fixed" | "duration_based"; fixedPrice: number | undefined; durations: { ...; }[] | undefined; isActive: boolean; createdAt: string; updatedAt: string; }[]' is not assignable to type 'SerializedTreatment[]'.
```

### 📁 app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx

**שורה 412:23** - Type 'string | undefined' is not assignable to type 'string'.
```typescript
// קובץ: app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx
// שורה: 412
// שגיאה: Type 'string | undefined' is not assignable to type 'string'.
```

**שורה 413:23** - Type 'string | undefined' is not assignable to type 'string'.
```typescript
// קובץ: app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx
// שורה: 413
// שגיאה: Type 'string | undefined' is not assignable to type 'string'.
```

**שורה 414:23** - Type 'string | undefined' is not assignable to type 'string'.
```typescript
// קובץ: app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx
// שורה: 414
// שגיאה: Type 'string | undefined' is not assignable to type 'string'.
```

**שורה 415:23** - Type 'string | undefined' is not assignable to type 'string'.
```typescript
// קובץ: app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx
// שורה: 415
// שגיאה: Type 'string | undefined' is not assignable to type 'string'.
```

### 📁 app/api/admin/bookings/route.ts

**שורה 163:11** - Type '{ _id: FlattenMaps<unknown>; userId: ObjectId | undefined; treatmentId: ObjectId; professionalId: ObjectId | null; addressId: ObjectId | null; ... 106 more ...; __v: number; }[]' is not assignable to type 'PopulatedBooking[]'.
```typescript
// קובץ: app/api/admin/bookings/route.ts
// שורה: 163
// שגיאה: Type '{ _id: FlattenMaps<unknown>; userId: ObjectId | undefined; treatmentId: ObjectId; professionalId: ObjectId | null; addressId: ObjectId | null; ... 106 more ...; __v: number; }[]' is not assignable to type 'PopulatedBooking[]'.
```

### 📁 app/dashboard/(user)/(roles)/admin/customers/actions.ts

**שורה 251:53** - Argument of type '{ userId?: string | undefined; type?: ("booking" | "subscription" | "gift_voucher")[] | undefined; status?: string[] | undefined; dateFrom?: Date | undefined; dateTo?: Date | undefined; search?: string | undefined; } | undefined' is not assignable to parameter of type 'Partial<PurchaseFilters> | undefined'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/customers/actions.ts
// שורה: 251
// שגיאה: Argument of type '{ userId?: string | undefined; type?: ("booking" | "subscription" | "gift_voucher")[] | undefined; status?: string[] | undefined; dateFrom?: Date | undefined; dateTo?: Date | undefined; search?: string | undefined; } | undefined' is not assignable to parameter of type 'Partial<PurchaseFilters> | undefined'.
```

### 📁 app/dashboard/(user)/(roles)/admin/users/actions.ts

**שורה 250:7** - Argument of type '{ value: string; name: string; language: "en"; }' is not assignable to parameter of type 'EmailRecipient'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/users/actions.ts
// שורה: 250
// שגיאה: Argument of type '{ value: string; name: string; language: "en"; }' is not assignable to parameter of type 'EmailRecipient'.
```

**שורה 364:5** - Type 'string' is not assignable to type '"male" | "female" | "other" | undefined'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/users/actions.ts
// שורה: 364
// שגיאה: Type 'string' is not assignable to type '"male" | "female" | "other" | undefined'.
```

### 📁 app/dashboard/(user)/(roles)/member/book-treatment/page.tsx

**שורה 22:7** - Type '{ id: string; roles: string[]; activeRole: string; treatmentPreferences?: ITreatmentPreferences | undefined; notificationPreferences?: INotificationPreferences | undefined; } & { ...; }' is not assignable to type '{ id: string; name?: string | undefined; email?: string | undefined; phone?: string | undefined; roles?: string[] | undefined; } | null | undefined'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/member/book-treatment/page.tsx
// שורה: 22
// שגיאה: Type '{ id: string; roles: string[]; activeRole: string; treatmentPreferences?: ITreatmentPreferences | undefined; notificationPreferences?: INotificationPreferences | undefined; } & { ...; }' is not assignable to type '{ id: string; name?: string | undefined; email?: string | undefined; phone?: string | undefined; roles?: string[] | undefined; } | null | undefined'.
```

### 📁 app/dashboard/(user)/(roles)/member/gift-vouchers/purchase/page.tsx

**שורה 31:11** - Type 'never[] | { _id: any; name: any; category: any; price: number | undefined; fixedPrice: any; durations: any; }[]' is not assignable to type 'ITreatment[]'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/member/gift-vouchers/purchase/page.tsx
// שורה: 31
// שגיאה: Type 'never[] | { _id: any; name: any; category: any; price: number | undefined; fixedPrice: any; durations: any; }[]' is not assignable to type 'ITreatment[]'.
```

### 📁 app/dashboard/(user)/profile/page.tsx

**שורה 28:20** - Type '{ user: { dateOfBirth: string; createdAt: string; id: string; name: string; email: string; phone: string; gender: string; image: string; }; }' is not assignable to type 'IntrinsicAttributes & ProfileFormProps'.
```typescript
// קובץ: app/dashboard/(user)/profile/page.tsx
// שורה: 28
// שגיאה: Type '{ user: { dateOfBirth: string; createdAt: string; id: string; name: string; email: string; phone: string; gender: string; image: string; }; }' is not assignable to type 'IntrinsicAttributes & ProfileFormProps'.
```

### 📁 components/booking/steps/guest-info-step.tsx

**שורה 140:5** - Type 'Resolver<{ email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; recipientEmail?: string | undefined; recipientBirthDate?: Date | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>' is not assignable to type 'Resolver<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 140
// שגיאה: Type 'Resolver<{ email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; recipientEmail?: string | undefined; recipientBirthDate?: Date | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>' is not assignable to type 'Resolver<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 212:43** - Argument of type '(data: { isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }) => void' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 212
// שגיאה: Argument of type '(data: { isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }) => void' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.
```

**שורה 244:19** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 244
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 262:19** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 262
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 281:17** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 281
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 303:17** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 303
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 328:21** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 328
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 374:21** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 374
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 399:17** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 399
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 429:21** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 429
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 447:21** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 447
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 466:19** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 466
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 488:19** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 488
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 512:23** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 512
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 559:23** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 559
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 603:27** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 603
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 617:27** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 617
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 637:31** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 637
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

**שורה 661:31** - Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/booking/steps/guest-info-step.tsx
// שורה: 661
// שגיאה: Type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ isBookingForSomeoneElse: boolean; isGift: boolean; email: string; phone: string; firstName: string; lastName: string; notes?: string | undefined; recipientPhone?: string | undefined; ... 10 more ...; sendTime?: string | undefined; }, any, { ...; }>'.
```

### 📁 components/booking/steps/guest-payment-step.tsx

**שורה 305:39** - Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
```typescript
// קובץ: components/booking/steps/guest-payment-step.tsx
// שורה: 305
// שגיאה: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
```

### 📁 components/booking/steps/guest-summary-step.tsx

**שורה 384:39** - Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
```typescript
// קובץ: components/booking/steps/guest-summary-step.tsx
// שורה: 384
// שגיאה: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
```

### 📁 components/booking/steps/guest-treatment-selection-step.tsx

**שורה 186:27** - Argument of type '(prev: Partial<SelectedBookingOptions>) => { redemptionCode: string; redemptionData: { type: "subscription" | "gift_voucher" | "coupon"; data: any; } | undefined; ... 13 more ...; notes?: string | undefined; }' is not assignable to parameter of type 'SetStateAction<Partial<SelectedBookingOptions>>'.
```typescript
// קובץ: components/booking/steps/guest-treatment-selection-step.tsx
// שורה: 186
// שגיאה: Argument of type '(prev: Partial<SelectedBookingOptions>) => { redemptionCode: string; redemptionData: { type: "subscription" | "gift_voucher" | "coupon"; data: any; } | undefined; ... 13 more ...; notes?: string | undefined; }' is not assignable to parameter of type 'SetStateAction<Partial<SelectedBookingOptions>>'.
```

### 📁 components/common/purchase/purchase-filters.tsx

**שורה 256:69** - Type 'Date | Date[] | { from: Date; to?: Date | undefined; } | undefined' is not assignable to type 'Date | undefined'.
```typescript
// קובץ: components/common/purchase/purchase-filters.tsx
// שורה: 256
// שגיאה: Type 'Date | Date[] | { from: Date; to?: Date | undefined; } | undefined' is not assignable to type 'Date | undefined'.
```

**שורה 291:69** - Type 'Date | Date[] | { from: Date; to?: Date | undefined; } | undefined' is not assignable to type 'Date | undefined'.
```typescript
// קובץ: components/common/purchase/purchase-filters.tsx
// שורה: 291
// שגיאה: Type 'Date | Date[] | { from: Date; to?: Date | undefined; } | undefined' is not assignable to type 'Date | undefined'.
```

**שורה 292:19** - Type '(date: Date) => boolean | undefined' is not assignable to type '(date: Date) => boolean'.
```typescript
// קובץ: components/common/purchase/purchase-filters.tsx
// שורה: 292
// שגיאה: Type '(date: Date) => boolean | undefined' is not assignable to type '(date: Date) => boolean'.
```

### 📁 components/common/ui/pagination.tsx

**שורה 123:13** - Type '{ onClick: () => void; disabled: boolean | undefined; }' is not assignable to type 'IntrinsicAttributes & { isActive?: boolean | undefined; } & Pick<ButtonProps, "size"> & ClassAttributes<HTMLAnchorElement> & AnchorHTMLAttributes<...>'.
```typescript
// קובץ: components/common/ui/pagination.tsx
// שורה: 123
// שגיאה: Type '{ onClick: () => void; disabled: boolean | undefined; }' is not assignable to type 'IntrinsicAttributes & { isActive?: boolean | undefined; } & Pick<ButtonProps, "size"> & ClassAttributes<HTMLAnchorElement> & AnchorHTMLAttributes<...>'.
```

**שורה 131:15** - Type '{ children: number; isActive: boolean; onClick: () => void; disabled: boolean | undefined; }' is not assignable to type 'IntrinsicAttributes & { isActive?: boolean | undefined; } & Pick<ButtonProps, "size"> & ClassAttributes<HTMLAnchorElement> & AnchorHTMLAttributes<...>'.
```typescript
// קובץ: components/common/ui/pagination.tsx
// שורה: 131
// שגיאה: Type '{ children: number; isActive: boolean; onClick: () => void; disabled: boolean | undefined; }' is not assignable to type 'IntrinsicAttributes & { isActive?: boolean | undefined; } & Pick<ButtonProps, "size"> & ClassAttributes<HTMLAnchorElement> & AnchorHTMLAttributes<...>'.
```

**שורה 140:13** - Type '{ onClick: () => void; disabled: boolean | undefined; }' is not assignable to type 'IntrinsicAttributes & { isActive?: boolean | undefined; } & Pick<ButtonProps, "size"> & ClassAttributes<HTMLAnchorElement> & AnchorHTMLAttributes<...>'.
```typescript
// קובץ: components/common/ui/pagination.tsx
// שורה: 140
// שגיאה: Type '{ onClick: () => void; disabled: boolean | undefined; }' is not assignable to type 'IntrinsicAttributes & { isActive?: boolean | undefined; } & Pick<ButtonProps, "size"> & ClassAttributes<HTMLAnchorElement> & AnchorHTMLAttributes<...>'.
```

### 📁 components/dashboard/admin/bookings/admin-bookings-columns.tsx

**שורה 128:56** - Argument of type 'ObjectId' is not assignable to parameter of type 'string'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 128
// שגיאה: Argument of type 'ObjectId' is not assignable to parameter of type 'string'.
```

**שורה 245:65** - Argument of type 'ObjectId' is not assignable to parameter of type 'string'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 245
// שגיאה: Argument of type 'ObjectId' is not assignable to parameter of type 'string'.
```

**שורה 420:9** - Type 'ObjectId' is not assignable to type 'string'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 420
// שגיאה: Type 'ObjectId' is not assignable to type 'string'.
```

### 📁 components/dashboard/admin/bookings/booking-create-page.tsx

**שורה 211:13** - Type '{ formData: BookingFormData; onUpdate: (updates: Partial<BookingFormData>) => void; paymentMethods: any[]; activeCoupons: any[]; activeGiftVouchers: any[]; calculatedPrice: any; onCalculatePrice: Dispatch<...>; onNext: () => void; onPrev: () => void; }' is not assignable to type 'IntrinsicAttributes & BookingCreatePaymentStepProps'.
```typescript
// קובץ: components/dashboard/admin/bookings/booking-create-page.tsx
// שורה: 211
// שגיאה: Type '{ formData: BookingFormData; onUpdate: (updates: Partial<BookingFormData>) => void; paymentMethods: any[]; activeCoupons: any[]; activeGiftVouchers: any[]; calculatedPrice: any; onCalculatePrice: Dispatch<...>; onNext: () => void; onPrev: () => void; }' is not assignable to type 'IntrinsicAttributes & BookingCreatePaymentStepProps'.
```

**שורה 223:13** - Type '{ formData: BookingFormData; calculatedPrice: any; onConfirm: () => Promise<void>; onPrev: () => void; isLoading: boolean; }' is not assignable to type 'IntrinsicAttributes & BookingCreateConfirmationStepProps'.
```typescript
// קובץ: components/dashboard/admin/bookings/booking-create-page.tsx
// שורה: 223
// שגיאה: Type '{ formData: BookingFormData; calculatedPrice: any; onConfirm: () => Promise<void>; onPrev: () => void; isLoading: boolean; }' is not assignable to type 'IntrinsicAttributes & BookingCreateConfirmationStepProps'.
```

### 📁 components/dashboard/admin/bookings/comprehensive-booking-edit-modal.tsx

**שורה 168:26** - Argument of type '(prev: Partial<PopulatedBooking>) => { professionalId: string; _id?: ObjectId | undefined; treatmentId?: PopulatedBookingTreatment | null | undefined; ... 107 more ...; reviewReminderSentAt?: Date | undefined; }' is not assignable to parameter of type 'SetStateAction<Partial<PopulatedBooking>>'.
```typescript
// קובץ: components/dashboard/admin/bookings/comprehensive-booking-edit-modal.tsx
// שורה: 168
// שגיאה: Argument of type '(prev: Partial<PopulatedBooking>) => { professionalId: string; _id?: ObjectId | undefined; treatmentId?: PopulatedBookingTreatment | null | undefined; ... 107 more ...; reviewReminderSentAt?: Date | undefined; }' is not assignable to parameter of type 'SetStateAction<Partial<PopulatedBooking>>'.
```

### 📁 components/dashboard/admin/coupons/coupon-form.tsx

**שורה 76:5** - Type 'Resolver<{ code: string; validFrom: Date; validUntil: Date; discountType: "percentage" | "fixedAmount"; discountValue: number; description?: string | undefined; isActive?: boolean | undefined; usageLimit?: number | undefined; usageLimitPerUser?: number | undefined; assignedPartnerId?: string | ... 1 more ... | undef...' is not assignable to type 'Resolver<{ code: string; validFrom: Date; validUntil: Date; isActive: boolean; discountType: "percentage" | "fixedAmount"; discountValue: number; usageLimit: number; usageLimitPerUser: number; description?: string | undefined; assignedPartnerId?: string | ... 1 more ... | undefined; notesForPartner?: string | undefi...'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupon-form.tsx
// שורה: 76
// שגיאה: Type 'Resolver<{ code: string; validFrom: Date; validUntil: Date; discountType: "percentage" | "fixedAmount"; discountValue: number; description?: string | undefined; isActive?: boolean | undefined; usageLimit?: number | undefined; usageLimitPerUser?: number | undefined; assignedPartnerId?: string | ... 1 more ... | undef...' is not assignable to type 'Resolver<{ code: string; validFrom: Date; validUntil: Date; isActive: boolean; discountType: "percentage" | "fixedAmount"; discountValue: number; usageLimit: number; usageLimitPerUser: number; description?: string | undefined; assignedPartnerId?: string | ... 1 more ... | undefined; notesForPartner?: string | undefi...'.
```

**שורה 85:20** - Argument of type 'TFieldValues' is not assignable to parameter of type '{ code: string; validFrom: Date; validUntil: Date; isActive: boolean; discountType: "percentage" | "fixedAmount"; discountValue: number; usageLimit: number; usageLimitPerUser: number; description?: string | undefined; assignedPartnerId?: string | ... 1 more ... | undefined; notesForPartner?: string | undefined; }'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupon-form.tsx
// שורה: 85
// שגיאה: Argument of type 'TFieldValues' is not assignable to parameter of type '{ code: string; validFrom: Date; validUntil: Date; isActive: boolean; discountType: "percentage" | "fixedAmount"; discountValue: number; usageLimit: number; usageLimitPerUser: number; description?: string | undefined; assignedPartnerId?: string | ... 1 more ... | undefined; notesForPartner?: string | undefined; }'.
```

### 📁 components/dashboard/admin/gift-vouchers/gift-vouchers-client.tsx

**שורה 398:19** - Type 'DateRange | undefined' is not assignable to type 'Date | Date[] | { from: Date; to?: Date | undefined; } | undefined'.
```typescript
// קובץ: components/dashboard/admin/gift-vouchers/gift-vouchers-client.tsx
// שורה: 398
// שגיאה: Type 'DateRange | undefined' is not assignable to type 'Date | Date[] | { from: Date; to?: Date | undefined; } | undefined'.
```

**שורה 399:19** - Type 'Dispatch<SetStateAction<DateRange | undefined>>' is not assignable to type '(date: Date | Date[] | { from: Date; to?: Date | undefined; } | undefined) => void'.
```typescript
// קובץ: components/dashboard/admin/gift-vouchers/gift-vouchers-client.tsx
// שורה: 399
// שגיאה: Type 'Dispatch<SetStateAction<DateRange | undefined>>' is not assignable to type '(date: Date | Date[] | { from: Date; to?: Date | undefined; } | undefined) => void'.
```

### 📁 components/dashboard/admin/partner-coupon-batches/partner-coupon-batch-card.tsx

**שורה 46:61** - Type 'string' is not assignable to type '"rtl" | "ltr"'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/partner-coupon-batch-card.tsx
// שורה: 46
// שגיאה: Type 'string' is not assignable to type '"rtl" | "ltr"'.
```

**שורה 48:23** - Type 'string' is not assignable to type 'Direction | undefined'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/partner-coupon-batch-card.tsx
// שורה: 48
// שגיאה: Type 'string' is not assignable to type 'Direction | undefined'.
```

### 📁 components/dashboard/admin/partner-management/partner-management.tsx

**שורה 91:7** - Type 'string | undefined' is not assignable to type 'string'.
```typescript
// קובץ: components/dashboard/admin/partner-management/partner-management.tsx
// שורה: 91
// שגיאה: Type 'string | undefined' is not assignable to type 'string'.
```

**שורה 92:7** - Type '"male" | "female" | "other" | undefined' is not assignable to type '"male" | "female"'.
```typescript
// קובץ: components/dashboard/admin/partner-management/partner-management.tsx
// שורה: 92
// שגיאה: Type '"male" | "female" | "other" | undefined' is not assignable to type '"male" | "female"'.
```

**שורה 211:9** - Type 'PartnerData | undefined' is not assignable to type 'PartnerData | null | undefined'.
```typescript
// קובץ: components/dashboard/admin/partner-management/partner-management.tsx
// שורה: 211
// שגיאה: Type 'PartnerData | undefined' is not assignable to type 'PartnerData | null | undefined'.
```

### 📁 components/dashboard/admin/subscriptions/subscriptions-client.tsx

**שורה 125:27** - Type 'ISubscription | undefined' is not assignable to type 'SubscriptionPlain'.
```typescript
// קובץ: components/dashboard/admin/subscriptions/subscriptions-client.tsx
// שורה: 125
// שגיאה: Type 'ISubscription | undefined' is not assignable to type 'SubscriptionPlain'.
```

**שורה 150:26** - Argument of type '(ISubscription | SubscriptionPlain | undefined)[]' is not assignable to parameter of type 'SetStateAction<SubscriptionPlain[]>'.
```typescript
// קובץ: components/dashboard/admin/subscriptions/subscriptions-client.tsx
// שורה: 150
// שגיאה: Argument of type '(ISubscription | SubscriptionPlain | undefined)[]' is not assignable to parameter of type 'SetStateAction<SubscriptionPlain[]>'.
```

### 📁 components/dashboard/admin/treatments/treatment-form.tsx

**שורה 146:40** - Argument of type '{ durations: any; name: string; category: "massages" | "facial_treatments"; description?: string; isActive: boolean; pricingType: "fixed" | "duration_based"; fixedPrice?: number; fixedProfessionalPrice?: number; allowTherapistGenderSelection: boolean; }' is not assignable to parameter of type 'Omit<ITreatment, "createdAt" | "updatedAt" | "_id">'.
```typescript
// קובץ: components/dashboard/admin/treatments/treatment-form.tsx
// שורה: 146
// שגיאה: Argument of type '{ durations: any; name: string; category: "massages" | "facial_treatments"; description?: string; isActive: boolean; pricingType: "fixed" | "duration_based"; fixedPrice?: number; fixedProfessionalPrice?: number; allowTherapistGenderSelection: boolean; }' is not assignable to parameter of type 'Omit<ITreatment, "createdAt" | "updatedAt" | "_id">'.
```

### 📁 components/dashboard/admin/treatments/treatments-client.tsx

**שורה 43:7** - Type '"success"' is not assignable to type '"default" | "destructive" | null | undefined'.
```typescript
// קובץ: components/dashboard/admin/treatments/treatments-client.tsx
// שורה: 43
// שגיאה: Type '"success"' is not assignable to type '"default" | "destructive" | null | undefined'.
```

**שורה 52:7** - Type '"success"' is not assignable to type '"default" | "destructive" | null | undefined'.
```typescript
// קובץ: components/dashboard/admin/treatments/treatments-client.tsx
// שורה: 52
// שגיאה: Type '"success"' is not assignable to type '"default" | "destructive" | null | undefined'.
```

### 📁 components/dashboard/admin/user-management/user-form-dialog.tsx

**שורה 61:5** - Type 'Resolver<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: unknown; password?: unknown; dateOfBirth?: string | undefined; }, any, { ...; }>' is not assignable to type 'Resolver<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 61
// שגיאה: Type 'Resolver<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: unknown; password?: unknown; dateOfBirth?: string | undefined; }, any, { ...; }>' is not assignable to type 'Resolver<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```

**שורה 69:7** - Type 'string[]' is not assignable to type '("member" | "professional" | "partner" | "admin" | undefined)[]'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 69
// שגיאה: Type 'string[]' is not assignable to type '("member" | "professional" | "partner" | "admin" | undefined)[]'.
```

**שורה 81:7** - Type 'string[]' is not assignable to type '("member" | "professional" | "partner" | "admin")[] | ("member" | "professional" | "partner" | "admin" | undefined)[] | undefined'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 81
// שגיאה: Type 'string[]' is not assignable to type '("member" | "professional" | "partner" | "admin")[] | ("member" | "professional" | "partner" | "admin" | undefined)[] | undefined'.
```

**שורה 149:45** - Argument of type '(values: { name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }) => Promise<...>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 149
// שגיאה: Argument of type '(values: { name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }) => Promise<...>' is not assignable to parameter of type 'SubmitHandler<TFieldValues>'.
```

**שורה 151:15** - Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 151
// שגיאה: Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```

**שורה 164:15** - Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 164
// שגיאה: Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```

**שורה 177:15** - Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 177
// שגיאה: Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```

**שורה 195:17** - Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 195
// שגיאה: Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```

**שורה 209:15** - Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 209
// שגיאה: Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```

**שורה 231:15** - Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 231
// שגיאה: Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```

**שורה 244:15** - Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 244
// שגיאה: Type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, TFieldValues>' is not assignable to type 'Control<{ name: string; email: string; gender: "male" | "female" | "other"; roles: ("member" | "professional" | "partner" | "admin")[]; phone?: string | undefined; password?: string | undefined; dateOfBirth?: string | undefined; }, any, { ...; }>'.
```

### 📁 components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client.tsx

**שורה 396:15** - Type 'PopulatedUserSubscription' is not assignable to type 'PopulatedUserSubscription'. Two different types with this name exist, but they are unrelated.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client.tsx
// שורה: 396
// שגיאה: Type 'PopulatedUserSubscription' is not assignable to type 'PopulatedUserSubscription'. Two different types with this name exist, but they are unrelated.
```

**שורה 398:15** - Type '(sub: PopulatedUserSubscription) => void' is not assignable to type '(subscription: PopulatedUserSubscription) => void'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client.tsx
// שורה: 398
// שגיאה: Type '(sub: PopulatedUserSubscription) => void' is not assignable to type '(subscription: PopulatedUserSubscription) => void'.
```

**שורה 441:23** - Type 'PopulatedUserSubscription' is not assignable to type 'PopulatedUserSubscription'. Two different types with this name exist, but they are unrelated.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client.tsx
// שורה: 441
// שגיאה: Type 'PopulatedUserSubscription' is not assignable to type 'PopulatedUserSubscription'. Two different types with this name exist, but they are unrelated.
```

**שורה 443:23** - Type '(sub: PopulatedUserSubscription) => void' is not assignable to type '(subscription: PopulatedUserSubscription) => void'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client.tsx
// שורה: 443
// שגיאה: Type '(sub: PopulatedUserSubscription) => void' is not assignable to type '(subscription: PopulatedUserSubscription) => void'.
```

### 📁 components/dashboard/admin/working-hours/working-hours-client.tsx

**שורה 174:3** - Type '{ dayOfWeek: number; isActive: boolean; startTime: string; endTime: string; hasPriceAddition: boolean; priceAddition: { amount: number; type: "fixed"; description: string; priceAdditionStartTime: null; priceAdditionEndTime: null; }; notes: string; minimumBookingAdvanceHours: number; cutoffTime: null; professionalSha...' is not assignable to type 'IFixedHours[]'.
```typescript
// קובץ: components/dashboard/admin/working-hours/working-hours-client.tsx
// שורה: 174
// שגיאה: Type '{ dayOfWeek: number; isActive: boolean; startTime: string; endTime: string; hasPriceAddition: boolean; priceAddition: { amount: number; type: "fixed"; description: string; priceAdditionStartTime: null; priceAdditionEndTime: null; }; notes: string; minimumBookingAdvanceHours: number; cutoffTime: null; professionalSha...' is not assignable to type 'IFixedHours[]'.
```

### 📁 components/dashboard/member/addresses/address-form.tsx

**שורה 52:13** - Type 'number | undefined' is not assignable to type 'number'.
```typescript
// קובץ: components/dashboard/member/addresses/address-form.tsx
// שורה: 52
// שגיאה: Type 'number | undefined' is not assignable to type 'number'.
```

**שורה 84:55** - Argument of type 'IAddress' is not assignable to parameter of type '{ city: string; street: string; streetNumber: string; addressType: "apartment"; apartmentDetails: { floor: number; apartmentNumber: string; entrance?: string | undefined; }; hasPrivateParking: boolean; isDefault: boolean; additionalNotes?: string | undefined; } | ... 4 more ... | { ...; }'.
```typescript
// קובץ: components/dashboard/member/addresses/address-form.tsx
// שורה: 84
// שגיאה: Argument of type 'IAddress' is not assignable to parameter of type '{ city: string; street: string; streetNumber: string; addressType: "apartment"; apartmentDetails: { floor: number; apartmentNumber: string; entrance?: string | undefined; }; hasPrivateParking: boolean; isDefault: boolean; additionalNotes?: string | undefined; } | ... 4 more ... | { ...; }'.
```

**שורה 85:31** - Argument of type 'IAddress' is not assignable to parameter of type '{ city: string; street: string; streetNumber: string; addressType: "apartment"; apartmentDetails: { floor: number; apartmentNumber: string; entrance?: string | undefined; }; hasPrivateParking: boolean; isDefault: boolean; additionalNotes?: string | undefined; } | ... 4 more ... | { ...; }'.
```typescript
// קובץ: components/dashboard/member/addresses/address-form.tsx
// שורה: 85
// שגיאה: Argument of type 'IAddress' is not assignable to parameter of type '{ city: string; street: string; streetNumber: string; addressType: "apartment"; apartmentDetails: { floor: number; apartmentNumber: string; entrance?: string | undefined; }; hasPrivateParking: boolean; isDefault: boolean; additionalNotes?: string | undefined; } | ... 4 more ... | { ...; }'.
```

**שורה 147:65** - Type 'Dispatch<SetStateAction<"apartment" | "house" | "private" | "office" | "hotel" | "other">>' is not assignable to type '(value: string) => void'.
```typescript
// קובץ: components/dashboard/member/addresses/address-form.tsx
// שורה: 147
// שגיאה: Type 'Dispatch<SetStateAction<"apartment" | "house" | "private" | "office" | "hotel" | "other">>' is not assignable to type '(value: string) => void'.
```

### 📁 components/dashboard/member/reviews/member-reviews-columns.tsx

**שורה 149:62** - Type '{ className: string; title: string; }' is not assignable to type 'IntrinsicAttributes & Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>'.
```typescript
// קובץ: components/dashboard/member/reviews/member-reviews-columns.tsx
// שורה: 149
// שגיאה: Type '{ className: string; title: string; }' is not assignable to type 'IntrinsicAttributes & Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>'.
```

### 📁 components/dashboard/partner/coupons/assigned-coupons-client.tsx

**שורה 21:59** - Argument of type 'any[] | undefined' is not assignable to parameter of type 'ICoupon[] | (() => ICoupon[])'.
```typescript
// קובץ: components/dashboard/partner/coupons/assigned-coupons-client.tsx
// שורה: 21
// שגיאה: Argument of type 'any[] | undefined' is not assignable to parameter of type 'ICoupon[] | (() => ICoupon[])'.
```

**שורה 45:59** - Type 'ICoupon' is not assignable to type 'ICoupon & { effectiveStatus: string; }'.
```typescript
// קובץ: components/dashboard/partner/coupons/assigned-coupons-client.tsx
// שורה: 45
// שגיאה: Type 'ICoupon' is not assignable to type 'ICoupon & { effectiveStatus: string; }'.
```

### 📁 lib/notifications/templates/email-templates.ts

**שורה 543:7** - Type 'string | undefined' is not assignable to type 'string'.
```typescript
// קובץ: lib/notifications/templates/email-templates.ts
// שורה: 543
// שגיאה: Type 'string | undefined' is not assignable to type 'string'.
```

## 🔧 Schema/Model Issues (226 שגיאות)

### 📁 actions/gift-voucher-actions.ts

**שורה 1075:44** - Property 'language' does not exist on type '{ id: string; roles: string[]; activeRole: string; treatmentPreferences?: ITreatmentPreferences | undefined; notificationPreferences?: INotificationPreferences | undefined; } & { ...; }'.
```typescript
// קובץ: actions/gift-voucher-actions.ts
// שורה: 1075
// שגיאה: Property 'language' does not exist on type '{ id: string; roles: string[]; activeRole: string; treatmentPreferences?: ITreatmentPreferences | undefined; notificationPreferences?: INotificationPreferences | undefined; } & { ...; }'.
```

### 📁 actions/notification-service.ts

**שורה 234:52** - Property '_id' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: actions/notification-service.ts
// שורה: 234
// שגיאה: Property '_id' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

**שורה 368:48** - Property 'name' does not exist on type 'ObjectId'.
```typescript
// קובץ: actions/notification-service.ts
// שורה: 368
// שגיאה: Property 'name' does not exist on type 'ObjectId'.
```

**שורה 671:40** - Property 'role' does not exist on type '{ id: string; roles: string[]; activeRole: string; treatmentPreferences?: ITreatmentPreferences | undefined; notificationPreferences?: INotificationPreferences | undefined; } & { ...; }'. Did you mean 'roles'?
```typescript
// קובץ: actions/notification-service.ts
// שורה: 671
// שגיאה: Property 'role' does not exist on type '{ id: string; roles: string[]; activeRole: string; treatmentPreferences?: ITreatmentPreferences | undefined; notificationPreferences?: INotificationPreferences | undefined; } & { ...; }'. Did you mean 'roles'?
```

**שורה 702:40** - Property 'role' does not exist on type '{ id: string; roles: string[]; activeRole: string; treatmentPreferences?: ITreatmentPreferences | undefined; notificationPreferences?: INotificationPreferences | undefined; } & { ...; }'. Did you mean 'roles'?
```typescript
// קובץ: actions/notification-service.ts
// שורה: 702
// שגיאה: Property 'role' does not exist on type '{ id: string; roles: string[]; activeRole: string; treatmentPreferences?: ITreatmentPreferences | undefined; notificationPreferences?: INotificationPreferences | undefined; } & { ...; }'. Did you mean 'roles'?
```

### 📁 actions/password-reset-actions.ts

**שורה 129:25** - Property 'expiryDate' does not exist on type 'Document<unknown, {}, IPasswordResetToken, {}> & IPasswordResetToken & Required<{ _id: unknown; }> & { __v: number; }'.
```typescript
// קובץ: actions/password-reset-actions.ts
// שורה: 129
// שגיאה: Property 'expiryDate' does not exist on type 'Document<unknown, {}, IPasswordResetToken, {}> & IPasswordResetToken & Required<{ _id: unknown; }> & { __v: number; }'.
```

**שורה 139:19** - Property 'used' does not exist on type 'Document<unknown, {}, IPasswordResetToken, {}> & IPasswordResetToken & Required<{ _id: unknown; }> & { __v: number; }'.
```typescript
// קובץ: actions/password-reset-actions.ts
// שורה: 139
// שגיאה: Property 'used' does not exist on type 'Document<unknown, {}, IPasswordResetToken, {}> & IPasswordResetToken & Required<{ _id: unknown; }> & { __v: number; }'.
```

### 📁 actions/subscription-actions.ts

**שורה 68:25** - Property '_id' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: actions/subscription-actions.ts
// שורה: 68
// שגיאה: Property '_id' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

**שורה 69:33** - Property 'treatmentId' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: actions/subscription-actions.ts
// שורה: 69
// שגיאה: Property 'treatmentId' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

**שורה 70:25** - Property 'treatmentId' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: actions/subscription-actions.ts
// שורה: 70
// שגיאה: Property 'treatmentId' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

**שורה 71:27** - Property 'treatmentId' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: actions/subscription-actions.ts
// שורה: 71
// שגיאה: Property 'treatmentId' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

### 📁 app/api/bookings/create/route.ts

**שורה 230:50** - Property 'toObject' does not exist on type 'never'.
```typescript
// קובץ: app/api/bookings/create/route.ts
// שורה: 230
// שגיאה: Property 'toObject' does not exist on type 'never'.
```

### 📁 app/dashboard/(user)/(roles)/admin/user-subscriptions/actions.ts

**שורה 50:55** - Property '0' does not exist on type 'ITreatmentDuration[] | undefined'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/user-subscriptions/actions.ts
// שורה: 50
// שגיאה: Property '0' does not exist on type 'ITreatmentDuration[] | undefined'.
```

### 📁 app/dashboard/(user)/(roles)/admin/working-hours/actions.ts

**שורה 49:80** - Property '_id' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 49
// שגיאה: Property '_id' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

**שורה 53:18** - Property 'fixedHours' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 53
// שגיאה: Property 'fixedHours' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

**שורה 54:16** - Property 'fixedHours' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 54
// שגיאה: Property 'fixedHours' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

**שורה 60:21** - Property '_id' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 60
// שגיאה: Property '_id' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

**שורה 62:18** - Property 'specialDates' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 62
// שגיאה: Property 'specialDates' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

**שורה 68:18** - Property 'specialDateEvents' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 68
// שגיאה: Property 'specialDateEvents' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

**שורה 73:27** - Property 'createdAt' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 73
// שגיאה: Property 'createdAt' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

**שורה 74:27** - Property 'updatedAt' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 74
// שגיאה: Property 'updatedAt' does not exist on type '(FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })[] | (FlattenMaps<any> & Required<{ _id: unknown; }> & { __v: number; })'.
```

### 📁 app/dashboard/(user)/(roles)/member/subscriptions/page.tsx

**שורה 46:99** - Property 'pagination' does not exist on type '{ success: boolean; error: string; userSubscriptions: never[]; } | { success: boolean; userSubscriptions: any[]; error?: undefined; }'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/member/subscriptions/page.tsx
// שורה: 46
// שגיאה: Property 'pagination' does not exist on type '{ success: boolean; error: string; userSubscriptions: never[]; } | { success: boolean; userSubscriptions: any[]; error?: undefined; }'.
```

### 📁 components/booking/guest-booking-wizard.tsx

**שורה 469:25** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 469
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 482:51** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 482
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 517:22** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 517
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 522:23** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 522
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 523:23** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 523
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 544:53** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 544
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 545:45** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 545
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 588:20** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 588
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 589:20** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 589
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 598:49** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 598
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 607:33** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 607
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 723:23** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 723
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 724:23** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 724
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 735:55** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 735
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 736:47** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 736
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

### 📁 components/booking/steps/guest-scheduling-step.tsx

**שורה 85:27** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 85
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 85:57** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 85
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 86:22** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 86
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 86:50** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 86
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 130:25** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 130
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 131:64** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 131
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 132:22** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 132
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 148:25** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 148
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 150:47** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 150
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 155:22** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 155
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 221:31** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 221
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 222:100** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 222
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 228:30** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 228
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 264:52** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 264
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 305:33** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-scheduling-step.tsx
// שורה: 305
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

### 📁 components/booking/steps/guest-summary-step.tsx

**שורה 283:35** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-summary-step.tsx
// שורה: 283
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 283:81** - Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-summary-step.tsx
// שורה: 283
// שגיאה: Property 'bookingDate' does not exist on type 'Partial<SelectedBookingOptions>'.
```

**שורה 291:63** - Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```typescript
// קובץ: components/booking/steps/guest-summary-step.tsx
// שורה: 291
// שגיאה: Property 'bookingTime' does not exist on type 'Partial<SelectedBookingOptions>'.
```

### 📁 components/dashboard/admin/bookings/admin-bookings-columns.tsx

**שורה 656:16** - Property 'professionalGenderPreference' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 656
// שגיאה: Property 'professionalGenderPreference' does not exist on type 'PopulatedBooking'.
```

**שורה 658:25** - Property 'professionalGenderPreference' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 658
// שגיאה: Property 'professionalGenderPreference' does not exist on type 'PopulatedBooking'.
```

**שורה 667:33** - Property 'scheduledDate' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 667
// שגיאה: Property 'scheduledDate' does not exist on type 'PopulatedBooking'.
```

**שורה 667:72** - Property 'scheduledDate' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 667
// שגיאה: Property 'scheduledDate' does not exist on type 'PopulatedBooking'.
```

**שורה 668:33** - Property 'scheduledTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 668
// שגיאה: Property 'scheduledTime' does not exist on type 'PopulatedBooking'.
```

**שורה 668:72** - Property 'scheduledTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 668
// שגיאה: Property 'scheduledTime' does not exist on type 'PopulatedBooking'.
```

**שורה 1042:44** - Property 'scheduledDate' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 1042
// שגיאה: Property 'scheduledDate' does not exist on type 'PopulatedBooking'.
```

**שורה 1043:44** - Property 'scheduledDate' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 1043
// שגיאה: Property 'scheduledDate' does not exist on type 'PopulatedBooking'.
```

### 📁 components/dashboard/admin/bookings/booking-edit-page.tsx

**שורה 61:41** - Property 'startTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/booking-edit-page.tsx
// שורה: 61
// שגיאה: Property 'startTime' does not exist on type 'PopulatedBooking'.
```

**שורה 61:63** - Property 'startTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/booking-edit-page.tsx
// שורה: 61
// שגיאה: Property 'startTime' does not exist on type 'PopulatedBooking'.
```

**שורה 61:90** - Property 'startTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/booking-edit-page.tsx
// שורה: 61
// שגיאה: Property 'startTime' does not exist on type 'PopulatedBooking'.
```

**שורה 68:39** - Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/booking-edit-page.tsx
// שורה: 68
// שגיאה: Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```

**שורה 68:65** - Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/booking-edit-page.tsx
// שורה: 68
// שגיאה: Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```

**שורה 68:96** - Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/booking-edit-page.tsx
// שורה: 68
// שגיאה: Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```

### 📁 components/dashboard/admin/bookings/comprehensive-booking-edit-modal.tsx

**שורה 610:47** - Property 'professionals' does not exist on type '{}'.
```typescript
// קובץ: components/dashboard/admin/bookings/comprehensive-booking-edit-modal.tsx
// שורה: 610
// שגיאה: Property 'professionals' does not exist on type '{}'.
```

**שורה 672:47** - Property 'professionals' does not exist on type '{}'.
```typescript
// קובץ: components/dashboard/admin/bookings/comprehensive-booking-edit-modal.tsx
// שורה: 672
// שגיאה: Property 'professionals' does not exist on type '{}'.
```

**שורה 978:42** - Property 'adminNotes' does not exist on type 'Partial<PopulatedBooking>'.
```typescript
// קובץ: components/dashboard/admin/bookings/comprehensive-booking-edit-modal.tsx
// שורה: 978
// שגיאה: Property 'adminNotes' does not exist on type 'Partial<PopulatedBooking>'.
```

**שורה 978:64** - Property 'adminNotes' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/comprehensive-booking-edit-modal.tsx
// שורה: 978
// שגיאה: Property 'adminNotes' does not exist on type 'PopulatedBooking'.
```

### 📁 components/dashboard/admin/bookings/tabs/booking-address-tab.tsx

**שורה 108:42** - Property 'street' does not exist on type '{}'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 108
// שגיאה: Property 'street' does not exist on type '{}'.
```

**שורה 122:42** - Property 'buildingNumber' does not exist on type '{}'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 122
// שגיאה: Property 'buildingNumber' does not exist on type '{}'.
```

**שורה 127:53** - Property 'buildingNumber' does not exist on type 'IBookingAddressSnapshot'. Did you mean 'buildingName'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 127
// שגיאה: Property 'buildingNumber' does not exist on type 'IBookingAddressSnapshot'. Did you mean 'buildingName'?
```

**שורה 136:42** - Property 'city' does not exist on type '{}'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 136
// שגיאה: Property 'city' does not exist on type '{}'.
```

**שורה 150:42** - Property 'postalCode' does not exist on type '{}'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 150
// שגיאה: Property 'postalCode' does not exist on type '{}'.
```

**שורה 155:53** - Property 'postalCode' does not exist on type 'IBookingAddressSnapshot'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 155
// שגיאה: Property 'postalCode' does not exist on type 'IBookingAddressSnapshot'.
```

**שורה 164:42** - Property 'floor' does not exist on type '{}'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 164
// שגיאה: Property 'floor' does not exist on type '{}'.
```

**שורה 178:42** - Property 'apartment' does not exist on type '{}'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 178
// שגיאה: Property 'apartment' does not exist on type '{}'.
```

**שורה 194:29** - Property 'buildingNumber' does not exist on type 'IBookingAddressSnapshot'. Did you mean 'buildingName'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 194
// שגיאה: Property 'buildingNumber' does not exist on type 'IBookingAddressSnapshot'. Did you mean 'buildingName'?
```

**שורה 196:29** - Property 'postalCode' does not exist on type 'IBookingAddressSnapshot'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 196
// שגיאה: Property 'postalCode' does not exist on type 'IBookingAddressSnapshot'.
```

**שורה 242:36** - Property 'notes' does not exist on type '{}'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 242
// שגיאה: Property 'notes' does not exist on type '{}'.
```

**שורה 262:36** - Property 'otherInstructions' does not exist on type '{}'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 262
// שגיאה: Property 'otherInstructions' does not exist on type '{}'.
```

**שורה 281:17** - Property 'coordinates' does not exist on type 'IBookingAddressSnapshot'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 281
// שגיאה: Property 'coordinates' does not exist on type 'IBookingAddressSnapshot'.
```

**שורה 293:59** - Property 'coordinates' does not exist on type 'IBookingAddressSnapshot'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 293
// שגיאה: Property 'coordinates' does not exist on type 'IBookingAddressSnapshot'.
```

**שורה 297:59** - Property 'coordinates' does not exist on type 'IBookingAddressSnapshot'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 297
// שגיאה: Property 'coordinates' does not exist on type 'IBookingAddressSnapshot'.
```

### 📁 components/dashboard/admin/bookings/tabs/booking-customer-tab.tsx

**שורה 87:70** - Property 'name' does not exist on type 'ObjectId'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-customer-tab.tsx
// שורה: 87
// שגיאה: Property 'name' does not exist on type 'ObjectId'.
```

**שורה 105:71** - Property 'email' does not exist on type 'ObjectId'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-customer-tab.tsx
// שורה: 105
// שגיאה: Property 'email' does not exist on type 'ObjectId'.
```

**שורה 122:71** - Property 'phone' does not exist on type 'ObjectId'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-customer-tab.tsx
// שורה: 122
// שגיאה: Property 'phone' does not exist on type 'ObjectId'.
```

### 📁 components/dashboard/admin/bookings/tabs/booking-details-tab.tsx

**שורה 188:43** - Property 'startTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-details-tab.tsx
// שורה: 188
// שגיאה: Property 'startTime' does not exist on type 'PopulatedBooking'.
```

**שורה 201:54** - Property 'buildingNumber' does not exist on type 'IBookingAddressSnapshot'. Did you mean 'buildingName'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-details-tab.tsx
// שורה: 201
// שגיאה: Property 'buildingNumber' does not exist on type 'IBookingAddressSnapshot'. Did you mean 'buildingName'?
```

### 📁 components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx

**שורה 42:32** - Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 42
// שגיאה: Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```

**שורה 43:42** - Property 'professionalCommission' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 43
// שגיאה: Property 'professionalCommission' does not exist on type 'PopulatedBooking'.
```

**שורה 100:69** - Property 'basePrice' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 100
// שגיאה: Property 'basePrice' does not exist on type 'PopulatedBooking'.
```

**שורה 104:22** - Property 'transportFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 104
// שגיאה: Property 'transportFee' does not exist on type 'PopulatedBooking'.
```

**שורה 104:46** - Property 'transportFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 104
// שגיאה: Property 'transportFee' does not exist on type 'PopulatedBooking'.
```

**שורה 110:71** - Property 'transportFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 110
// שגיאה: Property 'transportFee' does not exist on type 'PopulatedBooking'.
```

**שורה 115:22** - Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 115
// שגיאה: Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```

**שורה 115:44** - Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 115
// שגיאה: Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```

**שורה 121:71** - Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 121
// שגיאה: Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```

**שורה 126:22** - Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 126
// שגיאה: Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 126:48** - Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 126
// שגיאה: Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 132:85** - Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 132
// שגיאה: Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 175:68** - Property 'commissionTier' does not exist on type 'Pick<IUser, "name" | "_id">'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 175
// שגיאה: Property 'commissionTier' does not exist on type 'Pick<IUser, "name" | "_id">'.
```

**שורה 196:39** - Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 196
// שגיאה: Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```

**שורה 197:26** - Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 197
// שגיאה: Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```

**שורה 203:39** - Property 'professionalPaymentStatus' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 203
// שגיאה: Property 'professionalPaymentStatus' does not exist on type 'PopulatedBooking'.
```

**שורה 204:26** - Property 'professionalPaymentStatus' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 204
// שגיאה: Property 'professionalPaymentStatus' does not exist on type 'PopulatedBooking'.
```

**שורה 208:22** - Property 'paymentDate' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 208
// שגיאה: Property 'paymentDate' does not exist on type 'PopulatedBooking'.
```

**שורה 211:60** - Property 'paymentDate' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 211
// שגיאה: Property 'paymentDate' does not exist on type 'PopulatedBooking'.
```

**שורה 215:22** - Property 'professionalPaymentDate' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 215
// שגיאה: Property 'professionalPaymentDate' does not exist on type 'PopulatedBooking'.
```

**שורה 218:60** - Property 'professionalPaymentDate' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 218
// שגיאה: Property 'professionalPaymentDate' does not exist on type 'PopulatedBooking'.
```

**שורה 224:20** - Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 224
// שגיאה: Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```

**שורה 224:56** - Property 'professionalPaymentStatus' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 224
// שגיאה: Property 'professionalPaymentStatus' does not exist on type 'PopulatedBooking'.
```

**שורה 262:22** - Property 'transportFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 262
// שגיאה: Property 'transportFee' does not exist on type 'PopulatedBooking'.
```

**שורה 262:46** - Property 'transportFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 262
// שגיאה: Property 'transportFee' does not exist on type 'PopulatedBooking'.
```

**שורה 266:43** - Property 'transportFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 266
// שגיאה: Property 'transportFee' does not exist on type 'PopulatedBooking'.
```

**שורה 271:22** - Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 271
// שגיאה: Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```

**שורה 271:44** - Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 271
// שגיאה: Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```

**שורה 275:43** - Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-financial-tab.tsx
// שורה: 275
// שגיאה: Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```

### 📁 components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx

**שורה 84:46** - Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 84
// שגיאה: Property 'paymentStatus' does not exist on type 'PopulatedBooking'.
```

**שורה 88:76** - Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 88
// שגיאה: Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```

**שורה 93:41** - Property 'paidAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 93
// שגיאה: Property 'paidAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 99:20** - Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 99
// שגיאה: Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```

**שורה 99:42** - Property 'paidAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 99
// שגיאה: Property 'paidAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 99:78** - Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 99
// שגיאה: Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```

**שורה 99:99** - Property 'paidAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 99
// שגיאה: Property 'paidAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 106:41** - Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 106
// שגיאה: Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```

**שורה 106:62** - Property 'paidAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 106
// שגיאה: Property 'paidAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 127:53** - Property 'paymentMethod' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 127
// שגיאה: Property 'paymentMethod' does not exist on type 'PopulatedBooking'.
```

**שורה 131:22** - Property 'paymentDate' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 131
// שגיאה: Property 'paymentDate' does not exist on type 'PopulatedBooking'.
```

**שורה 136:45** - Property 'paymentDate' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 136
// שגיאה: Property 'paymentDate' does not exist on type 'PopulatedBooking'.
```

**שורה 143:20** - Property 'paymentTransactionId' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 143
// שגיאה: Property 'paymentTransactionId' does not exist on type 'PopulatedBooking'.
```

**שורה 147:26** - Property 'paymentTransactionId' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 147
// שגיאה: Property 'paymentTransactionId' does not exist on type 'PopulatedBooking'.
```

**שורה 167:45** - Property 'basePrice' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 167
// שגיאה: Property 'basePrice' does not exist on type 'PopulatedBooking'.
```

**שורה 171:22** - Property 'transportFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 171
// שגיאה: Property 'transportFee' does not exist on type 'PopulatedBooking'.
```

**שורה 171:46** - Property 'transportFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 171
// שגיאה: Property 'transportFee' does not exist on type 'PopulatedBooking'.
```

**שורה 174:47** - Property 'transportFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 174
// שגיאה: Property 'transportFee' does not exist on type 'PopulatedBooking'.
```

**שורה 179:22** - Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 179
// שגיאה: Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```

**שורה 179:44** - Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 179
// שגיאה: Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```

**שורה 182:47** - Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 182
// שגיאה: Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```

**שורה 190:42** - Property 'basePrice' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 190
// שגיאה: Property 'basePrice' does not exist on type 'PopulatedBooking'.
```

**שורה 190:69** - Property 'transportFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 190
// שגיאה: Property 'transportFee' does not exist on type 'PopulatedBooking'.
```

**שורה 190:99** - Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 190
// שגיאה: Property 'serviceFee' does not exist on type 'PopulatedBooking'.
```

**שורה 195:22** - Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 195
// שגיאה: Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 195:48** - Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 195
// שגיאה: Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 201:48** - Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 201
// שגיאה: Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 208:75** - Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 208
// שגיאה: Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```

**שורה 215:17** - Property 'couponId' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 215
// שגיאה: Property 'couponId' does not exist on type 'PopulatedBooking'.
```

**שורה 215:37** - Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 215
// שגיאה: Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 224:22** - Property 'couponId' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 224
// שגיאה: Property 'couponId' does not exist on type 'PopulatedBooking'.
```

**שורה 230:39** - Property 'couponId' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 230
// שגיאה: Property 'couponId' does not exist on type 'PopulatedBooking'.
```

**שורה 231:35** - Property 'couponId' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 231
// שגיאה: Property 'couponId' does not exist on type 'PopulatedBooking'.
```

**שורה 239:33** - Property 'couponId' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 239
// שגיאה: Property 'couponId' does not exist on type 'PopulatedBooking'.
```

**שורה 239:66** - Property 'couponId' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 239
// שגיאה: Property 'couponId' does not exist on type 'PopulatedBooking'.
```

**שורה 241:30** - Property 'couponId' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 241
// שגיאה: Property 'couponId' does not exist on type 'PopulatedBooking'.
```

**שורה 247:22** - Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 247
// שגיאה: Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 247:48** - Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 247
// שגיאה: Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 251:44** - Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 251
// שגיאה: Property 'discountAmount' does not exist on type 'PopulatedBooking'.
```

**שורה 298:16** - Property 'paymentHistory' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 298
// שגיאה: Property 'paymentHistory' does not exist on type 'PopulatedBooking'.
```

**שורה 298:42** - Property 'paymentHistory' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 298
// שגיאה: Property 'paymentHistory' does not exist on type 'PopulatedBooking'.
```

**שורה 308:24** - Property 'paymentHistory' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 308
// שגיאה: Property 'paymentHistory' does not exist on type 'PopulatedBooking'.
```

**שורה 372:109** - Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 372
// שגיאה: Property 'totalPrice' does not exist on type 'PopulatedBooking'.
```

### 📁 components/dashboard/admin/bookings/tabs/booking-review-tab.tsx

**שורה 81:26** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 81
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 88:26** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 88
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 95:26** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 95
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 97:42** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 97
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 99:33** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 99
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 112:16** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 112
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 127:42** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 127
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 129:32** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 129
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 133:47** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 133
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 141:30** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 141
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 150:42** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 150
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 154:31** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 154
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 183:16** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 183
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 198:42** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 198
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 200:32** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 200
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 204:47** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 204
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 212:30** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 212
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 221:28** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 221
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 227:28** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 227
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 233:28** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 233
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 243:42** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 243
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 260:17** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 260
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 260:44** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 260
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 298:17** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 298
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 298:43** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 298
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 308:24** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 308
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 312:30** - Property 'endTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 312
// שגיאה: Property 'endTime' does not exist on type 'PopulatedBooking'.
```

**שורה 312:49** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 312
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 314:43** - Property 'customerReview' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 314
// שגיאה: Property 'customerReview' does not exist on type 'PopulatedBooking'.
```

**שורה 315:43** - Property 'endTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 315
// שגיאה: Property 'endTime' does not exist on type 'PopulatedBooking'.
```

**שורה 324:24** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 324
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 328:30** - Property 'endTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 328
// שגיאה: Property 'endTime' does not exist on type 'PopulatedBooking'.
```

**שורה 328:49** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 328
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 330:43** - Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 330
// שגיאה: Property 'professionalReview' does not exist on type 'PopulatedBooking'. Did you mean 'professionalId'?
```

**שורה 331:43** - Property 'endTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 331
// שגיאה: Property 'endTime' does not exist on type 'PopulatedBooking'.
```

### 📁 components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx

**שורה 64:18** - Property 'startTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 64
// שגיאה: Property 'startTime' does not exist on type 'PopulatedBooking'.
```

**שורה 64:40** - Property 'endTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 64
// שגיאה: Property 'endTime' does not exist on type 'PopulatedBooking'.
```

**שורה 65:36** - Property 'startTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 65
// שגיאה: Property 'startTime' does not exist on type 'PopulatedBooking'.
```

**שורה 66:34** - Property 'endTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 66
// שגיאה: Property 'endTime' does not exist on type 'PopulatedBooking'.
```

**שורה 92:20** - Property 'statusHistory' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 92
// שגיאה: Property 'statusHistory' does not exist on type 'PopulatedBooking'.
```

**שורה 92:45** - Property 'statusHistory' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 92
// שגיאה: Property 'statusHistory' does not exist on type 'PopulatedBooking'.
```

**שורה 96:26** - Property 'statusHistory' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 96
// שגיאה: Property 'statusHistory' does not exist on type 'PopulatedBooking'.
```

**שורה 124:43** - Property 'startTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 124
// שגיאה: Property 'startTime' does not exist on type 'PopulatedBooking'.
```

**שורה 132:43** - Property 'startTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 132
// שגיאה: Property 'startTime' does not exist on type 'PopulatedBooking'.
```

**שורה 140:43** - Property 'endTime' does not exist on type 'PopulatedBooking'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 140
// שגיאה: Property 'endTime' does not exist on type 'PopulatedBooking'.
```

**שורה 187:68** - Property 'phone' does not exist on type 'Pick<IUser, "name" | "_id">'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 187
// שגיאה: Property 'phone' does not exist on type 'Pick<IUser, "name" | "_id">'.
```

**שורה 191:68** - Property 'email' does not exist on type 'Pick<IUser, "name" | "_id">'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 191
// שגיאה: Property 'email' does not exist on type 'Pick<IUser, "name" | "_id">'.
```

**שורה 196:47** - Property 'specializations' does not exist on type 'Pick<IUser, "name" | "_id">'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 196
// שגיאה: Property 'specializations' does not exist on type 'Pick<IUser, "name" | "_id">'.
```

**שורה 202:47** - Property 'averageRating' does not exist on type 'Pick<IUser, "name" | "_id">'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 202
// שגיאה: Property 'averageRating' does not exist on type 'Pick<IUser, "name" | "_id">'.
```

**שורה 203:53** - Property 'averageRating' does not exist on type 'Pick<IUser, "name" | "_id">'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 203
// שגיאה: Property 'averageRating' does not exist on type 'Pick<IUser, "name" | "_id">'.
```

**שורה 243:95** - Property 'buildingNumber' does not exist on type 'IBookingAddressSnapshot'. Did you mean 'buildingName'?
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 243
// שגיאה: Property 'buildingNumber' does not exist on type 'IBookingAddressSnapshot'. Did you mean 'buildingName'?
```

**שורה 247:92** - Property 'postalCode' does not exist on type 'IBookingAddressSnapshot'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 247
// שגיאה: Property 'postalCode' does not exist on type 'IBookingAddressSnapshot'.
```

### 📁 components/dashboard/admin/coupons/coupons-client.tsx

**שורה 43:31** - Property 'currentPage' does not exist on type '{ success: boolean; coupons?: any[] | undefined; totalPages?: number | undefined; totalCoupons?: number | undefined; error?: string | undefined; }'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupons-client.tsx
// שורה: 43
// שגיאה: Property 'currentPage' does not exist on type '{ success: boolean; coupons?: any[] | undefined; totalPages?: number | undefined; totalCoupons?: number | undefined; error?: string | undefined; }'.
```

**שורה 168:33** - Property 'currentPage' does not exist on type '{ success: boolean; coupons?: any[] | undefined; totalPages?: number | undefined; totalCoupons?: number | undefined; error?: string | undefined; }'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupons-client.tsx
// שורה: 168
// שגיאה: Property 'currentPage' does not exist on type '{ success: boolean; coupons?: any[] | undefined; totalPages?: number | undefined; totalCoupons?: number | undefined; error?: string | undefined; }'.
```

### 📁 components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx

**שורה 105:95** - Property 'updatedCount' does not exist on type '{ success: boolean; error: string; details: { couponIds?: string[] | undefined; batchId?: string[] | undefined; updates?: string[] | undefined; }; message?: undefined; } | { success: boolean; message: string; error?: undefined; details?: undefined; } | { ...; }'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx
// שורה: 105
// שגיאה: Property 'updatedCount' does not exist on type '{ success: boolean; error: string; details: { couponIds?: string[] | undefined; batchId?: string[] | undefined; updates?: string[] | undefined; }; message?: undefined; } | { success: boolean; message: string; error?: undefined; details?: undefined; } | { ...; }'.
```

### 📁 components/dashboard/partner/coupons/assigned-coupons-client.tsx

**שורה 23:29** - Property 'totalPages' does not exist on type '{ success: boolean; coupons?: any[] | undefined; error?: string | undefined; }'.
```typescript
// קובץ: components/dashboard/partner/coupons/assigned-coupons-client.tsx
// שורה: 23
// שגיאה: Property 'totalPages' does not exist on type '{ success: boolean; coupons?: any[] | undefined; error?: string | undefined; }'.
```

**שורה 24:30** - Property 'currentPage' does not exist on type '{ success: boolean; coupons?: any[] | undefined; error?: string | undefined; }'.
```typescript
// קובץ: components/dashboard/partner/coupons/assigned-coupons-client.tsx
// שורה: 24
// שגיאה: Property 'currentPage' does not exist on type '{ success: boolean; coupons?: any[] | undefined; error?: string | undefined; }'.
```

**שורה 25:31** - Property 'totalCoupons' does not exist on type '{ success: boolean; coupons?: any[] | undefined; error?: string | undefined; }'.
```typescript
// קובץ: components/dashboard/partner/coupons/assigned-coupons-client.tsx
// שורה: 25
// שגיאה: Property 'totalCoupons' does not exist on type '{ success: boolean; coupons?: any[] | undefined; error?: string | undefined; }'.
```

### 📁 components/gift-vouchers/guest-gift-voucher-wizard.tsx

**שורה 44:45** - Property 'name' does not exist on type 'never'.
```typescript
// קובץ: components/gift-vouchers/guest-gift-voucher-wizard.tsx
// שורה: 44
// שגיאה: Property 'name' does not exist on type 'never'.
```

**שורה 48:28** - Property 'email' does not exist on type 'never'.
```typescript
// קובץ: components/gift-vouchers/guest-gift-voucher-wizard.tsx
// שורה: 48
// שגיאה: Property 'email' does not exist on type 'never'.
```

**שורה 49:28** - Property 'phone' does not exist on type 'never'.
```typescript
// קובץ: components/gift-vouchers/guest-gift-voucher-wizard.tsx
// שורה: 49
// שגיאה: Property 'phone' does not exist on type 'never'.
```

## 🔧 Undefined/Null Issues (34 שגיאות)

### 📁 actions/gift-voucher-actions.ts

**שורה 1019:9** - 'voucher.purchaserUserId' is possibly 'undefined'.
```typescript
// קובץ: actions/gift-voucher-actions.ts
// שורה: 1019
// שגיאה: 'voucher.purchaserUserId' is possibly 'undefined'.
```

**שורה 1205:9** - 'voucher.ownerUserId' is possibly 'undefined'.
```typescript
// קובץ: actions/gift-voucher-actions.ts
// שורה: 1205
// שגיאה: 'voucher.ownerUserId' is possibly 'undefined'.
```

### 📁 actions/purchase-summary-actions.ts

**שורה 299:52** - 'v.purchaserUserId' is possibly 'undefined'.
```typescript
// קובץ: actions/purchase-summary-actions.ts
// שורה: 299
// שגיאה: 'v.purchaserUserId' is possibly 'undefined'.
```

**שורה 334:54** - 'v.purchaserUserId' is possibly 'undefined'.
```typescript
// קובץ: actions/purchase-summary-actions.ts
// שורה: 334
// שגיאה: 'v.purchaserUserId' is possibly 'undefined'.
```

### 📁 actions/review-actions.ts

**שורה 45:9** - 'booking.userId' is possibly 'undefined'.
```typescript
// קובץ: actions/review-actions.ts
// שורה: 45
// שגיאה: 'booking.userId' is possibly 'undefined'.
```

### 📁 app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx

**שורה 371:16** - 'selectedSubscription.bonusQuantity' is possibly 'undefined'.
```typescript
// קובץ: app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx
// שורה: 371
// שגיאה: 'selectedSubscription.bonusQuantity' is possibly 'undefined'.
```

**שורה 373:22** - 'selectedSubscription' is possibly 'undefined'.
```typescript
// קובץ: app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx
// שורה: 373
// שגיאה: 'selectedSubscription' is possibly 'undefined'.
```

**שורה 472:18** - 'selectedSubscription.bonusQuantity' is possibly 'undefined'.
```typescript
// קובץ: app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx
// שורה: 472
// שגיאה: 'selectedSubscription.bonusQuantity' is possibly 'undefined'.
```

**שורה 475:29** - 'selectedSubscription' is possibly 'undefined'.
```typescript
// קובץ: app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx
// שורה: 475
// שגיאה: 'selectedSubscription' is possibly 'undefined'.
```

### 📁 app/dashboard/(user)/(roles)/admin/customers/actions.ts

**שורה 104:52** - 'v.purchaserUserId' is possibly 'undefined'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/customers/actions.ts
// שורה: 104
// שגיאה: 'v.purchaserUserId' is possibly 'undefined'.
```

**שורה 139:54** - 'v.purchaserUserId' is possibly 'undefined'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/customers/actions.ts
// שורה: 139
// שגיאה: 'v.purchaserUserId' is possibly 'undefined'.
```

### 📁 app/dashboard/(user)/(roles)/admin/working-hours/actions.ts

**שורה 49:71** - 'settings' is possibly 'null'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 49
// שגיאה: 'settings' is possibly 'null'.
```

**שורה 53:9** - 'settings' is possibly 'null'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 53
// שגיאה: 'settings' is possibly 'null'.
```

**שורה 54:7** - 'settings' is possibly 'null'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 54
// שגיאה: 'settings' is possibly 'null'.
```

**שורה 60:12** - 'settings' is possibly 'null'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 60
// שגיאה: 'settings' is possibly 'null'.
```

**שורה 62:9** - 'settings' is possibly 'null'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 62
// שגיאה: 'settings' is possibly 'null'.
```

**שורה 68:9** - 'settings' is possibly 'null'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 68
// שגיאה: 'settings' is possibly 'null'.
```

**שורה 73:18** - 'settings' is possibly 'null'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 73
// שגיאה: 'settings' is possibly 'null'.
```

**שורה 74:18** - 'settings' is possibly 'null'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 74
// שגיאה: 'settings' is possibly 'null'.
```

### 📁 components/booking/steps/guest-payment-step.tsx

**שורה 299:16** - 'calculatedPrice.couponDiscount' is possibly 'undefined'.
```typescript
// קובץ: components/booking/steps/guest-payment-step.tsx
// שורה: 299
// שגיאה: 'calculatedPrice.couponDiscount' is possibly 'undefined'.
```

### 📁 components/booking/steps/guest-summary-step.tsx

**שורה 378:16** - 'calculatedPrice.couponDiscount' is possibly 'undefined'.
```typescript
// קובץ: components/booking/steps/guest-summary-step.tsx
// שורה: 378
// שגיאה: 'calculatedPrice.couponDiscount' is possibly 'undefined'.
```

### 📁 components/booking/steps/guest-treatment-selection-step.tsx

**שורה 190:19** - 'result.redemption' is possibly 'undefined'.
```typescript
// קובץ: components/booking/steps/guest-treatment-selection-step.tsx
// שורה: 190
// שגיאה: 'result.redemption' is possibly 'undefined'.
```

**שורה 192:15** - 'result.redemption' is possibly 'undefined'.
```typescript
// קובץ: components/booking/steps/guest-treatment-selection-step.tsx
// שורה: 192
// שגיאה: 'result.redemption' is possibly 'undefined'.
```

**שורה 195:34** - 'result.redemption' is possibly 'undefined'.
```typescript
// קובץ: components/booking/steps/guest-treatment-selection-step.tsx
// שורה: 195
// שגיאה: 'result.redemption' is possibly 'undefined'.
```

**שורה 196:16** - 'result.redemption' is possibly 'undefined'.
```typescript
// קובץ: components/booking/steps/guest-treatment-selection-step.tsx
// שורה: 196
// שגיאה: 'result.redemption' is possibly 'undefined'.
```

**שורה 198:39** - 'result.redemption' is possibly 'undefined'.
```typescript
// קובץ: components/booking/steps/guest-treatment-selection-step.tsx
// שורה: 198
// שגיאה: 'result.redemption' is possibly 'undefined'.
```

**שורה 199:16** - 'result.redemption' is possibly 'undefined'.
```typescript
// קובץ: components/booking/steps/guest-treatment-selection-step.tsx
// שורה: 199
// שגיאה: 'result.redemption' is possibly 'undefined'.
```

**שורה 201:30** - 'result.redemption' is possibly 'undefined'.
```typescript
// קובץ: components/booking/steps/guest-treatment-selection-step.tsx
// שורה: 201
// שגיאה: 'result.redemption' is possibly 'undefined'.
```

### 📁 components/dashboard/admin/bookings/admin-bookings-client.tsx

**שורה 302:41** - 'data' is possibly 'undefined'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-client.tsx
// שורה: 302
// שגיאה: 'data' is possibly 'undefined'.
```

**שורה 309:45** - 'data' is possibly 'undefined'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-client.tsx
// שורה: 309
// שגיאה: 'data' is possibly 'undefined'.
```

**שורה 310:41** - 'data' is possibly 'undefined'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-client.tsx
// שורה: 310
// שגיאה: 'data' is possibly 'undefined'.
```

### 📁 components/dashboard/admin/bookings/booking-edit-page.tsx

**שורה 67:64** - 'updatedBooking.professionalId' is possibly 'null'.
```typescript
// קובץ: components/dashboard/admin/bookings/booking-edit-page.tsx
// שורה: 67
// שגיאה: 'updatedBooking.professionalId' is possibly 'null'.
```

### 📁 components/dashboard/admin/bookings/tabs/booking-review-tab.tsx

**שורה 249:25** - 'booking.professionalId' is possibly 'null'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-review-tab.tsx
// שורה: 249
// שגיאה: 'booking.professionalId' is possibly 'null'.
```

### 📁 components/dashboard/admin/user-subscriptions/create-user-subscription-form.tsx

**שורה 214:22** - 'selectedTreatment.durations' is possibly 'undefined'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/create-user-subscription-form.tsx
// שורה: 214
// שגיאה: 'selectedTreatment.durations' is possibly 'undefined'.
```

## 🔧 Translation Issues (3 שגיאות)

### 📁 components/dashboard/admin/coupons/coupons-client.tsx

**שורה 155:9** - Property '$TFunctionBrand' is missing in type '(key: string) => string' but required in type 'TFunction<"translation", undefined>'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupons-client.tsx
// שורה: 155
// שגיאה: Property '$TFunctionBrand' is missing in type '(key: string) => string' but required in type 'TFunction<"translation", undefined>'.
```

**שורה 189:15** - Property '$TFunctionBrand' is missing in type '(key: string) => string' but required in type 'TFunction<"translation", undefined>'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupons-client.tsx
// שורה: 189
// שגיאה: Property '$TFunctionBrand' is missing in type '(key: string) => string' but required in type 'TFunction<"translation", undefined>'.
```

### 📁 components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx

**שורה 169:77** - Property '$TFunctionBrand' is missing in type '(key: string) => string' but required in type 'TFunction<"translation", undefined>'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx
// שורה: 169
// שגיאה: Property '$TFunctionBrand' is missing in type '(key: string) => string' but required in type 'TFunction<"translation", undefined>'.
```

## 🔧 ObjectId/Unknown Issues (44 שגיאות)

### 📁 actions/gift-voucher-actions.ts

**שורה 1675:43** - 'existing._id' is of type 'unknown'.
```typescript
// קובץ: actions/gift-voucher-actions.ts
// שורה: 1675
// שגיאה: 'existing._id' is of type 'unknown'.
```

**שורה 1689:41** - 'purchase._id' is of type 'unknown'.
```typescript
// קובץ: actions/gift-voucher-actions.ts
// שורה: 1689
// שגיאה: 'purchase._id' is of type 'unknown'.
```

### 📁 actions/payment-method-actions.ts

**שורה 194:12** - 'pm._id' is of type 'unknown'.
```typescript
// קובץ: actions/payment-method-actions.ts
// שורה: 194
// שגיאה: 'pm._id' is of type 'unknown'.
```

### 📁 actions/review-actions.ts

**שורה 466:74** - 'booking._id' is of type 'unknown'.
```typescript
// קובץ: actions/review-actions.ts
// שורה: 466
// שגיאה: 'booking._id' is of type 'unknown'.
```

### 📁 actions/subscription-actions.ts

**שורה 30:12** - 'sub._id' is of type 'unknown'.
```typescript
// קובץ: actions/subscription-actions.ts
// שורה: 30
// שגיאה: 'sub._id' is of type 'unknown'.
```

### 📁 app/(orders)/purchase/subscription/actions.ts

**שורה 71:14** - 'sub._id' is of type 'unknown'.
```typescript
// קובץ: app/(orders)/purchase/subscription/actions.ts
// שורה: 71
// שגיאה: 'sub._id' is of type 'unknown'.
```

### 📁 app/api/admin/bookings/[bookingId]/route.ts

**שורה 43:16** - Conversion of type '{ _id: mongoose.FlattenMaps<unknown>; treatmentId: mongoose.Types.ObjectId; professionalId: mongoose.Types.ObjectId | null; userId: mongoose.Types.ObjectId | undefined; ... 107 more ...; __v: number; }' to type 'PopulatedBooking' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```typescript
// קובץ: app/api/admin/bookings/[bookingId]/route.ts
// שורה: 43
// שגיאה: Conversion of type '{ _id: mongoose.FlattenMaps<unknown>; treatmentId: mongoose.Types.ObjectId; professionalId: mongoose.Types.ObjectId | null; userId: mongoose.Types.ObjectId | undefined; ... 107 more ...; __v: number; }' to type 'PopulatedBooking' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```

### 📁 app/api/bookings/create/route.ts

**שורה 282:24** - 'finalBookingObject._id' is of type 'unknown'.
```typescript
// קובץ: app/api/bookings/create/route.ts
// שורה: 282
// שגיאה: 'finalBookingObject._id' is of type 'unknown'.
```

### 📁 app/dashboard/(user)/(roles)/admin/partners/actions.ts

**שורה 109:18** - Conversion of type 'ObjectId' to type 'IUser' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/partners/actions.ts
// שורה: 109
// שגיאה: Conversion of type 'ObjectId' to type 'IUser' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```

### 📁 app/dashboard/(user)/(roles)/admin/professional-management/actions.ts

**שורה 249:18** - Conversion of type 'ObjectId' to type 'IUser' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/professional-management/actions.ts
// שורה: 249
// שגיאה: Conversion of type 'ObjectId' to type 'IUser' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```

**שורה 637:21** - Conversion of type 'FlattenMaps<IProfessionalProfile> & Required<{ _id: ObjectId; }> & { __v: number; }' to type 'ProfessionalWithUser' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/professional-management/actions.ts
// שורה: 637
// שגיאה: Conversion of type 'FlattenMaps<IProfessionalProfile> & Required<{ _id: ObjectId; }> & { __v: number; }' to type 'ProfessionalWithUser' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```

**שורה 729:21** - Conversion of type 'FlattenMaps<IProfessionalProfile> & Required<{ _id: ObjectId; }> & { __v: number; }' to type 'ProfessionalWithUser' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/professional-management/actions.ts
// שורה: 729
// שגיאה: Conversion of type 'FlattenMaps<IProfessionalProfile> & Required<{ _id: ObjectId; }> & { __v: number; }' to type 'ProfessionalWithUser' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
```

### 📁 app/dashboard/(user)/(roles)/member/addresses/page.tsx

**שורה 108:31** - 'address._id' is of type 'unknown'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/member/addresses/page.tsx
// שורה: 108
// שגיאה: 'address._id' is of type 'unknown'.
```

### 📁 components/common/purchase/payment-method-selector.tsx

**שורה 57:18** - 'pm._id' is of type 'unknown'.
```typescript
// קובץ: components/common/purchase/payment-method-selector.tsx
// שורה: 57
// שגיאה: 'pm._id' is of type 'unknown'.
```

**שורה 61:53** - 'pm._id' is of type 'unknown'.
```typescript
// קובץ: components/common/purchase/payment-method-selector.tsx
// שורה: 61
// שגיאה: 'pm._id' is of type 'unknown'.
```

**שורה 62:50** - 'pm._id' is of type 'unknown'.
```typescript
// קובץ: components/common/purchase/payment-method-selector.tsx
// שורה: 62
// שגיאה: 'pm._id' is of type 'unknown'.
```

### 📁 components/dashboard/admin/bookings/create-steps/booking-create-treatment-step.tsx

**שורה 138:22** - 'categoryTreatments' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/bookings/create-steps/booking-create-treatment-step.tsx
// שורה: 138
// שגיאה: 'categoryTreatments' is of type 'unknown'.
```

### 📁 components/dashboard/admin/coupons/coupon-card.tsx

**שורה 62:39** - 'coupon._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupon-card.tsx
// שורה: 62
// שגיאה: 'coupon._id' is of type 'unknown'.
```

### 📁 components/dashboard/admin/coupons/coupons-client.tsx

**שורה 76:49** - 'c._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupons-client.tsx
// שורה: 76
// שגיאה: 'c._id' is of type 'unknown'.
```

**שורה 99:54** - 'editingCoupon._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupons-client.tsx
// שורה: 99
// שגיאה: 'editingCoupon._id' is of type 'unknown'.
```

**שורה 115:15** - 'c._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupons-client.tsx
// שורה: 115
// שגיאה: 'c._id' is of type 'unknown'.
```

**שורה 185:20** - 'coupon._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupons-client.tsx
// שורה: 185
// שגיאה: 'coupon._id' is of type 'unknown'.
```

### 📁 components/dashboard/admin/coupons/coupons-columns.tsx

**שורה 136:39** - 'coupon._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupons-columns.tsx
// שורה: 136
// שגיאה: 'coupon._id' is of type 'unknown'.
```

### 📁 components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx

**שורה 46:44** - 'batch._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx
// שורה: 46
// שגיאה: 'batch._id' is of type 'unknown'.
```

**שורה 87:43** - 'c._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx
// שורה: 87
// שגיאה: 'c._id' is of type 'unknown'.
```

**שורה 97:18** - 'batch._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx
// שורה: 97
// שגיאה: 'batch._id' is of type 'unknown'.
```

**שורה 139:45** - 'row.original._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx
// שורה: 139
// שגיאה: 'row.original._id' is of type 'unknown'.
```

**שורה 140:60** - 'row.original._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx
// שורה: 140
// שגיאה: 'row.original._id' is of type 'unknown'.
```

### 📁 components/dashboard/admin/partner-coupon-batches/partner-coupon-batches-columns.tsx

**שורה 153:39** - 'batch._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/partner-coupon-batches-columns.tsx
// שורה: 153
// שגיאה: 'batch._id' is of type 'unknown'.
```

### 📁 components/dashboard/admin/user-subscriptions/user-subscription-admin-card.tsx

**שורה 81:47** - 'userSubscription._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-admin-card.tsx
// שורה: 81
// שגיאה: 'userSubscription._id' is of type 'unknown'.
```

**שורה 99:51** - 'userSubscription._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-admin-card.tsx
// שורה: 99
// שגיאה: 'userSubscription._id' is of type 'unknown'.
```

### 📁 components/dashboard/admin/user-subscriptions/user-subscription-details-modal.tsx

**שורה 178:59** - 'userSubscription.subscriptionId._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-details-modal.tsx
// שורה: 178
// שגיאה: 'userSubscription.subscriptionId._id' is of type 'unknown'.
```

### 📁 components/dashboard/admin/user-subscriptions/user-subscription-row.tsx

**שורה 68:47** - 'userSubscription._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-row.tsx
// שורה: 68
// שגיאה: 'userSubscription._id' is of type 'unknown'.
```

**שורה 86:51** - 'userSubscription._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-row.tsx
// שורה: 86
// שגיאה: 'userSubscription._id' is of type 'unknown'.
```

**שורה 196:22** - 'userSubscription.subscriptionId._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-row.tsx
// שורה: 196
// שגיאה: 'userSubscription.subscriptionId._id' is of type 'unknown'.
```

### 📁 components/dashboard/member/addresses/address-card.tsx

**שורה 40:46** - 'address._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/member/addresses/address-card.tsx
// שורה: 40
// שגיאה: 'address._id' is of type 'unknown'.
```

**שורה 57:42** - 'address._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/member/addresses/address-card.tsx
// שורה: 57
// שגיאה: 'address._id' is of type 'unknown'.
```

### 📁 components/dashboard/member/addresses/address-form.tsx

**שורה 84:31** - 'address._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/member/addresses/address-form.tsx
// שורה: 84
// שגיאה: 'address._id' is of type 'unknown'.
```

### 📁 components/dashboard/member/subscriptions/user-subscription-card.tsx

**שורה 173:39** - 'userSubscription._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/member/subscriptions/user-subscription-card.tsx
// שורה: 173
// שגיאה: 'userSubscription._id' is of type 'unknown'.
```

### 📁 components/dashboard/partner/coupons/assigned-coupons-client.tsx

**שורה 45:36** - 'coupon._id' is of type 'unknown'.
```typescript
// קובץ: components/dashboard/partner/coupons/assigned-coupons-client.tsx
// שורה: 45
// שגיאה: 'coupon._id' is of type 'unknown'.
```

### 📁 components/gift-vouchers/guest-gift-voucher-wizard.tsx

**שורה 57:50** - 't._id' is of type 'unknown'.
```typescript
// קובץ: components/gift-vouchers/guest-gift-voucher-wizard.tsx
// שורה: 57
// שגיאה: 't._id' is of type 'unknown'.
```

### 📁 components/subscriptions/guest-subscription-selection-step.tsx

**שורה 38:18** - 'sub._id' is of type 'unknown'.
```typescript
// קובץ: components/subscriptions/guest-subscription-selection-step.tsx
// שורה: 38
// שגיאה: 'sub._id' is of type 'unknown'.
```

**שורה 39:81** - 'sub._id' is of type 'unknown'.
```typescript
// קובץ: components/subscriptions/guest-subscription-selection-step.tsx
// שורה: 39
// שגיאה: 'sub._id' is of type 'unknown'.
```

**שורה 40:37** - 'sub._id' is of type 'unknown'.
```typescript
// קובץ: components/subscriptions/guest-subscription-selection-step.tsx
// שורה: 40
// שגיאה: 'sub._id' is of type 'unknown'.
```

## 🔧 Property Missing (1 שגיאות)

### 📁 app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx

**שורה 435:16** - Property 'onPrev' is missing in type '{ calculatedPrice: CalculatedPriceDetails; guestInfo: any; setGuestInfo: Dispatch<any>; onConfirm: () => Promise<void>; isLoading: boolean; }' but required in type 'GuestPaymentStepProps'.
```typescript
// קובץ: app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx
// שורה: 435
// שגיאה: Property 'onPrev' is missing in type '{ calculatedPrice: CalculatedPriceDetails; guestInfo: any; setGuestInfo: Dispatch<any>; onConfirm: () => Promise<void>; isLoading: boolean; }' but required in type 'GuestPaymentStepProps'.
```

## 🔧 Interface Issues (7 שגיאות)

### 📁 actions/professional-booking-view-actions.ts

**שורה 14:18** - Interface 'BookingDetailsForProfessional' incorrectly extends interface 'Omit<IBooking, "userId" | "treatmentId" | "selectedDurationId" | "addressId" | "professionalId">'.
```typescript
// קובץ: actions/professional-booking-view-actions.ts
// שורה: 14
// שגיאה: Interface 'BookingDetailsForProfessional' incorrectly extends interface 'Omit<IBooking, "userId" | "treatmentId" | "selectedDurationId" | "addressId" | "professionalId">'.
```

### 📁 components/dashboard/admin/partner-management/partner-management.tsx

**שורה 17:11** - Interface 'Partner' incorrectly extends interface 'IPartnerProfile'.
```typescript
// קובץ: components/dashboard/admin/partner-management/partner-management.tsx
// שורה: 17
// שגיאה: Interface 'Partner' incorrectly extends interface 'IPartnerProfile'.
```

### 📁 components/dashboard/admin/partner-management/partner-profile-dialog.tsx

**שורה 20:11** - Interface 'PartnerData' incorrectly extends interface 'IPartnerProfile'.
```typescript
// קובץ: components/dashboard/admin/partner-management/partner-profile-dialog.tsx
// שורה: 20
// שגיאה: Interface 'PartnerData' incorrectly extends interface 'IPartnerProfile'.
```

### 📁 components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client.tsx

**שורה 26:11** - Interface 'PopulatedUserSubscription' incorrectly extends interface 'Omit<IUserSubscription, "userId">'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client.tsx
// שורה: 26
// שגיאה: Interface 'PopulatedUserSubscription' incorrectly extends interface 'Omit<IUserSubscription, "userId">'.
```

### 📁 components/dashboard/admin/user-subscriptions/user-subscription-admin-card.tsx

**שורה 43:11** - Interface 'PopulatedUserSubscription' incorrectly extends interface 'IUserSubscription'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-admin-card.tsx
// שורה: 43
// שגיאה: Interface 'PopulatedUserSubscription' incorrectly extends interface 'IUserSubscription'.
```

### 📁 components/dashboard/admin/user-subscriptions/user-subscription-details-modal.tsx

**שורה 25:11** - Interface 'PopulatedUserSubscription' incorrectly extends interface 'IUserSubscription'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-details-modal.tsx
// שורה: 25
// שגיאה: Interface 'PopulatedUserSubscription' incorrectly extends interface 'IUserSubscription'.
```

### 📁 components/dashboard/admin/user-subscriptions/user-subscription-row.tsx

**שורה 30:11** - Interface 'PopulatedUserSubscription' incorrectly extends interface 'IUserSubscription'.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-row.tsx
// שורה: 30
// שגיאה: Interface 'PopulatedUserSubscription' incorrectly extends interface 'IUserSubscription'.
```

## 🔧 Other (192 שגיאות)

### 📁 actions/admin-actions.ts

**שורה 322:7** - Cannot find name 'notificationData'. Did you mean 'Notification'?
```typescript
// קובץ: actions/admin-actions.ts
// שורה: 322
// שגיאה: Cannot find name 'notificationData'. Did you mean 'Notification'?
```

### 📁 actions/gift-voucher-actions.ts

**שורה 1291:24** - This comparison appears to be unintentional because the types '"partially_used" | "fully_used"' and '"active"' have no overlap.
```typescript
// קובץ: actions/gift-voucher-actions.ts
// שורה: 1291
// שגיאה: This comparison appears to be unintentional because the types '"partially_used" | "fully_used"' and '"active"' have no overlap.
```

**שורה 1291:94** - This comparison appears to be unintentional because the types '"fully_used"' and '"sent"' have no overlap.
```typescript
// קובץ: actions/gift-voucher-actions.ts
// שורה: 1291
// שגיאה: This comparison appears to be unintentional because the types '"fully_used"' and '"sent"' have no overlap.
```

**שורה 1294:44** - This comparison appears to be unintentional because the types '"partially_used"' and '"expired"' have no overlap.
```typescript
// קובץ: actions/gift-voucher-actions.ts
// שורה: 1294
// שגיאה: This comparison appears to be unintentional because the types '"partially_used"' and '"expired"' have no overlap.
```

### 📁 actions/notification-service.ts

**שורה 67:40** - Cannot find name 'validateEmail'.
```typescript
// קובץ: actions/notification-service.ts
// שורה: 67
// שגיאה: Cannot find name 'validateEmail'.
```

**שורה 70:40** - Cannot find name 'validatePhone'.
```typescript
// קובץ: actions/notification-service.ts
// שורה: 70
// שגיאה: Cannot find name 'validatePhone'.
```

### 📁 app/(orders)/bookings/treatment/guest-book-treatment-content.tsx

**שורה 10:50** - Cannot find module '@/actions/booking-actions' or its corresponding type declarations.
```typescript
// קובץ: app/(orders)/bookings/treatment/guest-book-treatment-content.tsx
// שורה: 10
// שגיאה: Cannot find module '@/actions/booking-actions' or its corresponding type declarations.
```

### 📁 app/(orders)/purchase/gift-voucher/simplified-gift-voucher-wizard.tsx

**שורה 15:116** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: app/(orders)/purchase/gift-voucher/simplified-gift-voucher-wizard.tsx
// שורה: 15
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

### 📁 app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx

**שורה 294:61** - Expected 1 arguments, but got 2.
```typescript
// קובץ: app/(orders)/purchase/subscription/simplified-subscription-wizard.tsx
// שורה: 294
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 app/api/bookings/initial-data/route.ts

**שורה 209:67** - Cannot find name 'userId'. Did you mean 'User'?
```typescript
// קובץ: app/api/bookings/initial-data/route.ts
// שורה: 209
// שגיאה: Cannot find name 'userId'. Did you mean 'User'?
```

### 📁 app/dashboard/(user)/(roles)/admin/bookings/page.tsx

**שורה 16:39** - Cannot find module '@/components/dashboard/admin/bookings/robust-bookings-client' or its corresponding type declarations.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/bookings/page.tsx
// שורה: 16
// שגיאה: Cannot find module '@/components/dashboard/admin/bookings/robust-bookings-client' or its corresponding type declarations.
```

### 📁 app/dashboard/(user)/(roles)/admin/reviews/actions.ts

**שורה 116:66** - An object literal cannot have multiple properties with the same name.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/reviews/actions.ts
// שורה: 116
// שגיאה: An object literal cannot have multiple properties with the same name.
```

**שורה 328:59** - An object literal cannot have multiple properties with the same name.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/reviews/actions.ts
// שורה: 328
// שגיאה: An object literal cannot have multiple properties with the same name.
```

### 📁 app/dashboard/(user)/(roles)/admin/user-subscriptions/actions.ts

**שורה 47:18** - 'User' refers to a value, but is being used as a type here. Did you mean 'typeof User'?
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/user-subscriptions/actions.ts
// שורה: 47
// שגיאה: 'User' refers to a value, but is being used as a type here. Did you mean 'typeof User'?
```

### 📁 app/dashboard/(user)/(roles)/admin/users/actions.ts

**שורה 243:29** - Cannot find name 'NotificationData'. Did you mean 'Notification'?
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/users/actions.ts
// שורה: 243
// שגיאה: Cannot find name 'NotificationData'. Did you mean 'Notification'?
```

### 📁 app/dashboard/(user)/(roles)/admin/working-hours/actions.ts

**שורה 54:33** - Parameter 'a' implicitly has an 'any' type.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 54
// שגיאה: Parameter 'a' implicitly has an 'any' type.
```

**שורה 54:36** - Parameter 'b' implicitly has an 'any' type.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 54
// שגיאה: Parameter 'b' implicitly has an 'any' type.
```

**שורה 62:37** - Parameter 'date' implicitly has an 'any' type.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 62
// שגיאה: Parameter 'date' implicitly has an 'any' type.
```

**שורה 68:42** - Parameter 'event' implicitly has an 'any' type.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 68
// שגיאה: Parameter 'event' implicitly has an 'any' type.
```

**שורה 71:34** - Parameter 'date' implicitly has an 'any' type.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 71
// שגיאה: Parameter 'date' implicitly has an 'any' type.
```

**שורה 101:52** - Cannot find name 'IFixedHours'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 101
// שגיאה: Cannot find name 'IFixedHours'.
```

**שורה 144:56** - Cannot find name 'ISpecialDate'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 144
// שגיאה: Cannot find name 'ISpecialDate'.
```

**שורה 178:66** - Cannot find name 'ISpecialDateEvent'.
```typescript
// קובץ: app/dashboard/(user)/(roles)/admin/working-hours/actions.ts
// שורה: 178
// שגיאה: Cannot find name 'ISpecialDateEvent'.
```

### 📁 app/dashboard/(user)/(roles)/member/addresses/page.tsx

**שורה 29:65** - Expected 1 arguments, but got 2.
```typescript
// קובץ: app/dashboard/(user)/(roles)/member/addresses/page.tsx
// שורה: 29
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 77:57** - Expected 1 arguments, but got 2.
```typescript
// קובץ: app/dashboard/(user)/(roles)/member/addresses/page.tsx
// שורה: 77
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 78:56** - Expected 1 arguments, but got 2.
```typescript
// קובץ: app/dashboard/(user)/(roles)/member/addresses/page.tsx
// שורה: 78
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 118:45** - Expected 1 arguments, but got 2.
```typescript
// קובץ: app/dashboard/(user)/(roles)/member/addresses/page.tsx
// שורה: 118
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 app/dashboard/(user)/(roles)/professional/booking-management/[bookingId]/page.tsx

**שורה 300:88** - Expected 1 arguments, but got 2.
```typescript
// קובץ: app/dashboard/(user)/(roles)/professional/booking-management/[bookingId]/page.tsx
// שורה: 300
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 app/our-treatments/[category]/[id]/page.tsx

**שורה 27:32** - Parameter 'd' implicitly has an 'any' type.
```typescript
// קובץ: app/our-treatments/[category]/[id]/page.tsx
// שורה: 27
// שגיאה: Parameter 'd' implicitly has an 'any' type.
```

### 📁 components/auth/login/login-form.tsx

**שורה 19:13** - Cannot find name 'ReactNode'.
```typescript
// קובץ: components/auth/login/login-form.tsx
// שורה: 19
// שגיאה: Cannot find name 'ReactNode'.
```

**שורה 28:37** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/login-form.tsx
// שורה: 28
// שגיאה: Cannot find name 'useState'.
```

**שורה 30:37** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/login-form.tsx
// שורה: 30
// שגיאה: Cannot find name 'useState'.
```

**שורה 31:29** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/login-form.tsx
// שורה: 31
// שגיאה: Cannot find name 'useState'.
```

**שורה 32:49** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/login-form.tsx
// שורה: 32
// שגיאה: Cannot find name 'useState'.
```

**שורה 33:49** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/login-form.tsx
// שורה: 33
// שגיאה: Cannot find name 'useState'.
```

**שורה 34:25** - Cannot find name 'useRef'.
```typescript
// קובץ: components/auth/login/login-form.tsx
// שורה: 34
// שגיאה: Cannot find name 'useRef'.
```

**שורה 37:29** - Cannot find name 'useSession'.
```typescript
// קובץ: components/auth/login/login-form.tsx
// שורה: 37
// שגיאה: Cannot find name 'useSession'.
```

**שורה 40:3** - Cannot find name 'useEffect'.
```typescript
// קובץ: components/auth/login/login-form.tsx
// שורה: 40
// שגיאה: Cannot find name 'useEffect'.
```

### 📁 components/auth/login/otp-form.tsx

**שורה 23:37** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 23
// שגיאה: Cannot find name 'useState'.
```

**שורה 24:43** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 24
// שגיאה: Cannot find name 'useState'.
```

**שורה 25:33** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 25
// שגיאה: Cannot find name 'useState'.
```

**שורה 26:55** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 26
// שגיאה: Cannot find name 'useState'.
```

**שורה 27:29** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 27
// שגיאה: Cannot find name 'useState'.
```

**שורה 28:33** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 28
// שגיאה: Cannot find name 'useState'.
```

**שורה 29:35** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 29
// שגיאה: Cannot find name 'useState'.
```

**שורה 30:53** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 30
// שגיאה: Cannot find name 'useState'.
```

**שורה 31:24** - Cannot find name 'useRef'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 31
// שגיאה: Cannot find name 'useRef'.
```

**שורה 34:29** - Cannot find name 'useSession'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 34
// שגיאה: Cannot find name 'useSession'.
```

**שורה 37:3** - Cannot find name 'useEffect'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 37
// שגיאה: Cannot find name 'useEffect'.
```

**שורה 44:3** - Cannot find name 'useEffect'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 44
// שגיאה: Cannot find name 'useEffect'.
```

**שורה 48:22** - Parameter 'prev' implicitly has an 'any' type.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 48
// שגיאה: Parameter 'prev' implicitly has an 'any' type.
```

**שורה 55:3** - Cannot find name 'useEffect'.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 55
// שגיאה: Cannot find name 'useEffect'.
```

**שורה 387:29** - Parameter 'digit' implicitly has an 'any' type.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 387
// שגיאה: Parameter 'digit' implicitly has an 'any' type.
```

**שורה 387:36** - Parameter 'index' implicitly has an 'any' type.
```typescript
// קובץ: components/auth/login/otp-form.tsx
// שורה: 387
// שגיאה: Parameter 'index' implicitly has an 'any' type.
```

### 📁 components/auth/protected-route.tsx

**שורה 19:3** - Cannot find name 'useEffect'.
```typescript
// קובץ: components/auth/protected-route.tsx
// שורה: 19
// שגיאה: Cannot find name 'useEffect'.
```

### 📁 components/auth/reset-password/reset-password-form.tsx

**שורה 22:37** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/reset-password/reset-password-form.tsx
// שורה: 22
// שגיאה: Cannot find name 'useState'.
```

**שורה 23:41** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/reset-password/reset-password-form.tsx
// שורה: 23
// שגיאה: Cannot find name 'useState'.
```

**שורה 24:29** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/reset-password/reset-password-form.tsx
// שורה: 24
// שגיאה: Cannot find name 'useState'.
```

**שורה 25:33** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/reset-password/reset-password-form.tsx
// שורה: 25
// שגיאה: Cannot find name 'useState'.
```

**שורה 26:39** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/reset-password/reset-password-form.tsx
// שורה: 26
// שגיאה: Cannot find name 'useState'.
```

**שורה 27:35** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/reset-password/reset-password-form.tsx
// שורה: 27
// שגיאה: Cannot find name 'useState'.
```

**שורה 28:49** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/reset-password/reset-password-form.tsx
// שורה: 28
// שגיאה: Cannot find name 'useState'.
```

**שורה 29:49** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/reset-password/reset-password-form.tsx
// שורה: 29
// שגיאה: Cannot find name 'useState'.
```

**שורה 30:63** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/reset-password/reset-password-form.tsx
// שורה: 30
// שגיאה: Cannot find name 'useState'.
```

**שורה 31:45** - Cannot find name 'useState'.
```typescript
// קובץ: components/auth/reset-password/reset-password-form.tsx
// שורה: 31
// שגיאה: Cannot find name 'useState'.
```

**שורה 35:3** - Cannot find name 'useEffect'.
```typescript
// קובץ: components/auth/reset-password/reset-password-form.tsx
// שורה: 35
// שגיאה: Cannot find name 'useEffect'.
```

### 📁 components/auth/role-protected-route.tsx

**שורה 20:3** - Cannot find name 'useEffect'.
```typescript
// קובץ: components/auth/role-protected-route.tsx
// שורה: 20
// שגיאה: Cannot find name 'useEffect'.
```

### 📁 components/booking/guest-booking-wizard.tsx

**שורה 77:15** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: components/booking/guest-booking-wizard.tsx
// שורה: 77
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

### 📁 components/booking/member-redemption-modal.tsx

**שורה 34:37** - Cannot find name 'IUserSubscription'. Did you mean 'PushSubscription'?
```typescript
// קובץ: components/booking/member-redemption-modal.tsx
// שורה: 34
// שגיאה: Cannot find name 'IUserSubscription'. Did you mean 'PushSubscription'?
```

**שורה 45:30** - Cannot find name 'IGiftVoucher'.
```typescript
// קובץ: components/booking/member-redemption-modal.tsx
// שורה: 45
// שגיאה: Cannot find name 'IGiftVoucher'.
```

### 📁 components/booking/steps/guest-treatment-selection-step.tsx

**שורה 14:33** - Cannot find module '@/lib/db/models' or its corresponding type declarations.
```typescript
// קובץ: components/booking/steps/guest-treatment-selection-step.tsx
// שורה: 14
// שגיאה: Cannot find module '@/lib/db/models' or its corresponding type declarations.
```

### 📁 components/common/modals/alert-modal.tsx

**שורה 29:37** - Cannot find name 'useState'.
```typescript
// קובץ: components/common/modals/alert-modal.tsx
// שורה: 29
// שגיאה: Cannot find name 'useState'.
```

**שורה 31:3** - Cannot find name 'useEffect'.
```typescript
// קובץ: components/common/modals/alert-modal.tsx
// שורה: 31
// שגיאה: Cannot find name 'useEffect'.
```

### 📁 components/common/providers/query-provider.tsx

**שורה 13:25** - Cannot find name 'useState'.
```typescript
// קובץ: components/common/providers/query-provider.tsx
// שורה: 13
// שגיאה: Cannot find name 'useState'.
```

### 📁 components/common/purchase/animated-container.tsx

**שורה 14:43** - Cannot find name 'useState'.
```typescript
// קובץ: components/common/purchase/animated-container.tsx
// שורה: 14
// שגיאה: Cannot find name 'useState'.
```

**שורה 15:47** - Cannot find name 'useState'.
```typescript
// קובץ: components/common/purchase/animated-container.tsx
// שורה: 15
// שגיאה: Cannot find name 'useState'.
```

**שורה 17:3** - Cannot find name 'useEffect'.
```typescript
// קובץ: components/common/purchase/animated-container.tsx
// שורה: 17
// שגיאה: Cannot find name 'useEffect'.
```

### 📁 components/common/ui/calendar.tsx

**שורה 325:40** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/common/ui/calendar.tsx
// שורה: 325
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 338:32** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/common/ui/calendar.tsx
// שורה: 338
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 350:36** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/common/ui/calendar.tsx
// שורה: 350
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/account/email-change-form.tsx

**שורה 20:37** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/email-change-form.tsx
// שורה: 20
// שגיאה: Cannot find name 'useState'.
```

**שורה 21:29** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/email-change-form.tsx
// שורה: 21
// שגיאה: Cannot find name 'useState'.
```

**שורה 22:33** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/email-change-form.tsx
// שורה: 22
// שגיאה: Cannot find name 'useState'.
```

**שורה 23:27** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/email-change-form.tsx
// שורה: 23
// שגיאה: Cannot find name 'useState'.
```

**שורה 24:35** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/email-change-form.tsx
// שורה: 24
// שגיאה: Cannot find name 'useState'.
```

**שורה 25:45** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/email-change-form.tsx
// שורה: 25
// שגיאה: Cannot find name 'useState'.
```

**שורה 26:33** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/email-change-form.tsx
// שורה: 26
// שגיאה: Cannot find name 'useState'.
```

**שורה 157:29** - Parameter 'digit' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/account/email-change-form.tsx
// שורה: 157
// שגיאה: Parameter 'digit' implicitly has an 'any' type.
```

**שורה 157:36** - Parameter 'index' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/account/email-change-form.tsx
// שורה: 157
// שגיאה: Parameter 'index' implicitly has an 'any' type.
```

### 📁 components/dashboard/account/password-change-form.tsx

**שורה 14:37** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/password-change-form.tsx
// שורה: 14
// שגיאה: Cannot find name 'useState'.
```

**שורה 15:29** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/password-change-form.tsx
// שורה: 15
// שגיאה: Cannot find name 'useState'.
```

**שורה 16:33** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/password-change-form.tsx
// שורה: 16
// שגיאה: Cannot find name 'useState'.
```

**שורה 17:45** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/password-change-form.tsx
// שורה: 17
// שגיאה: Cannot find name 'useState'.
```

**שורה 84:23** - Parameter 'prev' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/account/password-change-form.tsx
// שורה: 84
// שגיאה: Parameter 'prev' implicitly has an 'any' type.
```

### 📁 components/dashboard/account/phone-change-form.tsx

**שורה 22:37** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/phone-change-form.tsx
// שורה: 22
// שגיאה: Cannot find name 'useState'.
```

**שורה 23:29** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/phone-change-form.tsx
// שורה: 23
// שגיאה: Cannot find name 'useState'.
```

**שורה 24:33** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/phone-change-form.tsx
// שורה: 24
// שגיאה: Cannot find name 'useState'.
```

**שורה 25:27** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/phone-change-form.tsx
// שורה: 25
// שגיאה: Cannot find name 'useState'.
```

**שורה 26:35** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/phone-change-form.tsx
// שורה: 26
// שגיאה: Cannot find name 'useState'.
```

**שורה 27:45** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/phone-change-form.tsx
// שורה: 27
// שגיאה: Cannot find name 'useState'.
```

**שורה 28:33** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/account/phone-change-form.tsx
// שורה: 28
// שגיאה: Cannot find name 'useState'.
```

**שורה 166:29** - Parameter 'digit' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/account/phone-change-form.tsx
// שורה: 166
// שגיאה: Parameter 'digit' implicitly has an 'any' type.
```

**שורה 166:36** - Parameter 'index' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/account/phone-change-form.tsx
// שורה: 166
// שגיאה: Parameter 'index' implicitly has an 'any' type.
```

### 📁 components/dashboard/admin/bookings/admin-bookings-columns.tsx

**שורה 107:59** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 107
// שגיאה: Cannot find name 'useState'.
```

**שורה 108:41** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 108
// שגיאה: Cannot find name 'useState'.
```

**שורה 117:3** - Cannot find name 'useEffect'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 117
// שגיאה: Cannot find name 'useEffect'.
```

**שורה 209:47** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 209
// שגיאה: Cannot find name 'useState'.
```

**שורה 210:47** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 210
// שגיאה: Cannot find name 'useState'.
```

**שורה 211:49** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 211
// שגיאה: Cannot find name 'useState'.
```

**שורה 212:59** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 212
// שגיאה: Cannot find name 'useState'.
```

**שורה 213:55** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 213
// שגיאה: Cannot find name 'useState'.
```

**שורה 214:57** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 214
// שגיאה: Cannot find name 'useState'.
```

**שורה 215:49** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 215
// שגיאה: Cannot find name 'useState'.
```

**שורה 216:79** - Cannot find name 'useState'.
```typescript
// קובץ: components/dashboard/admin/bookings/admin-bookings-columns.tsx
// שורה: 216
// שגיאה: Cannot find name 'useState'.
```

### 📁 components/dashboard/admin/bookings/booking-edit-page.tsx

**שורה 132:20** - Element implicitly has an 'any' type because expression of type 'BookingStatus' can't be used to index type '{ pending_payment: { variant: "secondary"; text: string; }; in_process: { variant: "default"; text: string; }; confirmed: { variant: "default"; text: string; }; completed: { variant: "default"; text: string; }; cancelled: { ...; }; refunded: { ...; }; }'.
```typescript
// קובץ: components/dashboard/admin/bookings/booking-edit-page.tsx
// שורה: 132
// שגיאה: Element implicitly has an 'any' type because expression of type 'BookingStatus' can't be used to index type '{ pending_payment: { variant: "secondary"; text: string; }; in_process: { variant: "default"; text: string; }; confirmed: { variant: "default"; text: string; }; completed: { variant: "default"; text: string; }; cancelled: { ...; }; refunded: { ...; }; }'.
```

### 📁 components/dashboard/admin/bookings/comprehensive-booking-edit-modal.tsx

**שורה 30:94** - Cannot find module '@/actions/booking-actions' or its corresponding type declarations.
```typescript
// קובץ: components/dashboard/admin/bookings/comprehensive-booking-edit-modal.tsx
// שורה: 30
// שגיאה: Cannot find module '@/actions/booking-actions' or its corresponding type declarations.
```

**שורה 610:67** - Parameter 'prof' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/admin/bookings/comprehensive-booking-edit-modal.tsx
// שורה: 610
// שגיאה: Parameter 'prof' implicitly has an 'any' type.
```

**שורה 672:67** - Parameter 'prof' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/admin/bookings/comprehensive-booking-edit-modal.tsx
// שורה: 672
// שגיאה: Parameter 'prof' implicitly has an 'any' type.
```

### 📁 components/dashboard/admin/bookings/create-steps/booking-create-scheduling-step.tsx

**שורה 107:48** - No overload matches this call.
```typescript
// קובץ: components/dashboard/admin/bookings/create-steps/booking-create-scheduling-step.tsx
// שורה: 107
// שגיאה: No overload matches this call.
```

### 📁 components/dashboard/admin/bookings/create-steps/booking-create-treatment-step.tsx

**שורה 139:31** - Parameter 'treatment' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/admin/bookings/create-steps/booking-create-treatment-step.tsx
// שורה: 139
// שגיאה: Parameter 'treatment' implicitly has an 'any' type.
```

**שורה 140:29** - Parameter 'treatment' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/admin/bookings/create-steps/booking-create-treatment-step.tsx
// שורה: 140
// שגיאה: Parameter 'treatment' implicitly has an 'any' type.
```

### 📁 components/dashboard/admin/bookings/enhanced-booking-modal.tsx

**שורה 299:26** - Cannot find name 'Gift'.
```typescript
// קובץ: components/dashboard/admin/bookings/enhanced-booking-modal.tsx
// שורה: 299
// שגיאה: Cannot find name 'Gift'.
```

### 📁 components/dashboard/admin/bookings/tabs/booking-address-tab.tsx

**שורה 34:16** - Type '{}' is missing the following properties from type 'IBookingAddressSnapshot': fullAddress, city, street
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-address-tab.tsx
// שורה: 34
// שגיאה: Type '{}' is missing the following properties from type 'IBookingAddressSnapshot': fullAddress, city, street
```

### 📁 components/dashboard/admin/bookings/tabs/booking-details-tab.tsx

**שורה 53:12** - Element implicitly has an 'any' type because expression of type 'BookingStatus' can't be used to index type '{ pending_payment: string; in_process: string; confirmed: string; completed: string; cancelled: string; refunded: string; }'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-details-tab.tsx
// שורה: 53
// שגיאה: Element implicitly has an 'any' type because expression of type 'BookingStatus' can't be used to index type '{ pending_payment: string; in_process: string; confirmed: string; completed: string; cancelled: string; refunded: string; }'.
```

**שורה 65:12** - Element implicitly has an 'any' type because expression of type 'BookingStatus' can't be used to index type '{ pending_payment: "secondary"; in_process: "default"; confirmed: "default"; completed: "default"; cancelled: "destructive"; refunded: "destructive"; }'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-details-tab.tsx
// שורה: 65
// שגיאה: Element implicitly has an 'any' type because expression of type 'BookingStatus' can't be used to index type '{ pending_payment: "secondary"; in_process: "default"; confirmed: "default"; completed: "default"; cancelled: "destructive"; refunded: "destructive"; }'.
```

### 📁 components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx

**שורה 308:44** - Parameter 'payment' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 308
// שגיאה: Parameter 'payment' implicitly has an 'any' type.
```

**שורה 308:53** - Parameter 'index' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 308
// שגיאה: Parameter 'index' implicitly has an 'any' type.
```

**שורה 346:14** - Cannot find name 'AlertTriangle'.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-payment-tab.tsx
// שורה: 346
// שגיאה: Cannot find name 'AlertTriangle'.
```

### 📁 components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx

**שורה 96:45** - Parameter 'history' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 96
// שגיאה: Parameter 'history' implicitly has an 'any' type.
```

**שורה 96:54** - Parameter 'index' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/admin/bookings/tabs/booking-scheduling-tab.tsx
// שורה: 96
// שגיאה: Parameter 'index' implicitly has an 'any' type.
```

### 📁 components/dashboard/admin/coupons/coupon-form.tsx

**שורה 158:36** - Cannot find name 'formatDate'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupon-form.tsx
// שורה: 158
// שגיאה: Cannot find name 'formatDate'.
```

**שורה 192:36** - Cannot find name 'formatDate'.
```typescript
// קובץ: components/dashboard/admin/coupons/coupon-form.tsx
// שורה: 192
// שגיאה: Cannot find name 'formatDate'.
```

### 📁 components/dashboard/admin/coupons/coupons-client.tsx

**שורה 195:49** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/coupons/coupons-client.tsx
// שורה: 195
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 212:45** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/coupons/coupons-client.tsx
// שורה: 212
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/admin/gift-vouchers/admin-gift-voucher-details-modal.tsx

**שורה 35:15** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: components/dashboard/admin/gift-vouchers/admin-gift-voucher-details-modal.tsx
// שורה: 35
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

**שורה 251:56** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/gift-vouchers/admin-gift-voucher-details-modal.tsx
// שורה: 251
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/admin/gift-vouchers/gift-voucher-admin-card.tsx

**שורה 42:34** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: components/dashboard/admin/gift-vouchers/gift-voucher-admin-card.tsx
// שורה: 42
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

**שורה 302:50** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/gift-vouchers/gift-voucher-admin-card.tsx
// שורה: 302
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/admin/gift-vouchers/gift-voucher-form.tsx

**שורה 14:8** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: components/dashboard/admin/gift-vouchers/gift-voucher-form.tsx
// שורה: 14
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

### 📁 components/dashboard/admin/gift-vouchers/gift-voucher-row.tsx

**שורה 19:15** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: components/dashboard/admin/gift-vouchers/gift-voucher-row.tsx
// שורה: 19
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

### 📁 components/dashboard/admin/gift-vouchers/gift-vouchers-client.tsx

**שורה 33:51** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: components/dashboard/admin/gift-vouchers/gift-vouchers-client.tsx
// שורה: 33
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

**שורה 151:5** - Cannot find name 'setCurrentPage'.
```typescript
// קובץ: components/dashboard/admin/gift-vouchers/gift-vouchers-client.tsx
// שורה: 151
// שגיאה: Cannot find name 'setCurrentPage'.
```

### 📁 components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx

**שורה 105:79** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx
// שורה: 105
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 222:75** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/batch-coupons-modal.tsx
// שורה: 222
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/admin/partner-coupon-batches/partner-coupon-batch-form.tsx

**שורה 176:38** - Cannot find name 'formatDate'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/partner-coupon-batch-form.tsx
// שורה: 176
// שגיאה: Cannot find name 'formatDate'.
```

**שורה 207:38** - Cannot find name 'formatDate'.
```typescript
// קובץ: components/dashboard/admin/partner-coupon-batches/partner-coupon-batch-form.tsx
// שורה: 207
// שגיאה: Cannot find name 'formatDate'.
```

### 📁 components/dashboard/admin/reviews/admin-reviews-client.tsx

**שורה 186:45** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/reviews/admin-reviews-client.tsx
// שורה: 186
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 334:44** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/reviews/admin-reviews-client.tsx
// שורה: 334
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/admin/subscriptions/subscriptions-client.tsx

**שורה 272:15** - Type '{ id: string; interval: string; features: never[]; _id: string; name: string; description: string; quantity: number; bonusQuantity: number; validityMonths: number; isActive: boolean; createdAt?: string | undefined; updatedAt?: string | undefined; }' is missing the following properties from type 'Subscription': price, treatments
```typescript
// קובץ: components/dashboard/admin/subscriptions/subscriptions-client.tsx
// שורה: 272
// שגיאה: Type '{ id: string; interval: string; features: never[]; _id: string; name: string; description: string; quantity: number; bonusQuantity: number; validityMonths: number; isActive: boolean; createdAt?: string | undefined; updatedAt?: string | undefined; }' is missing the following properties from type 'Subscription': price, treatments
```

### 📁 components/dashboard/admin/treatments/treatment-card.tsx

**שורה 43:13** - Cannot find name 'toggleTreatmentStatus'.
```typescript
// קובץ: components/dashboard/admin/treatments/treatment-card.tsx
// שורה: 43
// שגיאה: Cannot find name 'toggleTreatmentStatus'.
```

**שורה 63:13** - Cannot find name 'duplicateTreatment'.
```typescript
// קובץ: components/dashboard/admin/treatments/treatment-card.tsx
// שורה: 63
// שגיאה: Cannot find name 'duplicateTreatment'.
```

### 📁 components/dashboard/admin/user-management/user-form-dialog.tsx

**שורה 220:68** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 220
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 221:72** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 221
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 222:70** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-form-dialog.tsx
// שורה: 222
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/admin/user-management/user-management.tsx

**שורה 154:10** - Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ admin: string; professional: string; member: string; partner: string; }'.
```typescript
// קובץ: components/dashboard/admin/user-management/user-management.tsx
// שורה: 154
// שגיאה: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ admin: string; professional: string; member: string; partner: string; }'.
```

**שורה 240:47** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-management.tsx
// שורה: 240
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 249:48** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-management.tsx
// שורה: 249
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 483:42** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-management.tsx
// שורה: 483
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 498:48** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-management.tsx
// שורה: 498
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 515:43** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-management.tsx
// שורה: 515
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 585:55** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-management.tsx
// שורה: 585
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 626:53** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-management.tsx
// שורה: 626
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 855:54** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-management.tsx
// שורה: 855
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 877:65** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-management.tsx
// שורה: 877
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 878:65** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-management/user-management.tsx
// שורה: 878
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client.tsx

**שורה 456:46** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client.tsx
// שורה: 456
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 491:57** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client.tsx
// שורה: 491
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/admin/user-subscriptions/user-subscription-admin-card.tsx

**שורה 308:64** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-admin-card.tsx
// שורה: 308
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 338:64** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-admin-card.tsx
// שורה: 338
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/admin/user-subscriptions/user-subscription-details-modal.tsx

**שורה 117:62** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-details-modal.tsx
// שורה: 117
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/admin/user-subscriptions/user-subscription-row.tsx

**שורה 235:56** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-row.tsx
// שורה: 235
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 367:64** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-row.tsx
// שורה: 367
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 397:64** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/admin/user-subscriptions/user-subscription-row.tsx
// שורה: 397
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/layout/sidebar.tsx

**שורה 330:9** - Object literal may only specify known properties, and 'section' does not exist in type '{ title: string; icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>; href: string; isActive: boolean; }'.
```typescript
// קובץ: components/dashboard/layout/sidebar.tsx
// שורה: 330
// שגיאה: Object literal may only specify known properties, and 'section' does not exist in type '{ title: string; icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>; href: string; isActive: boolean; }'.
```

### 📁 components/dashboard/member/addresses/address-form.tsx

**שורה 149:86** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/member/addresses/address-form.tsx
// שורה: 149
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/member/bookings/member-bookings-client.tsx

**שורה 266:46** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/member/bookings/member-bookings-client.tsx
// שורה: 266
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 332:46** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/member/bookings/member-bookings-client.tsx
// שורה: 332
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/member/gift-vouchers/member-gift-voucher-card.tsx

**שורה 8:15** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: components/dashboard/member/gift-vouchers/member-gift-voucher-card.tsx
// שורה: 8
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

**שורה 170:56** - Parameter 'usage' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/member/gift-vouchers/member-gift-voucher-card.tsx
// שורה: 170
// שגיאה: Parameter 'usage' implicitly has an 'any' type.
```

**שורה 170:63** - Parameter 'index' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/member/gift-vouchers/member-gift-voucher-card.tsx
// שורה: 170
// שגיאה: Parameter 'index' implicitly has an 'any' type.
```

### 📁 components/dashboard/member/gift-vouchers/member-gift-voucher-details-modal.tsx

**שורה 17:15** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: components/dashboard/member/gift-vouchers/member-gift-voucher-details-modal.tsx
// שורה: 17
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

**שורה 284:48** - Parameter 'item' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/member/gift-vouchers/member-gift-voucher-details-modal.tsx
// שורה: 284
// שגיאה: Parameter 'item' implicitly has an 'any' type.
```

**שורה 284:54** - Parameter 'index' implicitly has an 'any' type.
```typescript
// קובץ: components/dashboard/member/gift-vouchers/member-gift-voucher-details-modal.tsx
// שורה: 284
// שגיאה: Parameter 'index' implicitly has an 'any' type.
```

### 📁 components/dashboard/member/gift-vouchers/member-gift-vouchers-client.tsx

**שורה 17:8** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: components/dashboard/member/gift-vouchers/member-gift-vouchers-client.tsx
// שורה: 17
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

### 📁 components/dashboard/member/reviews/member-reviews-client.tsx

**שורה 226:44** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/member/reviews/member-reviews-client.tsx
// שורה: 226
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/partner/coupons/assigned-coupon-card.tsx

**שורה 64:81** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/partner/coupons/assigned-coupon-card.tsx
// שורה: 64
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 146:56** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/partner/coupons/assigned-coupon-card.tsx
// שורה: 146
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/dashboard/partner/coupons/assigned-coupons-client.tsx

**שורה 58:62** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/partner/coupons/assigned-coupons-client.tsx
// שורה: 58
// שגיאה: Expected 1 arguments, but got 2.
```

**שורה 72:52** - Expected 1 arguments, but got 2.
```typescript
// קובץ: components/dashboard/partner/coupons/assigned-coupons-client.tsx
// שורה: 72
// שגיאה: Expected 1 arguments, but got 2.
```

### 📁 components/gift-vouchers/guest-gift-voucher-confirmation.tsx

**שורה 7:15** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: components/gift-vouchers/guest-gift-voucher-confirmation.tsx
// שורה: 7
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

### 📁 components/gift-vouchers/guest-gift-voucher-wizard.tsx

**שורה 14:116** - Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```typescript
// קובץ: components/gift-vouchers/guest-gift-voucher-wizard.tsx
// שורה: 14
// שגיאה: Module '"@/actions/gift-voucher-actions"' declares 'GiftVoucherPlain' locally, but it is not exported.
```

### 📁 components/ui/calendar.tsx

**שורה 57:9** - Object literal may only specify known properties, and 'IconLeft' does not exist in type 'Partial<CustomComponents>'.
```typescript
// קובץ: components/ui/calendar.tsx
// שורה: 57
// שגיאה: Object literal may only specify known properties, and 'IconLeft' does not exist in type 'Partial<CustomComponents>'.
```


## 🏗️ ניתוח מודלים וטיפוסים

### 📦 מודלים (lib/db/models/):

#### address.ts
**Interfaces:** IAddress

#### booking.ts
**Interfaces:** IProfessionalShare, IPriceDetails, IPaymentDetails, IBookingAddressSnapshot, IBookingConsents, IEnhancedPaymentDetails, IBookingReview, IBooking
**Types:** BookingStatus

#### city-distance.ts
**Interfaces:** ICity, ICityDistance

#### city.ts
**Interfaces:** ICity

#### counter.ts
**Interfaces:** ICounter

#### coupon-usage.ts
**Interfaces:** ICouponUsage

#### coupon.ts
**Interfaces:** ICoupon

#### gift-voucher-purchase.ts
**Interfaces:** IGiftVoucherPurchase

#### gift-voucher.ts
**Interfaces:** GiftVoucherPlain, IGiftVoucher

#### partner-coupon-batch.ts
**Interfaces:** IPartnerCouponBatch

#### partner-profile.ts
**Interfaces:** IPartnerProfile

#### password-reset-token.ts
**Interfaces:** IPasswordResetToken

#### payment-method.ts
**Interfaces:** IPaymentMethod

#### professional-profile.ts
**Interfaces:** ITreatmentPricing, IWorkArea, IFinancialTransaction, IBankDetails, IProfessionalDocument, IProfessionalProfile, IProfessionalProfileModel
**Types:** ProfessionalStatus, DistanceRadius

#### professional-response.ts
**Interfaces:** IProfessionalResponse
**Types:** ProfessionalResponseStatus

#### review.ts
**Interfaces:** IReview

#### subscription-purchase.ts
**Interfaces:** ISubscriptionPurchase

#### subscription.ts
**Interfaces:** ISubscription

#### treatment.ts
**Interfaces:** ITreatmentDuration, ITreatment

#### user-subscription.ts
**Interfaces:** IUserSubscription

#### user.ts
**Interfaces:** ITreatmentPreferences, INotificationPreferences, IUser

#### verification-token.ts

#### working-hours.ts
**Interfaces:** IFixedHours, ISpecialDateEvent, ISpecialDate, IWorkingHoursSettings

### 🎯 טיפוסים (types/):

#### address.d.ts
**Interfaces:** IAddress

#### booking.d.ts
**Interfaces:** TimeSlot, IGiftVoucherUsageHistory, BookingGiftInfo, StaticPricingData, CalculatedPriceDetails, PopulatedPriceDetails, PopulatedPaymentDetails, PopulatedBookingTreatment, PopulatedBooking, PopulatedUserSubscription, BookingInitialData, RedemptionCode, SelectedBookingOptions

#### next-auth.d.ts

#### notifications.d.ts
**Interfaces:** NotificationData

#### review.d.ts
**Interfaces:** PopulatedReview, CreateReviewData, UpdateReviewData, ReviewFilters


## 🎯 תוכנית פעולה מומלצת

### 1️⃣ תיקון שגיאות קריטיות (עדיפות גבוהה)
- **Schema/Model Issues:** תיקון מודלים שלא תואמים לשימוש
- **Type Mismatches:** יישור טיפוסים בין קבצים שונים
- **ObjectId/Unknown Issues:** תיקון בעיות עם MongoDB ObjectId

### 2️⃣ תיקון שגיאות פונקציונליות (עדיפות בינונית)
- **Undefined/Null Issues:** הוספת בדיקות null/undefined
- **Property Missing:** הוספת properties חסרות למודלים
- **Interface Issues:** תיקון הרחבות interface

### 3️⃣ תיקון שגיאות UI (עדיפות נמוכה)
- **Translation Issues:** תיקון קריאות פונקציות translation
- **Other:** שגיאות נוספות

### 📝 הנחיות כלליות:
1. **תמיד בדוק את המודל המקורי** לפני שינוי טיפוסים
2. **השתמש ב-optional chaining (?.)** עבור properties שעלולות להיות undefined
3. **וודא ייבוא נכון** של כל הטיפוסים והמודלים
4. **בדוק עקביות** בין קבצים שונים שמשתמשים באותם טיפוסים
5. **השתמש ב-TypeScript strict mode** כדי למנוע שגיאות עתידיות

