import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-slots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './slot-overview.component.html',
  styleUrls: ['./slot-overview.component.css']
})
export class SlotOverviewComponent implements OnInit {
  slots: any[] = [];
  filterType = '';
  showAddModal = false;
  editingSlot: any = null;

  rows = ['A', 'B', 'C', 'D'];
  cols = [1, 2, 3, 4, 5, 6];

  floors = [
    { type: 'bike', label: 'Underground – Bikes' },
    { type: 'car', label: 'First Floor – Cars' },
    { type: 'truck', label: 'Second Floor – Trucks' }
  ];

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

  getSlotClass(num: string, type: string) {
    const s = this.slots.find(
      x => x.slotNumber.toUpperCase() === num.toUpperCase() && x.vehicleType === type
    );
    return s ? s.status : 'default';  // Change from 'available' to 'default'
  }

  selectSlot(slot: any) {
    console.log('selected slot:', slot);
  }

  selectSlotFromMatrix(num: string, type: string) {
    const s = this.slots.find(
      x => x.slotNumber.toUpperCase() === num.toUpperCase() && x.vehicleType === type
    );
    if (s) {
      console.log('selected slot:', s);
    } else {
      // Create a new slot when clicking on an available (non-existent) slot
      const newSlot = {
        slotNumber: num,
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

  openAddModal() {
    this.showAddModal = true;
  }

closeAddModal() {
  this.showAddModal = false;
  this.newSlot = {
    slotNumber: '',
    vehicleType: 'car',
    hourlyRate: 5,
    status: 'available'      // reset to available so form remains VALID
  };
}


addSlot() {
  console.log('Sending:', this.newSlot);
  this.api.createParkingSlot(this.newSlot).subscribe({
    next: (d) => {
      this.slots.push(d);
      this.calculateStats();
      alert('Slot added!');
      // reset AFTER adding (so the selected status will be actually used first!)
      this.newSlot = { slotNumber: '', vehicleType: 'car', hourlyRate: 5, status: 'available' };
      this.showAddModal = false;
    },
    error: (e) => console.error(e)
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
    if (confirm('Delete this slot?')) {
      this.api.deleteParkingSlot(id).subscribe({
        next: () => {
          this.slots = this.slots.filter(x => x._id !== id);
          this.calculateStats();
        },
        error: (e) => console.error(e)
      });
    }
  }
  convertForDisplay(slot: any): string {
    const letter = slot.slotNumber[0];
    const num = slot.slotNumber.slice(1);

    if (slot.vehicleType === 'car') {
      // reverse shift => E/F/G/H (backend) → A/B/C/D (display)
      return String.fromCharCode(letter.charCodeAt(0) - 4) + num;
    }
    if (slot.vehicleType === 'truck') {
      // reverse shift => L/M/N/O (backend) → A/B/C/D (display)
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
  setFilterType(type: string) {
    this.filterType = type;   // '' | 'bike' | 'car' | 'truck'
  }

  getDirectorySlots() {
    let arr = [...this.slots];

    // filter by type if selected
    if (this.filterType) {
      arr = arr.filter(s => s.vehicleType === this.filterType);
    }

    // sort by vehicleType then slotNumber
    return arr.sort((a, b) => {
      const typeOrder: any = { bike: 1, car: 2, truck: 3 };
      const tA = typeOrder[a.vehicleType] || 99;
      const tB = typeOrder[b.vehicleType] || 99;

      if (tA !== tB) return tA - tB;

      // sort by display slot code so A1..A10, B1.. etc
      const dispA = this.convertForDisplay(a);
      const dispB = this.convertForDisplay(b);
      return dispA.localeCompare(dispB);
    });
  }

}
