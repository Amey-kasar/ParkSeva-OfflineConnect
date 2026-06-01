import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  // Auth
  register(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/register`, userData);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/login`, credentials);
  }

  openGate() {
    return this.http.post('http://localhost:5001/exit', {});
  }

  openGateE() {
    return this.http.post('http://localhost:5001/open', {});
  }
  openGateD() {
    return this.http.post('http://localhost:5001/DETECT', {});
  }
  // Users
  getUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/users`, { headers: this.getAuthHeaders() });
  }

  createUser(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/users`, userData, { headers: this.getAuthHeaders() });
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/${userId}`, { headers: this.getAuthHeaders() });
  }

  // Vehicles
  getVehicles(): Observable<any> {
    return this.http.get(`${this.baseUrl}/vehicles`, { headers: this.getAuthHeaders() });
  }

  createVehicle(vehicleData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/vehicles`, vehicleData, { headers: this.getAuthHeaders() });
  }

  deleteVehicle(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/vehicles/${id}`, { headers: this.getAuthHeaders() });
  }

  // Parking Slots (Admin-specific)
  getParkingSlots(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-parking-slots`, { headers: this.getAuthHeaders() });
  }

  getAvailableSlots(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-parking-slots/available`, { headers: this.getAuthHeaders() });
  }

  createParkingSlot(slotData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin-parking-slots`, slotData, { headers: this.getAuthHeaders() });
  }

  updateParkingSlot(id: string, slotData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin-parking-slots/${id}`, slotData, { headers: this.getAuthHeaders() });
  }

  deleteParkingSlot(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin-parking-slots/${id}`, { headers: this.getAuthHeaders() });
  }

  // Parking Entries (Admin-specific)
  parkVehicle(parkData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin-parking-entries/park`, parkData, { headers: this.getAuthHeaders() });
  }

  exitVehicle(entryId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin-parking-entries/exit/${entryId}`, {}, { headers: this.getAuthHeaders() });
  }

  exitVehicleByNumber(vehicleNumber: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin-parking-entries/exit-by-vehicle`, { vehicleNumber }, { headers: this.getAuthHeaders() });
  }

  getActiveEntries(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-parking-entries/active`, { headers: this.getAuthHeaders() });
  }

  getAllEntries(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-parking-entries`, { headers: this.getAuthHeaders() });
  }

  checkVehicleInRecentEntries(vehicleNumber: string, recentWindow: number = 50): Observable<{ exists: boolean; entry: any | null }> {
    const normalizedPlate = (vehicleNumber || '').replace(/[^A-Z0-9]/ig, '').toUpperCase();

    return this.getAllEntries().pipe(
      map((entries: any[]) => {
        const recentEntries = Array.isArray(entries) ? entries.slice(0, recentWindow) : [];
        const matchedEntry = recentEntries.find((entry: any) => {
          const current = (entry?.vehicleNumber || '').replace(/[^A-Z0-9]/ig, '').toUpperCase();
          return current === normalizedPlate;
        });

        return {
          exists: !!matchedEntry,
          entry: matchedEntry || null
        };
      })
    );
  }

  // Payments (Admin-specific)
  getPayments(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-payments`, { headers: this.getAuthHeaders() });
  }

  createPayment(paymentData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin-payments`, paymentData, { headers: this.getAuthHeaders() });
  }

  createUserPayment(paymentData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/payments`, paymentData, { headers: this.getAuthHeaders() });
  }

  createRazorpayOrder(orderData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/payments/create-order`, orderData, { headers: this.getAuthHeaders() });
  }

  verifyRazorpayPayment(paymentData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/payments/verify`, paymentData, { headers: this.getAuthHeaders() });
  }

  payWithWallet(paymentData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/payments/wallet`, paymentData, { headers: this.getAuthHeaders() });
  }

  getWalletBalance(): Observable<any> {
    return this.http.get(`${this.baseUrl}/users/wallet/balance`, { headers: this.getAuthHeaders() });
  }

  addWalletFunds(amount: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/wallet/add-funds`, { amount }, { headers: this.getAuthHeaders() });
  }

  // Receipts
  generateReceipt(receiptData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/receipts/generate`, receiptData, { headers: this.getAuthHeaders() });
  }

  // Parking History
  getParkingHistory(): Observable<any> {
    return this.http.get(`${this.baseUrl}/parking-history`, { headers: this.getAuthHeaders() });
  }

  getUserHistory(userId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/parking-history/user/${userId}`, { headers: this.getAuthHeaders() });
  }

  // Admin Locations
  getAllLocations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-locations/all`);
  }

  getAdminLocation(adminId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin-locations/${adminId}`, { headers: this.getAuthHeaders() });
  }

  createAdminLocation(locationData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin-locations`, locationData, { headers: this.getAuthHeaders() });
  }

  updateAdminLocation(adminId: string, locationData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin-locations/${adminId}`, locationData, { headers: this.getAuthHeaders() });
  }



  // Generic HTTP methods
  get(endpoint: string): Observable<any> {
    return this.http.get(`${this.baseUrl}${endpoint}`, { headers: this.getAuthHeaders() });
  }

  post(endpoint: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}${endpoint}`, data, { headers: this.getAuthHeaders() });
  }

  put(endpoint: string, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}${endpoint}`, data, { headers: this.getAuthHeaders() });
  }

  delete(endpoint: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}${endpoint}`, { headers: this.getAuthHeaders() });
  }
}
