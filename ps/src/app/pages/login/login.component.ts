import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginData = {
    phoneNumber: '',
    password: ''
  };

  isLoading = false;
  currentSlide = 0;
  slideInterval: any;

  // Carousel images
  images: string[] = [
    '../../../assets/images/pexels-fotios-photos-29557509.jpg',
    '../../../assets/images/pexels-proxyclick-2451622.jpg',
    '../../../assets/images/pexels-keat007-31685643.jpg'
  ];

  constructor(
    private apiService: ApiService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      this.router.navigate(['/dashboard']);
    }

    // Auto change slides
    this.slideInterval = setInterval(() => {
      this.nextSlide();
    }, 4000); // Slowed down slightly for a calmer vibe
  }

  ngOnDestroy() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.images.length;
  }

  onLogin() {
    if (!this.loginData.phoneNumber || !this.loginData.password) {
      this.toast.error('Please enter both phone number and password');
      return;
    }

    this.isLoading = true;

    this.apiService.login(this.loginData).subscribe({
      next: (response) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('userId', response.user._id);
        localStorage.setItem('userRole', response.user.role);

        this.toast.success('Login successful');

        if (response.user.role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.toast.error(error.error?.message || 'Invalid credentials');
        this.isLoading = false;
      }
    });
  }
}
