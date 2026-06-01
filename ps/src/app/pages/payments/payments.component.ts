
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.css'
})
export class PaymentsComponent implements OnInit {
  payments: any[] = [];
  paymentStats = {
    total: 0,
    revenue: 0,
    pending: 0
  };
  isAdmin = false;

  newPayment = {
    vehicleNumber: '',
    paymentMethod: 'cash',
    transactionId: '',
    amountPaid: 0,
    paymentStatus: 'completed'
  };
  showModal = false;
  openModal() {
    this.showModal = true;
  }
  
  closeModal() {
    this.showModal = false;
    this.resetForm();
  }

  resetForm() {
    this.newPayment = {
      vehicleNumber: '',
      paymentMethod: 'cash',
      transactionId: '',
      amountPaid: 0,
      paymentStatus: 'completed'
    };
  }
  
  constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit() {
    this.checkAdminAccess();
    if (this.isAdmin) {
      this.loadPayments();
    }
  }

  checkAdminAccess() {
    const userRole = localStorage.getItem('userRole');
    this.isAdmin = userRole === 'admin';
    
    if (!this.isAdmin) {
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 3000);
    }
  }

  loadPayments() {
    this.apiService.getPayments().subscribe({
      next: (data) => {
        this.payments = data;
        this.calculateStats();
      },
      error: (error) => {
        console.error('Error loading payments:', error);
      }
    });
  }

  calculateStats() {
    // Calculate daily stats
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const todayPayments = this.payments.filter(p => {
      const paymentDate = new Date(p.paymentDate);
      return paymentDate >= startOfDay && paymentDate <= endOfDay;
    });
    
    this.paymentStats.total = todayPayments.length;
    this.paymentStats.revenue = todayPayments
      .filter(p => p.paymentStatus === 'completed')
      .reduce((sum, p) => sum + p.amountPaid, 0);
    this.paymentStats.pending = todayPayments
      .filter(p => p.paymentStatus === 'pending').length;
  }

  createPayment() {
    this.apiService.createPayment(this.newPayment).subscribe({
      next: (data) => {
        this.payments.unshift(data);
        this.calculateStats();
        this.closeModal();
        alert('Payment created successfully!');
      },
      error: (error) => {
        console.error('Error creating payment:', error);
        alert('Error creating payment');
      }
    });
  }
}