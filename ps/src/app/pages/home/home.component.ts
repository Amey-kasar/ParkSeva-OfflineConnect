import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  loginStatus: boolean = false;
  currentYear: number = new Date().getFullYear();

  ngOnInit() {
    this.checkLoginStatus();
  }

  checkLoginStatus() {
    this.loginStatus = !!localStorage.getItem('token');
  }
}