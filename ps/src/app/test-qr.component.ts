import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QrGeneratorComponent } from './components/qr-generator/qr-generator.component';
import { QrScannerComponent } from './components/qr-scanner/qr-scanner.component';

@Component({
  selector: 'app-test-qr',
  standalone: true,
  imports: [CommonModule, QrGeneratorComponent, QrScannerComponent],
  template: `
    <div style="padding: 20px;">
      <h2>QR Code Test</h2>
      
      <div style="margin: 20px 0;">
        <h3>QR Generator Test</h3>
        <app-qr-generator vehicleNumber="TEST123"></app-qr-generator>
      </div>
      
      <div style="margin: 20px 0;">
        <h3>QR Scanner Test</h3>
        <app-qr-scanner (vehicleFound)="onVehicleFound($event)"></app-qr-scanner>
      </div>
      
      <div *ngIf="foundVehicle" style="margin: 20px 0; padding: 15px; background: #d4edda; border-radius: 5px;">
        <strong>Found Vehicle: {{foundVehicle}}</strong>
      </div>
    </div>
  `
})
export class TestQrComponent {
  foundVehicle = '';

  onVehicleFound(vehicleNumber: string) {
    this.foundVehicle = vehicleNumber;
    console.log('Vehicle found:', vehicleNumber);
  }
}