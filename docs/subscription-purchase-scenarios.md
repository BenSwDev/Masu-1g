# Guest Subscription Purchase Flow

The guest subscription purchase wizard guides a visitor through several steps:

1. **Guest info** – collects personal details and creates a guest user. This step mirrors the first step of the treatment booking flow.
2. **Subscription selection** – identical to step 2 of the treatment booking flow. The user chooses from the active subscriptions.
3. **Treatment selection** – reuses the guest treatment step but hides therapist gender preference. Guests select a treatment and, if needed, a duration.
4. **Summary** – shows chosen subscription, treatment details and guest information. No coupon entry is shown.
5. **Payment** – identical to the payment step of treatment booking.

Progress is saved in a `SubscriptionPurchase` document as soon as the guest account is created so abandoned purchases can be recovered. Address and scheduling steps are omitted for subscriptions.
