import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HelpCenterService {  // Renamed from ChatService
  private GEMINI_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

  private GEMINI_API_KEY = 'AIzaSyCycDt4Bulsyah8Z2jawVLJBiTxaZmxRt4';

  private predefinedAnswers: { [key: string]: string } = {
    'how to book parking': 'To book parking: 1) Go to Parking page, 2) Select location and time, 3) Choose parking spot, 4) Complete payment.',
    'payment methods': 'We accept Credit/Debit cards, UPI, Net Banking, and Digital Wallets.',
    'cancel booking': 'To cancel: Go to Dashboard > My Bookings > Select booking > Click Cancel. Refund processed within 3-5 business days.',
    'extend parking': 'You can extend parking from Dashboard > Active Bookings > Extend Time. Additional charges apply.',
    'parking rates': 'Rates vary by location. Typically ₹20-50/hour. Check specific location for exact pricing.',
    'contact support': 'Email: support@parkseva.com | Phone: 1800-123-4567 | Available 24/7',
    'refund policy': 'Cancellations before 1 hour: 100% refund. Within 1 hour: 50% refund. No-show: No refund.',
    'find parking': 'Use the search bar on Parking page, enter your location, and browse available spots nearby.'
  };

  faqs = [
    { question: 'How to book parking?', key: 'how to book parking' },
    { question: 'What payment methods are available?', key: 'payment methods' },
    { question: 'How to cancel a booking?', key: 'cancel booking' },
    { question: 'What are the parking rates?', key: 'parking rates' }
  ];

  constructor(private http: HttpClient) {}

  getSuggestions(input: string) {
    if (!input.trim()) return [];
    const lower = input.toLowerCase();
    const matched = this.faqs.filter(faq =>
      faq.question.toLowerCase().includes(lower) ||
      faq.key.includes(lower)
    );
    // Show matching suggestions
    return matched.slice(0, 3);
  }

  askGemini(message: string) {
    const lowerMessage = message.toLowerCase();

    // Check predefined answers first
    for (const [key, answer] of Object.entries(this.predefinedAnswers)) {
      if (lowerMessage.includes(key)) {
        return of({
          candidates: [{
            content: {
              parts: [{ text: answer }]
            }
          }]
        });
      }
    }

    // Smart fallback for other questions
    const response = this.getSmartResponse(lowerMessage);
    return of({
      candidates: [{
        content: {
          parts: [{ text: response }]
        }
      }]
    });
  }

  private getSmartResponse(message: string): string {
    if (message.includes('slot') || message.includes('space') || message.includes('available')) {
      return 'You can check available parking slots in real-time on our Parking page. Slots are updated every minute with live availability.';
    }
    if (message.includes('time') || message.includes('hour') || message.includes('open')) {
      return 'Our parking facilities are open 24/7. You can book slots for any duration from 1 hour to multiple days.';
    }
    if (message.includes('location') || message.includes('where') || message.includes('near')) {
      return 'We have parking locations across the city. Use the map on our Parking page to find the nearest facility to your destination.';
    }
    if (message.includes('price') || message.includes('cost') || message.includes('charge') || message.includes('fee')) {
      return 'Parking rates vary by location and duration. Typically ₹20-50/hour. Check specific locations for exact pricing and discounts.';
    }
    if (message.includes('vehicle') || message.includes('car') || message.includes('bike') || message.includes('motorcycle')) {
      return 'We support all vehicle types including cars, bikes, motorcycles, and commercial vehicles. Select your vehicle type during booking.';
    }
    if (message.includes('security') || message.includes('safe')) {
      return 'All our parking facilities have 24/7 CCTV surveillance and security personnel to ensure your vehicle safety.';
    }
    if (message.includes('receipt') || message.includes('invoice')) {
      return 'You can download receipts from Dashboard > My Bookings. Click on any booking to view and download the receipt as PDF.';
    }

    return 'I can help you with parking bookings, payments, cancellations, slot availability, and more. Please select from the FAQ options above or ask a specific question about our parking services.';
  }

  askGeminiAI(message: string) {
    const response = this.getAIResponse(message.toLowerCase());
    return of({
      candidates: [{
        content: {
          parts: [{ text: response }]
        }
      }]
    });
  }

  private getAIResponse(message: string): string {
    // Check for ticket status query
    if (message.includes('ticket') && (message.includes('status') || message.includes('check') || message.includes('tkt-') || /tkt-\d+/i.test(message))) {
      return 'CHECK_TICKET_STATUS';
    }
    
    // Check for ticket/call requests
    if (message.includes('ticket') || message.includes('raise ticket') || message.includes('call') || message.includes('talk to') || message.includes('speak to') || message.includes('human') || message.includes('agent')) {
      return 'RAISE_TICKET';
    }

    if (message.includes('book') || message.includes('reserve')) {
      return 'To book parking on ParkSeva:\n\n1. Navigate to the Parking page from the dashboard\n2. Select your desired location and time slot\n3. Choose an available parking spot\n4. Complete the payment using your preferred method\n\nYou can pay via Credit/Debit cards, UPI, Net Banking, or Digital Wallets. Once confirmed, you will receive a booking confirmation with all details.\n\nIf you need further assistance with booking, I can connect you with our support team.';
    }
    if (message.includes('pay') || message.includes('payment')) {
      return 'ParkSeva accepts multiple payment methods for your convenience:\n\nCredit/Debit Cards (Visa, Mastercard, RuPay)\nUPI (Google Pay, PhonePe, Paytm)\nNet Banking\nDigital Wallets\n\nAll transactions are secure and encrypted. You will receive instant payment confirmation and can download receipts from your Dashboard.\n\nIf you are experiencing payment issues, I can help you raise a support ticket for immediate assistance.';
    }
    if (message.includes('cancel') || message.includes('refund')) {
      return 'ParkSeva Cancellation Policy:\n\nCancel before 1 hour: 100% refund\nCancel within 1 hour: 50% refund\nNo-show: No refund\n\nTo cancel: Go to Dashboard, then My Bookings, select your booking, and click Cancel button. Refunds are processed within 3-5 business days to your original payment method.\n\nIf you need help with a specific cancellation or refund issue, I can connect you with our support team.';
    }
    if (message.includes('price') || message.includes('rate') || message.includes('cost') || message.includes('charge') || message.includes('fee')) {
      return 'ParkSeva parking rates vary by location and duration:\n\nStandard Rate: ₹20-50 per hour\nLocation-based pricing available\nDiscounts for longer durations\nSpecial rates for monthly passes\n\nYou can view exact pricing for each location on the Parking page. Rates are displayed before you confirm your booking.\n\nFor custom pricing inquiries or bulk bookings, I can help you connect with our team.';
    }
    if (message.includes('available') || message.includes('slot') || message.includes('space')) {
      return 'ParkSeva provides real-time parking availability:\n\nLive updates every minute\nVisual slot availability on map\nFilter by vehicle type\nSearch by location\n\nAll parking facilities operate 24/7. You can check current availability and book slots for any duration from 1 hour to multiple days on our Parking page.\n\nIf you cannot find available slots at your preferred location, I can help you explore alternatives or raise a ticket for assistance.';
    }
    if (message.includes('location') || message.includes('where') || message.includes('near') || message.includes('find')) {
      return 'ParkSeva has parking facilities across the city:\n\nUse the interactive map on our Parking page\nSearch by address or landmark\nFind nearest facility to your destination\nAll locations have 24/7 access\n\nEach location shows real-time availability, pricing, and amenities. Select any location to view detailed information and book your spot.\n\nIf you need help finding a specific location, I can assist you further or connect you with support.';
    }
    if (message.includes('vehicle') || message.includes('car') || message.includes('bike') || message.includes('motorcycle')) {
      return 'ParkSeva supports all vehicle types:\n\nCars (Sedan, SUV, Hatchback)\nMotorcycles\nScooters\nCommercial vehicles\n\nSelect your vehicle type during booking to ensure proper space allocation. Different vehicle types may have different pricing.\n\nFor special vehicle requirements or large vehicles, please let me know and I can help you raise a support request.';
    }
    if (message.includes('security') || message.includes('safe') || message.includes('cctv')) {
      return 'Your vehicle safety is our priority:\n\n24/7 CCTV surveillance\nSecurity personnel on-site\nSecure entry/exit gates\nReal-time monitoring\nInsurance coverage available\n\nAll ParkSeva facilities are equipped with modern security systems to ensure your vehicle is safe throughout your parking duration.\n\nFor security concerns or incidents, please let me know immediately and I will escalate to our security team.';
    }
    if (message.includes('extend') || message.includes('increase time') || message.includes('more time')) {
      return 'You can easily extend your parking time:\n\n1. Go to Dashboard\n2. Navigate to Active Bookings\n3. Select your current booking\n4. Click Extend Time\n5. Choose additional duration\n6. Pay the additional charges\n\nExtension rates are calculated based on the hourly rate of your location. You can extend multiple times as needed.\n\nIf you are having trouble extending your booking, I can help you raise a support ticket.';
    }
    if (message.includes('receipt') || message.includes('invoice') || message.includes('bill') || message.includes('download')) {
      return 'Download your parking receipts easily:\n\n1. Go to Dashboard\n2. Click on My Bookings\n3. Select any completed booking\n4. Click Download Receipt button\n\nReceipts are available in PDF format and include all booking details, payment information, and GST breakdown. You can download receipts anytime from your booking history.\n\nIf you cannot access your receipt, I can help you raise a support ticket to get it emailed to you.';
    }
    if (message.includes('contact') || message.includes('support') || message.includes('help')) {
      return 'I am here to help you with any ParkSeva queries. I can assist with:\n\nBooking and reservations\nPayment issues\nCancellations and refunds\nLocation information\nAccount management\n\nIf you need to speak with a human agent, just let me know and I will raise a support ticket for you.';
    }
    if (message.includes('dashboard') || message.includes('history') || message.includes('my booking')) {
      return 'Your ParkSeva Dashboard provides:\n\nActive bookings overview\nComplete booking history\nPayment records\nDownload receipts\nAccount settings\nSupport tickets\n\nAccess your dashboard anytime to manage all your parking bookings and view detailed information about past and current reservations.\n\nIf you are having trouble accessing your dashboard, I can help you troubleshoot or raise a support ticket.';
    }
    if (message.includes('hour') || message.includes('time') || message.includes('open') || message.includes('close') || message.includes('timing')) {
      return 'ParkSeva Facilities:\n\nOpen 24/7, 365 days\nBook for any duration (1 hour to multiple days)\nAdvance booking available\nFlexible timing options\n\nYou can book parking slots at any time of day or night. Our facilities never close, ensuring you always have a parking option available.';
    }

    // Complex query - analyze and provide thoughtful response
    return 'I understand you have a specific query about ParkSeva. Let me help you with that.\n\nBased on your question, I recommend:\n\n1. Check the relevant section in your Dashboard for detailed information\n2. Review our FAQ section for common solutions\n3. Contact our support team for personalized assistance\n\nIf you would like me to connect you with our support team for detailed assistance, please let me know and I will raise a support ticket. Our team will contact you at +91 78220 71695.\n\nAlternatively, you can describe your issue in more detail and I will do my best to provide a solution.';
  }

  createTicket(payload: any) {
    const ticket = {
      id: 'TKT-' + Date.now(),
      ...payload,
      status: 'OPEN',
      createdAt: new Date(),
      response: null
    };

    const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    tickets.push(ticket);
    localStorage.setItem('supportTickets', JSON.stringify(tickets));

    return of(ticket);
  }

  createTicketWithContact(payload: any) {
    const chatHistory = this.loadChatHistory();
    const ticket = {
      id: 'TKT-' + Date.now(),
      ...payload,
      status: 'OPEN',
      priority: 'HIGH',
      createdAt: new Date(),
      escalationTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      response: null,
      chatHistory: chatHistory,
      supportContact: { name: 'Sankalp', phone: '+91 78220 71695' }
    };

    const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    tickets.push(ticket);
    localStorage.setItem('supportTickets', JSON.stringify(tickets));

    return of(ticket);
  }

  checkPendingTickets() {
    const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    const now = new Date().getTime();
    
    return tickets.filter((t: any) => 
      t.status === 'OPEN' && 
      !t.escalated && 
      new Date(t.escalationTime).getTime() <= now
    );
  }

  getTicketById(ticketId: string) {
    const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    return tickets.find((t: any) => t.id.toLowerCase() === ticketId.toLowerCase());
  }

  saveChatHistory(messages: any[]) {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }

  loadChatHistory() {
    return JSON.parse(localStorage.getItem('chatHistory') || '[]');
  }

  clearChatHistory() {
    localStorage.removeItem('chatHistory');
  }

  updateTicket(ticketId: string, response: string) {
    const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    const ticket = tickets.find((t: any) => t.id === ticketId);
    if (ticket) {
      ticket.response = response;
      ticket.status = 'RESPONDED';
      ticket.respondedAt = new Date();
      localStorage.setItem('supportTickets', JSON.stringify(tickets));
    }
    return of(ticket);
  }

  addMessageToTicket(ticketId: string, message: string, sender: string) {
    const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    const ticket = tickets.find((t: any) => t.id === ticketId);
    if (ticket) {
      if (!ticket.conversation) {
        ticket.conversation = [];
      }
      ticket.conversation.push({
        sender: sender,
        message: message,
        timestamp: new Date()
      });
      localStorage.setItem('supportTickets', JSON.stringify(tickets));
    }
    return of(ticket);
  }

  requestCall(ticketId: string) {
    const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    const ticket = tickets.find((t: any) => t.id === ticketId);
    if (ticket) {
      ticket.status = 'CALL_REQUESTED';
      ticket.supportContact = { name: 'Sankalp', phone: '+91 78220 71695' };
      localStorage.setItem('supportTickets', JSON.stringify(tickets));
    }
    return of(ticket);
  }

  closeTicket(ticketId: string) {
    const tickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    const ticket = tickets.find((t: any) => t.id === ticketId);
    if (ticket) {
      ticket.status = 'CLOSED';
      ticket.closedAt = new Date();
      localStorage.setItem('supportTickets', JSON.stringify(tickets));
    }
    return of(ticket);
  }

  submitCSAT(payload: any) {
    return this.http.post('/api/support/csat', payload);
  }
}
