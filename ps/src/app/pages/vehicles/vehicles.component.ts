import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicles.component.html',
  styleUrl: './vehicles.component.css'
})
export class VehiclesComponent implements OnInit {
  vehicles: any[] = [];
  newVehicle = {
    userId: '',
    vehicleNumber: '',
    vehicleType: 'car'
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadVehicles();
  }

  loadVehicles() {
    this.apiService.getVehicles().subscribe({
      next: (data) => {
        this.vehicles = data;
      },
      error: (error) => {
        console.error('Error loading vehicles:', error);
      }
    });
  }

  addVehicle() {
    this.apiService.createVehicle(this.newVehicle).subscribe({
      next: (data) => {
        this.vehicles.push(data);
        this.newVehicle = { userId: '', vehicleNumber: '', vehicleType: 'car' };
        alert('Vehicle added successfully!');
      },
      error: (error) => {
        console.error('Error adding vehicle:', error);
        alert('Error adding vehicle');
      }
    });
  }

  deleteVehicle(id: string) {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      this.apiService.deleteVehicle(id).subscribe({
        next: () => {
          this.vehicles = this.vehicles.filter(v => v._id !== id);
          alert('Vehicle deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting vehicle:', error);
          alert('Error deleting vehicle');
        }
      });
    }
  }
}