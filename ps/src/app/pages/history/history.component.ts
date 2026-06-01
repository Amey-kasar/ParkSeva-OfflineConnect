import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent implements OnInit {
  historyRecords: any[] = [];
  filteredRecords: any[] = [];
  historyStats = {
    total: 0,
    revenue: 0,
    avgHours: 0
  };
  selectedDate: string = '';
  searchVehicle: string = '';

  constructor(private apiService: ApiService, private toast: ToastService) {}

  ngOnInit() {
    this.setDefaultDates();
    this.loadHistory();
  }

  setDefaultDates() {
    const today = new Date();
    this.selectedDate = today.toISOString().split('T')[0];
  }

  loadHistory() {
    this.apiService.getParkingHistory().subscribe({
      next: (data) => {
        this.historyRecords = data;
        this.applyFilters(); // Apply today's filter by default
      },
      error: (error) => {
        console.error('Error loading history:', error);
        this.toast.error('Failed to load history data');
      }
    });
  }

  searchByVehicle() {
    this.applyFilters();
  }

  filterByDate() {
    this.applyFilters();
  }

  showToday() {
    // Set selected date to today
    const today = new Date();
    this.selectedDate = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Apply filters with today's date
    this.applyFilters();
  }
  performSearch() {
    this.applyFilters();
  }


  applyFilters(showMessage: boolean = true) {
    let filtered = [...this.historyRecords];

    // Apply date filter (daily view)
    if (this.selectedDate) {
      const selectedDay = new Date(this.selectedDate);
      const startOfDay = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), 0, 0, 0);
      const endOfDay = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate(), 23, 59, 59, 999);

      filtered = filtered.filter(record => {
        const entryDate = new Date(record.entryInfo.entryTime);
        return entryDate >= startOfDay && entryDate <= endOfDay;
      });
    }

    // Apply vehicle search filter
    if (this.searchVehicle.trim()) {
      filtered = filtered.filter(record =>
        record.vehicleInfo.vehicleNumber.toLowerCase().includes(this.searchVehicle.toLowerCase())
      );
    }

    this.filteredRecords = filtered;
    this.calculateStats();

    // Only show messages when explicitly requested (button clicks)
    if (showMessage) {
      const dateStr = this.selectedDate ? new Date(this.selectedDate).toLocaleDateString() : 'all dates';

      if (this.filteredRecords.length === 0) {
        this.toast.warning(`No records found for ${dateStr}${this.searchVehicle.trim() ? ` with vehicle number containing "${this.searchVehicle}"` : ''}`);
      } else {
        this.toast.success(`Found ${this.filteredRecords.length} records for ${dateStr}${this.searchVehicle.trim() ? ` matching "${this.searchVehicle}"` : ''}`);
      }
    }
  }
  exportToExcel() {
    if (this.filteredRecords.length === 0) {
      this.toast.warning('No data to export');
      return;
    }

    const exportData = this.filteredRecords.map(record => ({
      'Vehicle Number': record.vehicleInfo.vehicleNumber,
      'Vehicle Type': record.vehicleInfo.vehicleType,
      'Slot Number': record.entryInfo.slotNumber,
      'Entry Time': new Date(record.entryInfo.entryTime).toLocaleString(),
      'Exit Time': new Date(record.entryInfo.exitTime).toLocaleString(),
      'Duration (Hours)': record.entryInfo.totalHours,
      'Amount (₹)': record.entryInfo.totalAmount,
      'User Name': record.vehicleInfo.userId?.name || 'N/A',
      'Payment Method': record.paymentInfo?.paymentMethod || 'N/A',
      'Payment Status': record.paymentInfo?.paymentStatus || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Parking Report');

    const dateStr = this.selectedDate || new Date().toISOString().split('T')[0];
    const fileName = `daily-parking-report-${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);

    this.toast.success('Daily report downloaded successfully!');
  }

  calculateStats() {
    if (!this.historyStats || !this.filteredRecords) {
      return;
    }

    this.historyStats.total = this.filteredRecords.length;
    this.historyStats.revenue = this.filteredRecords
      .reduce((sum: number, record: any) => sum + record.entryInfo.totalAmount, 0);
    this.historyStats.avgHours = this.filteredRecords.length > 0
      ? Math.round(this.filteredRecords
          .reduce((sum: number, record: any) => sum + record.entryInfo.totalHours, 0) / this.filteredRecords.length)
      : 0;
  }
  
}
