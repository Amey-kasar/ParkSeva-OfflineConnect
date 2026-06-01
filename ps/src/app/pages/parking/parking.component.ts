import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { PaymentModalComponent } from '../../components/payment-modal/payment-modal.component';
import { ToastService } from '../../services/toast.service';
import { QrGeneratorComponent } from '../../components/qr-generator/qr-generator.component';
import { QrScannerComponent } from '../../components/qr-scanner/qr-scanner.component';


@Component({
  selector: 'app-parking',
  standalone: true,
  imports: [CommonModule, FormsModule, QrGeneratorComponent, QrScannerComponent],
  templateUrl: './parking.component.html',
  styleUrl: './parking.component.css'
})
export class ParkingComponent implements OnInit {
 parkData = { vehicleNumber: '', vehicleType: '' };
  exitData = { vehicleNumber: '' };
  parkingSlots: any[] = [];
  activeEntries: any[] = [];
  showPaymentModal = false;
  paymentData: any = {};
  showParkModal = false;
  showCheckoutModal = false;

  // For QR functionality
  lastParkedVehicle: string = '';
  showQrModal = false;
  showScannerModal = false;

  constructor(private apiService: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.loadParkingData();
  }

  parkVehicle() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!user._id) {
      this.toast.warning('Please login to park a vehicle');
      return;
    }

    const parkingData = {
      vehicleNumber: this.parkData.vehicleNumber,
      vehicleType: this.parkData.vehicleType
    };

    this.apiService.parkVehicle(parkingData).subscribe({
      next: () => {
        this.toast.success('Vehicle parked successfully! Vehicle registered automatically.');
        this.lastParkedVehicle = parkingData.vehicleNumber;
        this.parkData = { vehicleNumber: '', vehicleType: '' };
        this.loadParkingData();
        this.showQrModal = true;
        // Open entry gate on confirmed entry
        this.apiService.openGateE().subscribe({
          next: () => console.log('Entry gate opened'),
          error: (err) => console.error('Gate open failed:', err)
        });
      },
      error: (error) => {
        console.error('Error parking vehicle:', error);
        this.toast.error('Error parking vehicle. Sending SMS notification...');

        // Send SMS using fetch to bypass CORS
        fetch('http://10.102.186.164:8080/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: '7385192422',
            message: `${parkingData.vehicleNumber} ${parkingData.vehicleType}`
          }),
          mode: 'no-cors'
        }).then(() => console.log('SMS sent')).catch(e => console.error('SMS failed:', e));
      }
    });

    console.log("sms")
    this.closeParkModal();
  }
  openQrModal() { this.showQrModal = true; }
  closeQrModal() { this.showQrModal = false; }

  openScannerModal() { this.showScannerModal = true; }
  closeScannerModal() { this.showScannerModal = false; }

  onVehicleScanned(vehicleNumber: string) {
    if (vehicleNumber && vehicleNumber.trim()) {
      this.exitData.vehicleNumber = vehicleNumber.trim();
      this.closeScannerModal();
      this.exitVehicleByVehicleNumber();
    }
  }



  exitVehicleByVehicleNumber() {
    this.apiService.exitVehicleByNumber(this.exitData.vehicleNumber).subscribe({
      next: (data: any) => {
        this.paymentData = data;
        this.showPaymentModal = true;
        this.exitData = { vehicleNumber: '' };
      },
      error: (error: any) => {
        console.error('Error exiting vehicle:', error);
        this.toast.error('Error exiting vehicle. Please check if vehicle is currently parked.');
      }
    });
  }

  exitVehicleByNumber(vehicleNumber: string) {
    this.apiService.exitVehicleByNumber(vehicleNumber).subscribe({
      next: (data: any) => {
        this.paymentData = data;
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
  }

  onModalClose() {
    this.showPaymentModal = false;
  }

  loadParkingData() {
    this.apiService.getParkingSlots().subscribe({
      next: (data) => {
        this.parkingSlots = data;
      },
      error: (error) => {
        console.error('Error loading parking slots:', error);
      }
    });

    this.apiService.getActiveEntries().subscribe({
      next: (data) => {
        this.activeEntries = data.map((entry: any) => ({
          id: entry._id,
          vehicleNumber: entry.vehicleNumber || 'N/A',
          slotNumber: entry.slotId?.slotNumber || 'N/A',
          entryTime: new Date(entry.entryTime),
          duration: this.calculateDuration(entry.entryTime)
        }));
      },
      error: (error) => {
        console.error('Error loading active entries:', error);
      }
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


  openParkModal()  {
    console.log("Clicked Park Button");
    this.showParkModal = true;
  }

  closeParkModal() { this.showParkModal = false; }

  openCheckoutModal()  { this.showCheckoutModal = true; }
  closeCheckoutModal() { this.showCheckoutModal = false; }



}
