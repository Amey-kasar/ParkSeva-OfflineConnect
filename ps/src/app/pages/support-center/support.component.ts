import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HelpCenterService } from '../chat/chat.service';  // Renamed from ChatService

@Component({
  selector: 'app-support-center',  // Renamed from app-support
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.css']
})
export class SupportCenterComponent implements OnInit {  // Renamed from SupportComponent
  tickets: any[] = [];
  selectedTicket: any = null;
  responseText = '';

  constructor(private supportCenterService: HelpCenterService) {}  // Renamed from chatService

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    const allTickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    this.tickets = allTickets.filter((t: any) => t.status !== 'CLOSED');
  }

  selectTicket(ticket: any) {
    this.selectedTicket = ticket;
    this.responseText = '';
  }

  sendResponse() {
    if (!this.responseText.trim() || !this.selectedTicket) return;

    this.supportCenterService.updateTicket(this.selectedTicket.id, this.responseText).subscribe(() => {
      this.responseText = '';
      this.loadTickets();
      this.selectedTicket = null;
    });
  }

  closeTicket() {
    if (!this.selectedTicket) return;

    if (confirm('Are you sure you want to close this ticket? This action marks the issue as resolved.')) {
      this.supportCenterService.closeTicket(this.selectedTicket.id).subscribe(() => {
        alert('Ticket closed successfully!');
        this.loadTickets();
        this.selectedTicket = null;
      });
    }
  }

  requestCall() {
    if (!this.selectedTicket) return;

    this.supportCenterService.requestCall(this.selectedTicket.id).subscribe(() => {
      alert('Call support assigned: Sankalp (+91 78220 71695)');
      this.loadTickets();
      this.selectedTicket = null;
    });
  }
}
