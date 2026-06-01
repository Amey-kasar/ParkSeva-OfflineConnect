import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.css'
})
export class PaymentModalComponent {
  @Input() paymentData: any = {};
  @Output() paymentComplete = new EventEmitter<void>();
  @Output() modalClose = new EventEmitter<void>();

  selectedMethod: string = '';
  transactionId: string = '';
  walletBalance: number | null = null;
  walletTopupAmount = 0;
  walletLoading = false;

  constructor(private apiService: ApiService, private toast: ToastService) {}

  selectMethod(method: string) {
    this.selectedMethod = method;
    if (method === 'cash') {
      this.transactionId = '';
    }
    if (method === 'wallet') {
      this.fetchWalletBalance();
    }
  }

  processPayment() {
    if (this.selectedMethod === 'razorpay') {
      this.initiateRazorpayPayment();
    } else if (this.selectedMethod === 'wallet') {
      this.processWalletPayment();
    } else {
      this.processCashPayment();
    }
  }

  fetchWalletBalance() {
    this.walletLoading = true;
    this.apiService.getWalletBalance().subscribe({
      next: (result: any) => {
        this.walletBalance = Number(result?.walletBalance || 0);
        this.walletLoading = false;
      },
      error: () => {
        this.walletLoading = false;
        this.toast.error('Failed to fetch wallet balance');
      }
    });
  }

  private getApiErrorMessage(error: any, fallback: string) {
    return (
      error?.error?.error ||
      error?.error?.message ||
      error?.message ||
      fallback
    );
  }

  addWalletFunds() {
    const amount = Number(this.walletTopupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.toast.error('Enter a valid top-up amount');
      return;
    }

    this.walletLoading = true;
    this.apiService.addWalletFunds(amount).subscribe({
      next: (result: any) => {
        this.walletBalance = Number(result?.walletBalance || 0);
        this.walletTopupAmount = 0;
        this.walletLoading = false;
        this.toast.success('Wallet funds added successfully');
      },
      error: (error: any) => {
        this.walletLoading = false;
        this.toast.error(this.getApiErrorMessage(error, 'Failed to add wallet funds'));
      }
    });
  }

  initiateRazorpayPayment() {
    const orderData = {
      amount: this.paymentData.totalAmount,
      vehicleNumber: this.paymentData.vehicleNumber
    };

    this.apiService.createRazorpayOrder(orderData).subscribe({
      next: (order: any) => {
        this.openRazorpayCheckout(order);
      },
      error: (error: any) => {
        console.error('Order creation error:', error);
        this.toast.error('Failed to create payment order');
      }
    });
  }

  openRazorpayCheckout(order: any) {
    // Check if this is a mock order or if Razorpay is not available
    if (order.orderId.startsWith('order_mock_') || !(window as any).Razorpay) {
      // Simulate payment success for testing
      setTimeout(() => {
        const mockResponse = {
          razorpay_order_id: order.orderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature'
        };
        this.verifyPayment(mockResponse);
      }, 1000);
      return;
    }

    const options = {
      key: 'rzp_test_R7Bjpe4v5iTXiF',
      amount: order.amount,
      currency: order.currency,
      name: 'ParkEase',
      description: `Parking Payment - ${this.paymentData.vehicleNumber}`,
      order_id: order.orderId,
      handler: (response: any) => {
        this.verifyPayment(response);
      },
      prefill: {
        name: 'Customer',
        email: 'customer@example.com',
        contact: '9999999999'
      },
      theme: {
        color: '#3399cc'
      },
      modal: {
        ondismiss: () => {
          this.toast.warning('Payment cancelled');
        }
      }
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Razorpay error:', error);
      // Fallback to mock payment
      const mockResponse = {
        razorpay_order_id: order.orderId,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: 'mock_signature'
      };
      this.verifyPayment(mockResponse);
    }
  }

  verifyPayment(response: any) {
    const verificationData = {
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
      razorpay_signature: response.razorpay_signature || 'mock_signature',
      vehicleNumber: this.paymentData.vehicleNumber,
      amountPaid: this.paymentData.totalAmount * 100
    };

    this.apiService.verifyRazorpayPayment(verificationData).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.toast.success(`Payment of ₹${this.paymentData.totalAmount} completed successfully!`);
          this.generateReceiptAfterPayment();
        } else {
          this.toast.error('Payment verification failed');
        }
      },
      error: (error: any) => {
        console.error('Payment verification error:', error);
        this.toast.error('Payment verification failed');
      }
    });
  }

  processCashPayment() {
    const paymentRequest = {
      vehicleNumber: this.paymentData.vehicleNumber,
      paymentMethod: 'cash',
      transactionId: null,
      amountPaid: this.paymentData.totalAmount
    };

    this.apiService.createUserPayment(paymentRequest).subscribe({
      next: (response) => {
        this.toast.success(`Cash payment of ₹${this.paymentData.totalAmount} recorded successfully!`);
        this.generateReceiptAfterPayment();
      },
      error: (error) => {
        console.error('Payment error:', error);
        this.toast.error('Payment failed. Please try again.');
      }
    });
  }

  processWalletPayment() {
    const paymentRequest = {
      vehicleNumber: this.paymentData.vehicleNumber,
      amountPaid: this.paymentData.totalAmount
    };

    this.apiService.payWithWallet(paymentRequest).subscribe({
      next: (response: any) => {
        this.walletBalance = Number(response?.walletBalance || 0);
        this.toast.success(`Wallet payment of ₹${this.paymentData.totalAmount} completed successfully!`);
        this.generateReceiptAfterPayment();
      },
      error: (error: any) => {
        const message = this.getApiErrorMessage(error, 'Wallet payment failed. Please try again.');
        const balance = error?.error?.walletBalance;
        if (balance !== undefined) {
          this.walletBalance = Number(balance);
          this.toast.error(`${message}. Current balance: ₹${balance}`);
        } else {
          this.toast.error(message);
        }
      }
    });
  }

  generateReceiptAfterPayment() {
    const receiptData = {
      vehicleNumber: this.paymentData.vehicleNumber,
      entryTime: this.paymentData.entryTime || new Date(Date.now() - 2 * 60 * 60 * 1000),
      exitTime: this.paymentData.exitTime || new Date()
    };

    this.apiService.generateReceipt(receiptData).subscribe({
      next: (receiptResponse) => {
        this.downloadReceipt(receiptResponse.pdfBase64, receiptResponse.receiptNumber);
      },
      error: (error) => {
        console.error('Receipt generation error:', error);
        this.toast.warning('Payment successful but receipt generation failed');
      }
    });

    // Open exit gate after payment is complete
    this.apiService.openGate().subscribe({
      next: () => console.log('Exit gate opened after payment'),
      error: (err) => console.error('Exit gate failed:', err)
    });

    this.paymentComplete.emit();
    this.closeModal();
  }

  downloadReceipt(base64Buffer: string, receiptNumber: string) {
    try {
      const byteCharacters = atob(base64Buffer);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${receiptNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      this.toast.info('Receipt downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      this.toast.error('Failed to download receipt');
    }
  }

  closeModal() {
    this.modalClose.emit();
  }
}
