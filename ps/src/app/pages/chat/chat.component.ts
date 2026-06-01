import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ChatMessage, CSAT, GeminiResponse } from './models';
import { HelpCenterService } from './chat.service'; 

@Component({
  selector: 'app-help-center', 
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class HelpCenterComponent implements OnInit { 
  // --- WIDGET STATE ---
  isOpen = false;

  messages: ChatMessage[] = [];
  newMessage = '';
  typingText = '';
  showCSAT = false;
  lastResolvedBy: 'AI' | 'OPERATOR' = 'AI';
  suggestions: any[] = [];
  showFAQs = true;
  ticketNotification: any = null;
  csatFeedback = '';
  useGeminiAI = false;
  currentUser = { _id: 'demo-user', name: 'Customer' };

  constructor(public helpCenterService: HelpCenterService, private router: Router) {}

  ngOnInit() {
    this.messages = this.helpCenterService.loadChatHistory();
    this.checkTicketResponses();
    setInterval(() => this.checkTicketResponses(), 5000);
    this.checkEscalatedTickets();
    setInterval(() => this.checkEscalatedTickets(), 60000);
  }

  // --- TOGGLE WIDGET ---
  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  closeChat() {
    this.isOpen = false;
  }

  // --- TOGGLE AI MODE ---
  toggleAIMode() { 
    this.useGeminiAI = !this.useGeminiAI; 
  }

  checkTicketResponses() {
    const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    const respondedTicket = tickets.find((t: any) => t.status === 'RESPONDED' && !t.notificationShown);

    if (respondedTicket) {
      this.ticketNotification = respondedTicket;
      respondedTicket.notificationShown = true;
      localStorage.setItem('supportTickets', JSON.stringify(tickets));
      this.isOpen = true; 
    }
  }

  viewTicketResponse() {
    if (this.ticketNotification) {
      this.messages.push({
        sender: 'operator',
        message: this.ticketNotification.response,
        timestamp: new Date()
      });
      this.helpCenterService.saveChatHistory(this.messages);
      this.ticketNotification = null;
      this.showCSAT = true;
      this.lastResolvedBy = 'OPERATOR';
      this.isOpen = true;
    }
  }

  dismissNotification() {
    this.ticketNotification = null;
  }

  onInputChange() {
    this.suggestions = this.helpCenterService.getSuggestions(this.newMessage);
    this.showFAQs = false; 
  }

  selectFAQ(faq: any) {
    this.newMessage = faq.question;
    this.sendMessage();
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      message: this.newMessage,
      timestamp: new Date()
    };

    this.messages.push(userMsg);
    const currentMessage = this.newMessage;
    this.newMessage = '';
    this.showFAQs = false;
    this.suggestions = [];
    this.typingText = 'AI is typing...';

    const apiCall = this.useGeminiAI
      ? this.helpCenterService.askGeminiAI(currentMessage)
      : this.helpCenterService.askGemini(currentMessage);

    apiCall.subscribe({
      next: (res: GeminiResponse) => {
        const aiText = res?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process your request.';

        if (aiText === 'RAISE_TICKET') {
          this.autoRaiseTicket(currentMessage);
        } else if (aiText === 'CHECK_TICKET_STATUS') {
          this.checkTicketStatus(currentMessage);
        } else {
          this.messages.push({
            sender: 'ai',
            message: aiText,
            timestamp: new Date()
          });
          this.lastResolvedBy = 'AI';
          this.showCSAT = true;
          this.helpCenterService.saveChatHistory(this.messages);
        }
        this.typingText = '';
      },
      error: (err) => {
        this.messages.push({
          sender: 'ai',
          message: 'I apologize, but I\'m having trouble connecting. Please try again or raise a support ticket.',
          timestamp: new Date()
        });
        this.typingText = '';
      }
    });
  }

  isLowConfidence(response: string): boolean {
    return (response.length < 30 || response.includes("I'm not sure") || response.includes("cannot help"));
  }

  createTicket(description: string) {
    this.helpCenterService.createTicket({ issueType: 'USER_QUERY', description }).subscribe(() => {
      this.messages.push({
        sender: 'ai',
        message: 'Your issue has been forwarded to our support team. An operator will assist you shortly.',
        timestamp: new Date()
      });
      this.lastResolvedBy = 'OPERATOR';
    });
  }

  submitCSAT(rating: CSAT['rating']) {
    this.showCSAT = false;

    if (rating === 'NEGATIVE') {
      const lastUserMsg = this.messages.filter(m => m.sender === 'user').pop();
      if (lastUserMsg) this.raiseTicket(lastUserMsg.message);
    } else if (rating === 'POSITIVE') {
      this.messages.push({ sender: 'ai', message: 'Thank you for your positive feedback! We\'re glad we could help you.', timestamp: new Date() });
      this.helpCenterService.saveChatHistory(this.messages);
      setTimeout(() => {
        this.helpCenterService.clearChatHistory();
        this.messages = [];
        this.showFAQs = true;
      }, 2000);
    } else {
      this.messages.push({ sender: 'ai', message: 'Thank you for your feedback. We\'ll continue to improve our service.', timestamp: new Date() });
      this.helpCenterService.saveChatHistory(this.messages);
    }

    this.helpCenterService.submitCSAT({ rating, resolvedBy: this.lastResolvedBy }).subscribe();
  }

  raiseTicket(description: string) {
    this.helpCenterService.createTicket({ issueType: 'UNSATISFIED_RESPONSE', description }).subscribe((ticket: any) => {
      this.messages.push({ sender: 'ai', message: `Support ticket ${ticket.id} has been raised. Our team will contact you soon.`, timestamp: new Date() });
    });
  }

  isMyMessage(msg: ChatMessage) { return msg.sender === 'user'; }
  formatTime(date: Date) { return new Date(date).toLocaleTimeString(); }
  formatMessage(message: string): string { return message.replace(/\n/g, '<br>'); }

  autoRaiseTicket(description: string) {
    this.helpCenterService.createTicketWithContact({ issueType: 'USER_REQUEST', description }).subscribe((ticket: any) => {
      this.messages.push({ sender: 'ai', message: `Support ticket ${ticket.id} has been raised successfully.\nYour request has been forwarded to our support team.`, timestamp: new Date() });
      this.lastResolvedBy = 'OPERATOR';
      this.helpCenterService.saveChatHistory(this.messages);
    });
  }

  checkTicketStatus(message: string) {
    const ticketIdMatch = message.match(/tkt-?\d+/i);
    if (!ticketIdMatch) {
      this.messages.push({ sender: 'ai', message: `Please provide your Ticket ID to check the status. (Format: TKT-XXXXXXXXXX)`, timestamp: new Date() });
      this.helpCenterService.saveChatHistory(this.messages);
      return;
    }
    const ticketId = ticketIdMatch[0].toUpperCase().replace(/^TKT/, 'TKT-');
    const ticket = this.helpCenterService.getTicketById(ticketId);

    if (!ticket) {
      this.messages.push({ sender: 'ai', message: `Ticket ${ticketId} not found.`, timestamp: new Date() });
      this.helpCenterService.saveChatHistory(this.messages);
      return;
    }

    if (ticket.status === 'RESPONDED' && ticket.response) {
      this.messages.push({ sender: 'operator', message: ticket.response, timestamp: new Date() });
      this.showCSAT = true;
      this.lastResolvedBy = 'OPERATOR';
    } else {
      this.messages.push({ sender: 'ai', message: `Ticket Status: ${ticket.status}\nIssue: ${ticket.description}`, timestamp: new Date() });
    }
    this.helpCenterService.saveChatHistory(this.messages);
  }

  checkEscalatedTickets() {
    const escalatedTickets = this.helpCenterService.checkPendingTickets();
    escalatedTickets.forEach((ticket: any) => {
      const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
      const t = tickets.find((tk: any) => tk.id === ticket.id);
      if (t && !t.escalated) {
        t.escalated = true;
        localStorage.setItem('supportTickets', JSON.stringify(tickets));
        this.messages.push({ sender: 'ai', message: `Your ticket ${ticket.id} has not been responded to within 24 hours. Please contact our support team.`, timestamp: new Date() });
      }
    });
  }
}