// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// Vehicle Types
const VEHICLE_TYPES = {
  CAR: 'car',
  BIKE: 'bike',
  TRUCK: 'truck'
};

// Payment Methods
const PAYMENT_METHODS = {
  CASH: 'cash',
  ONLINE: 'online'
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Parking Rates (per hour)
const PARKING_RATES = {
  [VEHICLE_TYPES.CAR]: 20,
  [VEHICLE_TYPES.BIKE]: 10,
  [VEHICLE_TYPES.TRUCK]: 50
};

// Error Messages
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  USER_NOT_FOUND: 'User not found',
  VEHICLE_NOT_FOUND: 'Vehicle not found',
  SLOT_NOT_AVAILABLE: 'Parking slot not available',
  PAYMENT_FAILED: 'Payment processing failed',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  VALIDATION_ERROR: 'Validation error'
};

// Success Messages
const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully',
  LOGIN_SUCCESS: 'Login successful',
  VEHICLE_PARKED: 'Vehicle parked successfully',
  VEHICLE_EXITED: 'Vehicle exited successfully',
  PAYMENT_SUCCESS: 'Payment completed successfully'
};

module.exports = {
  HTTP_STATUS,
  VEHICLE_TYPES,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  PARKING_RATES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};