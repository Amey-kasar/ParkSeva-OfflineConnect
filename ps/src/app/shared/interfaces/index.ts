export interface User {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  createdAt: Date;
}

export interface Vehicle {
  _id: string;
  vehicleNumber: string;
  vehicleType: 'car' | 'bike' | 'truck';
  userId: string;
  createdAt: Date;
}

export interface ParkingSlot {
  _id: string;
  slotNumber: string;
  isOccupied: boolean;
  vehicleType: 'car' | 'bike' | 'truck';
  createdAt: Date;
}

export interface Payment {
  _id: string;
  vehicleNumber: string;
  paymentMethod: 'cash' | 'razorpay' | 'wallet';
  transactionId?: string;
  amountPaid: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentDate: Date;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}
