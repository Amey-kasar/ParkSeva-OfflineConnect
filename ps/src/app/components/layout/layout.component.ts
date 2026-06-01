import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HelpCenterComponent } from '../../pages/chat/chat.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, HelpCenterComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {
  sidebarCollapsed = false;
  showMobileSidebar = false;
  showProfileDropdown = false;
  
  currentUser: any = null;
  isAdmin = false;
  openTicketsCount = 0;

  constructor(private router: Router) {}

  ngOnInit() {
    this.currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    this.isAdmin = this.currentUser?.role === 'admin';
    this.loadTicketCount();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!(event.target as HTMLElement).closest('.profile-dropdown')) {
      this.showProfileDropdown = false;
    }
  }

  loadTicketCount() {
    const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    this.openTicketsCount = tickets.filter((t: any) => t.status === 'OPEN').length;
  }

  toggleSidebar() {
    if (window.innerWidth <= 768) {
      this.showMobileSidebar = !this.showMobileSidebar;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  closeMobileSidebar() {
    this.showMobileSidebar = false;
  }

  toggleProfileDropdown() {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  closeProfileDropdown() {
    this.showProfileDropdown = false;
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}