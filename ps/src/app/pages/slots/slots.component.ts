import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface FloorConfig {
  id: number;
  label: string;
  type: 'bike' | 'car' | 'truck';
  startLetter: string;  // display starting letter (A, C, etc.)
  rows: number;         // number of display rows
  cols: number;         // number of display columns (slots per row)
}

@Component({
  selector: 'app-slots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './slots.component.html',
  styleUrl: './slots.component.css'
})
export class SlotsComponent implements OnInit {
  slots: any[] = [];
  filterType = '';
  showAddModal = false;
  editingSlot: any = null;
  selectedSlotForBooking = '';

  // ✅ dynamic floors
  floors: FloorConfig[] = [
    { id: 1, label: 'Underground – Bikes',  type: 'bike',  startLetter: 'A', rows: 4, cols: 6 },
    { id: 2, label: 'First Floor – Cars',   type: 'car',   startLetter: 'A', rows: 4, cols: 6 },
    { id: 3, label: 'Second Floor – Trucks', type: 'truck', startLetter: 'A', rows: 4, cols: 6 }
  ];

  // floor modal state
  showFloorModal = false;
  floorForm: FloorConfig = {
    id: 0,
    label: '',
    type: 'bike',
    startLetter: 'A',
    rows: 4,
    cols: 6
  };

  // Proper type for TS
  slotStats: { [key in 'available' | 'occupied' | 'maintenance' | 'total']: number } = {
    available: 0,
    occupied: 0,
    maintenance: 0,
    total: 0
  };

  newSlot = {
    slotNumber: '',
    vehicleType: '',
    hourlyRate: 5,
    status: 'available'
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadSlots();
  }

  loadSlots() {
    this.api.getParkingSlots().subscribe({
      next: (data) => {
        this.slots = data;
        this.calculateStats();
      },
      error: (err) => console.error(err)
    });
  }

  calculateStats() {
    this.slotStats.total = this.slots.length;
    this.slotStats.available = this.slots.filter(s => s.status === 'available').length;
    this.slotStats.occupied = this.slots.filter(s => s.status === 'occupied').length;
    this.slotStats.maintenance = this.slots.filter(s => s.status === 'maintenance').length;
  }

  getSortedFilteredSlots() {
    let arr = [...this.slots];
    if (this.filterType) {
      arr = arr.filter(x => x.vehicleType === this.filterType);
    }
    // available → occupied → maintenance
    return arr.sort((a, b) => {
      const order = { available: 1, occupied: 2, maintenance: 3 } as any;
      return order[a.status] - order[b.status];
    });
  }

  /** 🔁 Helper: map display slot code (A1, B2) to backend code based on type */
  private mapDisplayToBackend(code: string, type: string): string {
    const letter = code[0];
    const num = code.slice(1);
    if (type === 'car') {
      return String.fromCharCode(letter.charCodeAt(0) + 4) + num;  // A→E, B→F...
    }
    if (type === 'truck') {
      return String.fromCharCode(letter.charCodeAt(0) + 10) + num; // A→L, B→M...
    }
    return code; // bike: same
  }

  getSlotClass(displayCode: string, type: string) {
    const backendCode = this.mapDisplayToBackend(displayCode, type);
    const s = this.slots.find(
      x => x.slotNumber.toUpperCase() === backendCode.toUpperCase() && x.vehicleType === type
    );
    return s ? s.status : 'default';
  }

  selectSlot(slot: any) {
    console.log('selected slot:', slot);
  }

  selectSlotFromMatrix(displayCode: string, type: string) {
    const backendCode = this.mapDisplayToBackend(displayCode, type);

    const s = this.slots.find(
      x => x.slotNumber.toUpperCase() === backendCode.toUpperCase() && x.vehicleType === type
    );

    if (s) {
      console.log('selected slot:', s);
      this.selectedSlotForBooking = displayCode;
    } else {
      // Create a new slot when clicking on an available (non-existent) slot
      const newSlot = {
        slotNumber: backendCode,
        vehicleType: type,
        hourlyRate: type === 'bike' ? 5 : type === 'car' ? 10 : 15, // Default rates
        status: 'available'
      };

      this.api.createParkingSlot(newSlot).subscribe({
        next: (createdSlot) => {
          this.slots.push(createdSlot);
          this.calculateStats();
          console.log('Created new slot:', createdSlot);
        },
        error: (e) => console.error('Error creating slot:', e)
      });
    }
  }

  /* --------- FLOOR LAYOUT HELPERS (used in HTML) --------- */
  getFloorRows(fl: FloorConfig): string[] {
    const rows: string[] = [];
    const start = fl.startLetter.toUpperCase().charCodeAt(0);
    for (let i = 0; i < fl.rows; i++) {
      rows.push(String.fromCharCode(start + i));
    }
    return rows;
  }

  getFloorCols(fl: FloorConfig): number[] {
    return Array.from({ length: fl.cols }, (_, i) => i + 1);
  }

  /* --------- FLOOR MODAL (Add / Edit Floor) --------- */

  openFloorModal(floor?: FloorConfig) {
    if (floor) {
      this.floorForm = { ...floor };
    } else {
      this.floorForm = {
        id: 0,
        label: '',
        type: 'bike',
        startLetter: 'A',
        rows: 4,
        cols: 6
      };
    }
    this.showFloorModal = true;
  }

  closeFloorModal() {
    this.showFloorModal = false;
  }

  isFloorFormValid(): boolean {
    return !!this.floorForm.label &&
           !!this.floorForm.startLetter &&
           this.floorForm.rows > 0 &&
           this.floorForm.cols > 0;
  }

  saveFloor() {
    if (!this.isFloorFormValid()) return;

    if (this.floorForm.id) {
      const idx = this.floors.findIndex(f => f.id === this.floorForm.id);
      if (idx > -1) this.floors[idx] = { ...this.floorForm };
    } else {
      const nextId = this.floors.length ? Math.max(...this.floors.map(f => f.id)) + 1 : 1;
      this.floors.push({ ...this.floorForm, id: nextId });
    }

    this.showFloorModal = false;
  }

  /* --------- ADD SLOT MODAL (existing) --------- */

  openAddModal() {
    this.showAddModal = true;
    this.resetForm();
  }

  closeAddModal() {
    this.showAddModal = false;
    this.resetForm();
  }

  private resetForm() {
    this.newSlot = {
      slotNumber: '',
      vehicleType: '',
      hourlyRate: 5,
      status: 'available'
    };
    this.selectedSlotForBooking = '';
  }

  onVehicleTypeChange() {
    // Reset selected slot when vehicle type changes
    this.selectedSlotForBooking = '';
    this.newSlot.slotNumber = '';

    // Set default hourly rate based on vehicle type
    switch (this.newSlot.vehicleType) {
      case 'bike':
        this.newSlot.hourlyRate = 5;
        break;
      case 'car':
        this.newSlot.hourlyRate = 10;
        break;
      case 'truck':
        this.newSlot.hourlyRate = 15;
        break;
      default:
        this.newSlot.hourlyRate = 5;
    }
  }

  // Get available slots for the selected vehicle type
  getAvailableSlotsByType(vehicleType: string) {
    if (!vehicleType) return [];
    return this.slots
      .filter(slot => slot.vehicleType === vehicleType && slot.status === 'available')
      .sort((a, b) => a.slotNumber.localeCompare(b.slotNumber));
  }

  // Get empty slots (not yet created) for the selected vehicle type
  getEmptySlotsByType(vehicleType: string): string[] {
    if (!vehicleType) return [];

    const existingSlotsForType = this.slots
      .filter(slot => slot.vehicleType === vehicleType)
      .map(slot => slot.slotNumber.toUpperCase());

    const allPossibleDisplaySlots: string[] = [];

    // Generate from current floor configuration
    this.floors
      .filter(f => f.type === vehicleType)
      .forEach(floor => {
        const rows = this.getFloorRows(floor);
        const cols = this.getFloorCols(floor);

        rows.forEach(row => {
          cols.forEach(col => {
            const displayCode = row + col; // what user sees
            const backendCode = this.mapDisplayToBackend(displayCode, vehicleType);

            if (!existingSlotsForType.includes(backendCode.toUpperCase())) {
              allPossibleDisplaySlots.push(displayCode);
            }
          });
        });
      });

    return allPossibleDisplaySlots.sort();
  }

  selectSlotForBooking(slot: any) {
    this.newSlot.slotNumber = slot.slotNumber;

    const previewSlots = document.querySelectorAll('.preview-slot');
    previewSlots.forEach(el => el.classList.remove('selected'));

    if (event?.target) {
      (event.target as HTMLElement).classList.add('selected');
    }
  }

  selectEmptySlot(slotNumberDisplay: string) {
    const backendCode = this.mapDisplayToBackend(slotNumberDisplay, this.newSlot.vehicleType);
    this.newSlot.slotNumber = backendCode;

    const previewSlots = document.querySelectorAll('.preview-slot');
    previewSlots.forEach(el => el.classList.remove('selected'));

    if (event?.target) {
      (event.target as HTMLElement).classList.add('selected');
    }
  }

  isFormValid(): boolean {
    return !!(
      this.newSlot.slotNumber &&
      this.newSlot.vehicleType &&
      this.newSlot.hourlyRate > 0
    );
  }

  addSlot() {
    if (!this.isFormValid()) {
      alert('Please fill in all required fields');
      return;
    }

    console.log('Sending:', this.newSlot);
    this.api.createParkingSlot(this.newSlot).subscribe({
      next: (d) => {
        this.slots.push(d);
        this.calculateStats();
        alert('Slot added successfully!');
        this.closeAddModal();
      },
      error: (e) => {
        console.error(e);
        alert('Error adding slot. Please try again.');
      }
    });
  }

  editSlot(slot: any) {
    this.editingSlot = { ...slot };
  }

  updateSlot() {
    this.api.updateParkingSlot(this.editingSlot._id, this.editingSlot).subscribe({
      next: (d) => {
        const i = this.slots.findIndex(x => x._id === this.editingSlot._id);
        if (i !== -1) this.slots[i] = d;
        this.calculateStats();
        this.editingSlot = null;
      },
      error: (e) => console.error(e)
    });
  }

  deleteSlot(id: string) {
    if (confirm('Are you sure you want to delete this slot?')) {
      this.api.deleteParkingSlot(id).subscribe({
        next: () => {
          this.slots = this.slots.filter(x => x._id !== id);
          this.calculateStats();
          alert('Slot deleted successfully!');
        },
        error: (e) => console.error(e)
      });
    }
  }

  convertForDisplay(slot: any): string {
    const letter = slot.slotNumber[0];
    const num = slot.slotNumber.slice(1);

    if (slot.vehicleType === 'car') {
      // reverse shift => backend E/F/G/H → A/B/C/D
      return String.fromCharCode(letter.charCodeAt(0) - 4) + num;
    }
    if (slot.vehicleType === 'truck') {
      // reverse shift => backend L/M/N/O → A/B/C/D
      return String.fromCharCode(letter.charCodeAt(0) - 10) + num;
    }
    return slot.slotNumber; // bikes stay same
  }

  toChar(base: string, offset: number) {
    return String.fromCharCode(base.charCodeAt(0) + offset);
  }

  getSlotsByType(vehicleType: string) {
    return this.slots
      .filter(slot => slot.vehicleType === vehicleType)
      .sort((a, b) => {
        const order = { available: 1, occupied: 2, maintenance: 3 } as any;
        return order[a.status] - order[b.status];
      });
  }
}
