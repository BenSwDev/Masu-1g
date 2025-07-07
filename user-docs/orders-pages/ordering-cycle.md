graph TD
    A[הזמנה חדשה] --> B[pending_payment]
    B --> |תשלום בוצע| C[pending_professional]
    C --> |התראה למטפלים| D[ממתין לתגובת מטפלים]
    D --> |מטפל מאשר| E[confirmed - מאושר]
    D --> |מנהל משייך| E
    E --> |מטפל יוצא| F[on_way - בדרך]
    F --> |מטפל מסיים| G[completed - הושלם]
    G --> |התראה ללקוח| H[pending_review - ממתין לחוות דעת]
    H --> |לקוח מגיב| I[reviewed - נסקר]
    H --> |תזכורת מנהל| J[review_reminder_sent]
    J --> |לקוח מגיב| I
    
    D --> |כל המטפלים דחו| K[no_professionals_available]
    K --> |מנהל מחפש אחרים| C
    
    B --> |ביטול| L[cancelled]
    C --> |ביטול| M[refunded]
    E --> |ביטול| M
    F --> |ביטול| M