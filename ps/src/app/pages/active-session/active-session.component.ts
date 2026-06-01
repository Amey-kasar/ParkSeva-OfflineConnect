import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { PaymentModalComponent } from '../../components/payment-modal/payment-modal.component';
import { QrScannerComponent } from '../../components/qr-scanner/qr-scanner.component';

@Component({
  selector: 'app-active-session',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentModalComponent, QrScannerComponent],
  templateUrl: './active-session.component.html',
  styleUrls: ['./active-session.component.css']
})
export class ActiveSessionComponent implements OnInit {
  parkData = { vehicleNumber: '', vehicleType: 'car' };
  exitData = { vehicleNumber: '' };
  useScanner = false;

  parkingSlots: any[] = [];
  activeEntries: any[] = [];
  showPaymentModal = false;
  paymentData: any = {};
  showParkModal = false;
  showCheckoutModal = false;
  isProcessing = false;

  scannerEnabled = false;

  constructor(private apiService: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.loadParkingData();
  }

  onQuickSelectVehicle(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedVehicleNumber = target.value;
    if (selectedVehicleNumber) {
      this.exitData.vehicleNumber = selectedVehicleNumber;
    }
  }

  onVehicleScanned(vehicleNumber: string) {
    console.log('Vehicle scanned:', vehicleNumber);
    if (vehicleNumber) {
      this.exitData.vehicleNumber = vehicleNumber.trim();
      this.useScanner = false;
      this.exitVehicleByVehicleNumber();
    }
  }

  parkVehicle() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user._id) {
      this.toast.warning('Please login to park a vehicle');
      return;
    }

    const parkingData = { ...this.parkData, userId: user._id };
    this.apiService.parkVehicle(parkingData).subscribe({
      next: () => {
        this.toast.success('Vehicle parked successfully!');
        this.parkData = { vehicleNumber: '', vehicleType: 'car' };
        this.loadParkingData();
      },
      error: (error: any) => {
        console.error('Error parking vehicle:', error);
        this.toast.error('Error parking vehicle. Please check slots.');
      }
    });
  }

  exitVehicleByVehicleNumber() {
    if (!this.exitData.vehicleNumber || this.isProcessing) return;
    this.isProcessing = true;

    this.apiService.exitVehicleByNumber(this.exitData.vehicleNumber).subscribe({
      next: (data: any) => {
        this.paymentData = { ...data, vehicleNumber: this.exitData.vehicleNumber };
        this.showPaymentModal = true;
        this.exitData = { vehicleNumber: '' };
        this.isProcessing = false;
      },
      error: (error: any) => {
        console.error('Error exiting vehicle:', error);
        this.toast.error('Error exiting vehicle. Please check if it\'s parked.');
        this.isProcessing = false;
      }
    });
  }

  exitVehicleByNumber(vehicleNumber: string) {
    this.apiService.exitVehicleByNumber(vehicleNumber).subscribe({
      next: (data: any) => {
        this.paymentData = { ...data, vehicleNumber };
        this.showPaymentModal = true;
      },
      error: (error: any) => {
        console.error('Error exiting vehicle:', error);
        this.toast.error('Error exiting vehicle');
      }
    });
  }

  onPaymentComplete() {
    this.loadParkingData();
    this.showPaymentModal = false;
    this.toast.success('Vehicle checked out successfully!');
  }

  onModalClose() {
    this.showPaymentModal = false;
    this.loadParkingData();
  }

  loadParkingData() {
    this.apiService.getParkingSlots().subscribe({
      next: (data: any) => { this.parkingSlots = data; },
      error: (error: any) => { console.error('Error loading parking slots:', error); }
    });

    this.apiService.getActiveEntries().subscribe({
      next: (data: any) => {
        this.activeEntries = data.map((entry: any) => ({
          id: entry._id,
          vehicleNumber: entry.vehicleNumber || 'N/A',
          vehicleType: entry.slotId?.vehicleType || 'N/A',
          slotNumber: entry.slotId?.slotNumber || 'N/A',
          entryTime: new Date(entry.entryTime),
          duration: this.calculateDuration(entry.entryTime)
        }));
      },
      error: (error: any) => { console.error('Error loading active entries:', error); }
    });
  }

  calculateDuration(entryTime: string): string {
    const now = new Date();
    const entry = new Date(entryTime);
    const diffMs = now.getTime() - entry.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  openParkModal() {
    this.showParkModal = true;
  }

  closeParkModal() {
    this.showParkModal = false;
    this.parkData = { vehicleNumber: '', vehicleType: 'car' };
  }

  openCheckoutModal() {
    this.showCheckoutModal = true;
    this.exitData = { vehicleNumber: '' };
    this.isProcessing = false;
  }

  closeCheckoutModal() {
    this.showCheckoutModal = false;
    this.exitData = { vehicleNumber: '' };
    this.isProcessing = false;
  }
}
