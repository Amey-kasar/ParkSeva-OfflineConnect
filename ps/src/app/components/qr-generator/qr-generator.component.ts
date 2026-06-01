import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-qr-generator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="qr-container">
      <h3>Vehicle QR Code</h3>
      <div class="qr-code">
        <img [src]="qrCodeUrl" alt="QR Code" *ngIf="qrCodeUrl">
      </div>
      <p class="vehicle-info">Vehicle: {{vehicleNumber}}</p>
      <div class="qr-actions">
        <button class="btn-download" (click)="downloadQR()">📥 Download</button>
        <button class="btn-print" (click)="printQR()">🖨️ Print</button>
      </div>
    </div>
  `,
  styles: [`
    .qr-container {
      text-align: center;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin: 10px 0;
      background: white;
    }
    
    .qr-container h3 {
      margin: 0 0 15px 0;
      color: #333;
    }
    
    .qr-code {
      margin: 20px 0;
    }
    
    .qr-code img {
      max-width: 200px;
      height: auto;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 10px;
      background: white;
    }
    
    .vehicle-info {
      margin: 15px 0;
      font-weight: bold;
      color: #333;
      font-size: 1.1rem;
    }
    
    .qr-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 20px;
    }
    
    .btn-download, .btn-print {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    
    .btn-download:hover, .btn-print:hover {
      background: #0056b3;
    }
    
    .btn-print {
      background: #28a745;
    }
    
    .btn-print:hover {
      background: #1e7e34;
    }
  `]
})
export class QrGeneratorComponent implements OnInit {
  @Input() vehicleNumber: string = '';
  qrCodeUrl: string = '';

  async ngOnInit() {
    if (this.vehicleNumber) {
      await this.generateQR();
    }
  }

  async generateQR() {
    try {
      const qrData = JSON.stringify({
        vehicleNumber: this.vehicleNumber,
        timestamp: new Date().toISOString(),
        type: 'parking'
      });

      this.qrCodeUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  downloadQR() {
    if (this.qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `vehicle-${this.vehicleNumber}-qr.svg`;
      link.href = this.qrCodeUrl;
      link.click();
    }
  }

  printQR() {
    if (this.qrCodeUrl) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(`
        <html>
          <head>
            <title>Vehicle QR Code - ${this.vehicleNumber}</title>
            <style>
              body {
                text-align: center;
                font-family: Arial, sans-serif;
                margin: 20px;
              }
              .qr-print {
                border: 2px solid #333;
                padding: 20px;
                display: inline-block;
                border-radius: 8px;
              }
              h2 {
                margin: 0 0 15px 0;
                color: #333;
              }
              .vehicle-number {
                font-size: 18px;
                font-weight: bold;
                margin: 15px 0;
              }
              .instructions {
                font-size: 12px;
                color: #666;
                margin-top: 15px;
              }
              @media print {
                body { margin: 0; }
                .qr-print { border: 1px solid #333; }
              }
            </style>
          </head>
          <body>
            <div class="qr-print">
              <h2>Parking QR Code</h2>
              <img src="${this.qrCodeUrl}" alt="QR Code" style="width: 150px; height: 150px;">
              <div class="vehicle-number">Vehicle: ${this.vehicleNumber}</div>
              <div class="instructions">Scan this code for quick vehicle exit</div>
            </div>
          </body>
        </html>
      `);
      printWindow?.document.close();
      
      setTimeout(() => {
        printWindow?.print();
      }, 500);
    }
  }
}