import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  staffForm = {
    name: '',
    phoneNumber: '',
    email: '',
    password: '',
    role: 'staff'
  };

  staffList: any[] = [];
  isLoading = false;
  isSubmitting = false;
  showCreateForm = false;
  searchTerm = '';

  get filteredStaff() {
    if (!this.searchTerm) return this.staffList;
    return this.staffList.filter(staff => 
      staff.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      staff.phoneNumber.includes(this.searchTerm) ||
      (staff.email && staff.email.toLowerCase().includes(this.searchTerm.toLowerCase()))
    );
  }

  get activeStaffCount() {
    return this.staffList.filter(s => s.role === 'staff').length;
  }

  constructor(
    private apiService: ApiService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadStaffList();
  }

  createStaff() {
    if (!this.staffForm.name || !this.staffForm.phoneNumber || !this.staffForm.password) {
      this.toastService.showError('Please fill all required fields');
      return;
    }

    this.isSubmitting = true;
    this.apiService.createUser(this.staffForm).subscribe({
      next: () => {
        this.toastService.showSuccess('Staff member created successfully');
        this.resetForm();
        this.showCreateForm = false;
        this.loadStaffList();
        this.isSubmitting = false;
      },
      error: (error: any) => {
        this.toastService.showError(error.error?.message || 'Failed to create staff member');
        this.isSubmitting = false;
      }
    });
  }

  loadStaffList() {
    this.isLoading = true;
    this.apiService.getUsers().subscribe({
      next: (users) => {
        this.staffList = users.filter((user: any) => user.role === 'staff');
        this.isLoading = false;
      },
      error: (error) => {
        this.toastService.showError('Failed to load staff list');
        this.isLoading = false;
      }
    });
  }

  deleteStaff(staffId: string) {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    this.apiService.deleteUser(staffId).subscribe({
      next: () => {
        this.toastService.showSuccess('Staff member deleted successfully');
        this.loadStaffList();
      },
      error: (error) => {
        this.toastService.showError('Failed to delete staff member');
      }
    });
  }

  resetForm() {
    this.staffForm = {
      name: '',
      phoneNumber: '',
      email: '',
      password: '',
      role: 'staff'
    };
  }
}