import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './admin-register.component.html',
  styleUrl: './admin-register.component.css'
})
export class AdminRegisterComponent {
  adminData = {
    name: '',
    phoneNumber: '',
    email: '',
    password: '',
    role: 'admin'
  };

  locationData = {
    locationName: '',
    address: '',
    coordinates: {
      latitude: 0,
      longitude: 0
    },
    contactInfo: {
      phone: '',
      email: ''
    },
    operatingHours: {
      open: '09:00',
      close: '21:00'
    }
  };

  isLoading = false;

  constructor(private router: Router, private apiService: ApiService) {}

  getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.locationData.coordinates.latitude = position.coords.latitude;
          this.locationData.coordinates.longitude = position.coords.longitude;
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get current location. Please enter coordinates manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }

  onRegister() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.locationData.contactInfo.phone = this.adminData.phoneNumber;
    this.locationData.contactInfo.email = this.adminData.email;

    const registrationData = {
      ...this.adminData,
      locationData: this.locationData
    };

    this.apiService.register(registrationData).subscribe({
      next: (response) => {
        this.isLoading = false;
        alert('Admin registration successful! Your parking space has been created with 10 default slots.');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Registration error:', error);
        alert('Registration failed: ' + (error.error?.error || 'Please try again.'));
      }
    });
  }

  private validateForm(): boolean {
    if (!this.adminData.name || !this.adminData.phoneNumber || !this.adminData.password) {
      alert('Please fill in all required admin fields.');
      return false;
    }

    if (!this.locationData.locationName || !this.locationData.address) {
      alert('Please fill in all required location fields.');
      return false;
    }

    if (!this.locationData.coordinates.latitude || !this.locationData.coordinates.longitude) {
      alert('Please provide location coordinates.');
      return false;
    }

    return true;
  }
}