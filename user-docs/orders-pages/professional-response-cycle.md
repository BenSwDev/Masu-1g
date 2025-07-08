sequenceDiagram
    participant B as Booking
    participant P1 as Professional 1
    participant P2 as Professional 2
    participant P3 as Professional 3
    participant DB as Database

    B->>DB: Create booking (status: pending_professional)
    DB->>P1: Send notification + create Response1 (pending)
    DB->>P2: Send notification + create Response2 (pending)  
    DB->>P3: Send notification + create Response3 (pending)
    
    Note over P1: All professionals see the booking

    P1->>DB: Click "Accept" (start transaction)
    P2->>DB: Click "Accept" (start transaction)
    
    DB->>P1: Check: booking.professionalId is null? ✓
    DB->>P2: Check: booking.professionalId is null? ✓
    
    DB->>P1: Check: response1.status is pending? ✓
    DB->>P2: Check: response2.status is pending? ✓
    
    Note over DB: First transaction wins
    
    DB->>P1: Update booking.professionalId = P1
    DB->>P1: Update response1.status = "accepted"
    DB->>P1: Update response2,3.status = "expired"
    DB->>P1: Commit transaction ✓
    
    DB->>P2: Check: booking.professionalId is null? ✗ (now P1)
    DB->>P2: Abort transaction - "ההזמנה כבר נתפסה"
    
    P1->>P1: Success! Booking assigned
    P2->>P2: Error: "ההזמנה כבר נתפסה על ידי מטפל אחר"
    
    Note over P3: If P3 tries later, also gets "already taken" error