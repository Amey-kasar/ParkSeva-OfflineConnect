import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  slots: any[] = [];
  activeEntries: any[] = [];
  payments: any[] = [];
  stats = {
    totalSlots: 0,
    occupiedSlots: 0,
    availableSlots: 0,
    totalRevenue: 0
  };

  newSlot = {
    slotNumber: '',
    vehicleType: 'car',
    hourlyRate: 50
  };

  parkingData = {
    vehicleNumber: '',
    slotId: ''
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loadSlots();
    this.loadActiveEntries();
    this.loadPayments();
  }

  loadSlots() {
    this.apiService.getParkingSlots().subscribe({
      next: (slots) => {
        this.slots = slots;
        this.updateStats();
      },
      error: (error) => console.error('Error loading slots:', error)
    });
  }

  loadActiveEntries() {
    this.apiService.getActiveEntries().subscribe({
      next: (entries) => {
        this.activeEntries = entries;
      },
      error: (error) => console.error('Error loading entries:', error)
    });
  }

  loadPayments() {
    this.apiService.getPayments().subscribe({
      next: (payments) => {
        this.payments = payments;
        this.stats.totalRevenue = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
      },
      error: (error) => console.error('Error loading payments:', error)
    });
  }

  updateStats() {
    this.stats.totalSlots = this.slots.length;
    this.stats.occupiedSlots = this.slots.filter(s => s.status === 'occupied').length;
    this.stats.availableSlots = this.slots.filter(s => s.status === 'available').length;
  }

  createSlot() {
    if (!this.newSlot.slotNumber) return;
    
    this.apiService.createParkingSlot(this.newSlot).subscribe({
      next: () => {
        this.loadSlots();
        this.newSlot = { slotNumber: '', vehicleType: 'car', hourlyRate: 50 };
        alert('Slot created successfully!');
      },
      error: (error) => {
        console.error('Error creating slot:', error);
        alert('Error creating slot');
      }
    });
  }

  parkVehicle() {
    if (!this.parkingData.vehicleNumber || !this.parkingData.slotId) return;
    
    this.apiService.parkVehicle(this.parkingData).subscribe({
      next: () => {
        this.loadDashboardData();
        this.parkingData = { vehicleNumber: '', slotId: '' };
        alert('Vehicle parked successfully!');
      },
      error: (error) => {
        console.error('Error parking vehicle:', error);
        alert('Error parking vehicle');
      }
    });
  }

  exitVehicle(entryId: string) {
    this.apiService.exitVehicle(entryId).subscribe({
      next: (entry) => {
        this.loadDashboardData();
        this.apiService.createPayment({
          entryId: entryId,
          amount: entry.totalAmount,
          paymentMethod: 'cash'
        }).subscribe();
        alert(`Vehicle exited. Amount: ₹${entry.totalAmount}`);
      },
      error: (error) => {
        console.error('Error exiting vehicle:', error);
        alert('Error exiting vehicle');
      }
    });
  }

  deleteSlot(slotId: string) {
    if (confirm('Are you sure you want to delete this slot?')) {
      this.apiService.deleteParkingSlot(slotId).subscribe({
        next: () => {
          this.loadSlots();
          alert('Slot deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting slot:', error);
          alert('Error deleting slot');
        }
      });
    }
  }
}