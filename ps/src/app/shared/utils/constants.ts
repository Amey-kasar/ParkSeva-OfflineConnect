export const API_ENDPOINTS = {
  USERS: '/api/users',
  VEHICLES: '/api/vehicles',
  PARKING_SLOTS: '/api/parking-slots',
  PARKING_ENTRIES: '/api/parking-entries',
  PAYMENTS: '/api/payments',
  RECEIPTS: '/api/receipts',
  HISTORY: '/api/parking-history'
};

export const VEHICLE_TYPES = [
  { value: 'car', label: 'Car' },
  { value: 'bike', label: 'Bike' },
  { value: 'truck', label: 'Truck' }
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'razorpay', label: 'Razorpay / UPI' },
  { value: 'wallet', label: 'Wallet' }
];

export const TOAST_DURATION = {
  SHORT: 3000,
  MEDIUM: 4000,
  LONG: 6000
};
