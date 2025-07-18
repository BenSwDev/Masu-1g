# CARDCOM MongoDB & shadcn Examples
# דוגמאות קוד מלאות - MongoDB + shadcn/ui

## 1. **MongoDB Connection & Models**

### קובץ חיבור למונגו
```typescript
// lib/mongodb.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
```

**כל הקוד מותאם למונגו DB ו-shadcn/ui ומוכן לשימוש!**
