import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerData = {
    name: '',
    phoneNumber: '',
    email: '',
    password: '',
    
  };

  constructor(private router: Router, private apiService: ApiService) {}

  onRegister() {
    this.apiService.register(this.registerData).subscribe({
      next: (response) => {
        alert('Registration successful! Please login.');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
      }
    });
  }
}