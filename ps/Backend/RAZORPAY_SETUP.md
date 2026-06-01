# Razorpay Integration Setup Guide

## 1. Get Razorpay Credentials

1. Sign up at https://razorpay.com/
2. Go to Dashboard → Settings → API Keys
3. Generate Test/Live API Keys
4. Copy Key ID and Key Secret

## 2. Update Environment Variables

Update your `.env` file with actual Razorpay credentials:

```env
RAZORPAY_KEY_ID=rzp_test_your_actual_key_id
RAZORPAY_KEY_SECRET=your_actual_key_secret
```

## 3. Update Frontend Razorpay Key

In `payment-modal.component.ts`, update line with your actual Key ID:
```typescript
key: 'rzp_test_your_key_id', // Replace with your actual Razorpay key ID
```

## 4. Test Payment Flow

1. Start backend: `npm start`
2. Start frontend: `ng serve`
3. Create parking entry
4. Exit vehicle to trigger payment
5. Select "Razorpay" payment method
6. Complete test payment

## 5. Payment Methods Available

- **Razorpay**: Online payment gateway (UPI, Cards, Net Banking, Wallets)
- **Cash**: Manual cash payment recording

## 6. Features Implemented

- ✅ Razorpay order creation
- ✅ Payment verification with signature
- ✅ Secure payment processing
- ✅ Receipt generation after payment
- ✅ Payment status tracking
- ✅ Error handling and user feedback