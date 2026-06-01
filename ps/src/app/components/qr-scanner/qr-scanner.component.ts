import { Component, EventEmitter, Output, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsQR from 'jsqr';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="qr-scanner">
      <div class="scanner-tabs">
        <button [class.active]="scanMode === 'camera'" (click)="scanMode = 'camera'"> Camera</button>
        <button [class.active]="scanMode === 'upload'" (click)="scanMode = 'upload'">Upload</button>
        <button [class.active]="scanMode === 'manual'" (click)="scanMode = 'manual'"> Manual</button>
      </div>

      <!-- Camera Scanner -->
      <div *ngIf="scanMode === 'camera'" class="camera-scanner">
        <video #video [style.display]="cameraActive ? 'block' : 'none'"
               width="300" height="200" autoplay></video>
        <canvas #canvas style="display: none;" width="300" height="200"></canvas>

        <div class="camera-controls">
          <button *ngIf="!cameraActive" (click)="startCamera()" class="btn-start">Start Camera</button>
          <button *ngIf="cameraActive" (click)="stopCamera()" class="btn-stop">Stop Camera</button>
          <p *ngIf="cameraActive && scanning" class="scanning-text"> Scanning for QR codes...</p>
        </div>

        <p *ngIf="!hasCamera" class="error">No camera available</p>
      </div>

      <!-- File Upload -->
      <div *ngIf="scanMode === 'upload'" class="upload-scanner">
        <input type="file" accept="image/*" (change)="onFileSelected($event)" #fileInput>
        <div class="upload-area" (click)="fileInput.click()">
          <p>📷 Click to upload QR code image</p>
          <small>Supports JPG, PNG, GIF</small>
        </div>
      </div>

      <!-- Manual Entry -->
      <div *ngIf="scanMode === 'manual'" class="manual-scanner">
        <input type="text"
               [(ngModel)]="manualInput"
               placeholder="Enter vehicle number"
               (keyup.enter)="processManualInput()"
               class="manual-input">
        <button (click)="processManualInput()"
                [disabled]="!manualInput.trim()"
                class="btn-manual">Search Vehicle</button>
      </div>

      <!-- Result Display -->
      <div *ngIf="scannedResult" class="scan-result">
        <p><strong>Detected:</strong> {{scannedResult}}</p>
        <button (click)="confirmResult()" class="btn-confirm">Confirm</button>
        <button (click)="clearResult()" class="btn-clear">Clear</button>
      </div>
    </div>
  `,
  styles: [`
    .qr-scanner {
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #f9f9f9;
    }

    .scanner-tabs {
      display: flex;
      margin-bottom: 20px;
      border-bottom: 2px solid #eee;
    }

    .scanner-tabs button {
      flex: 1;
      padding: 10px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }

    .scanner-tabs button.active {
      background: #007bff;
      color: white;
      border-bottom-color: #007bff;
    }

    .camera-scanner {
      text-align: center;
    }

    .camera-scanner video {
      border: 2px solid #007bff;
      border-radius: 8px;
      margin-bottom: 10px;
    }

    .camera-controls {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 10px;
    }

    .upload-scanner .upload-area {
      border: 2px dashed #007bff;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      border-radius: 8px;
      background: white;
    }

    .upload-scanner .upload-area:hover {
      background: #f0f8ff;
    }

    .manual-scanner {
      display: flex;
      gap: 10px;
    }

    .manual-input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .scan-result {
      margin-top: 20px;
      padding: 15px;
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
      text-align: center;
    }

    .btn-start, .btn-capture, .btn-confirm {
      background: #28a745;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }

    .btn-stop, .btn-clear {
      background: #dc3545;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }

    .btn-manual {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
    }

    .btn-manual:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .error {
      color: #dc3545;
      font-style: italic;
    }

    .scanning-text {
      color: #28a745;
      font-weight: bold;
      margin: 10px 0;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
  `]
})
export class QrScannerComponent implements OnDestroy {
  @Output() vehicleFound = new EventEmitter<string>();
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  scanMode: 'camera' | 'upload' | 'manual' = 'manual';
  cameraActive = false;
  hasCamera = false;
  manualInput = '';
  scannedResult = '';
  scanning = false;

  private stream: MediaStream | null = null;
  private animationFrame: number | null = null;

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      if (this.video && this.stream) {
        this.video.nativeElement.srcObject = this.stream;
        this.cameraActive = true;
        this.hasCamera = true;
        this.startScanning();
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      this.hasCamera = false;
      this.scanMode = 'manual';
    }
  }

  stopCamera() {
    this.scanning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.cameraActive = false;
  }

  startScanning() {
    this.scanning = true;
    this.scanFrame();
  }

  scanFrame() {
    if (!this.scanning || !this.video || !this.canvas) return;

    const video = this.video.nativeElement;
    const canvas = this.canvas.nativeElement;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        this.processQRResult(code.data);
        return;
      }
    }

    this.animationFrame = requestAnimationFrame(() => this.scanFrame());
  }

  processQRResult(data: string) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.vehicleNumber) {
        this.scannedResult = parsed.vehicleNumber;
      } else {
        this.scannedResult = data;
      }
    } catch {
      this.scannedResult = data;
    }
    this.stopCamera();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
              this.processQRResult(code.data);
            } else {
              alert('No QR code found in image');
            }
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  processManualInput() {
    if (this.manualInput.trim()) {
      this.scannedResult = this.manualInput.trim();
    }
  }

  confirmResult() {
    if (this.scannedResult) {
      this.vehicleFound.emit(this.scannedResult);
      this.clearResult();
      this.stopCamera();
    }
  }

  clearResult() {
    this.scannedResult = '';
    this.manualInput = '';
  }

  ngOnDestroy() {
    this.stopCamera();
  }
}
