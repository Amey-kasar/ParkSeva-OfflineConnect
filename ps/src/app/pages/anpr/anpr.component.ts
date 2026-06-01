import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-anpr',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './anpr.component.html',
  styleUrls: ['./anpr.component.css']
})
export class AnprComponent implements OnInit, OnDestroy {
  // --- CONFIG ---
  private apiKey = '1187d60d0753812b132fd36daa62b9ada27c0ca5';
  private apiUrl = 'https://api.platerecognizer.com/v1/plate-reader/';
  private http = inject(HttpClient);
  private apiService = inject(ApiService);

  // --- VIEW ELEMENTS ---
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // --- STATE ---
  stream: MediaStream | null = null;
  previewUrl: string | null = null;
  isScanning = false;
  isCameraReady = false;

  plateResult: string | null = null;
  confidence: number | null = null;
  errorMessage: string | null = null;
  verifyStatus: 'idle' | 'checking' | 'found' | 'not-found' | 'error' = 'idle';
  verifyMessage: string | null = null;
  matchedEntry: any | null = null;

  ngOnInit() {
    this.startCamera();
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        this.isCameraReady = true;
      }
    } catch (err) {
      this.errorMessage = 'Camera access denied. Please ensure you have given permission.';
      console.error('Camera Error:', err);
    }
  }

  captureSnapshot() {
    if (!this.isCameraReady) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.previewUrl = canvas.toDataURL('image/jpeg');

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'snapshot.jpg', { type: 'image/jpeg' });
          this.processImage(file);
        }
      }, 'image/jpeg', 0.95);
    }
  }

  private processImage(file: File) {
    this.isScanning = true;
    this.errorMessage = null;
    this.plateResult = null;
    this.verifyStatus = 'idle';
    this.verifyMessage = null;
    this.matchedEntry = null;

    const formData = new FormData();
    formData.append('upload', file);
    formData.append('regions', 'in');

    const headers = new HttpHeaders({ 'Authorization': `Token ${this.apiKey}` });

    this.http.post<any>(this.apiUrl, formData, { headers }).subscribe({
      next: (response) => {
        setTimeout(() => {
          this.isScanning = false;
          if (response.results && response.results.length > 0) {
            const bestResult = response.results[0];
            const detectedPlate = (bestResult.plate || '').toString();
            if (!detectedPlate) {
              this.errorMessage = 'No license plate detected in this frame. Try adjusting the angle.';
              return;
            }
            this.plateResult = detectedPlate;
            this.confidence = Math.round(bestResult.score * 100);
            this.verifyPlateInRecentEntries(detectedPlate);
          } else {
            this.errorMessage = 'No license plate detected in this frame. Try adjusting the angle.';
          }
        }, 2200);
      },
      error: (err) => {
        this.isScanning = false;
        this.errorMessage = 'Network error or invalid API key.';
        console.error(err);
      }
    });
  }

  formatPlate(plate: string): string {
    if (!plate) return '';
    const cleaned = plate.replace(/[^A-Z0-9]/ig, '').toUpperCase();
    if (cleaned.length >= 7) {
      const match = cleaned.match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{4})$/);
      if (match) return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }
    return cleaned;
  }

  resetScanner() {
    this.previewUrl = null;
    this.plateResult = null;
    this.errorMessage = null;
    this.isScanning = false;
    this.verifyStatus = 'idle';
    this.verifyMessage = null;
    this.matchedEntry = null;
  }

  verifySession() {
    if (!this.plateResult) return;         
    this.verifyPlateInRecentEntries(this.plateResult);
    this.apiService.openGate();
  }

  private verifyPlateInRecentEntries(vehicleNumber: string) {
    this.verifyStatus = 'checking';
    this.verifyMessage = 'Checking prebooking...';
    this.matchedEntry = null;

    this.apiService.checkVehicleInRecentEntries(vehicleNumber).subscribe({
      next: (result) => {
        // Gate opens only when vehicle has an active prebooking (status === 'active')
        const hasPrebooking = result.exists && result.entry?.status === 'active';

        if (hasPrebooking) {
          this.verifyStatus = 'found';
          this.matchedEntry = result.entry;
          this.verifyMessage = 'Prebooking confirmed. Opening entry gate...';

          this.apiService.openGateE().subscribe({
            next: () => {
              this.verifyMessage = 'Prebooking confirmed. Entry gate opened!';
              console.log('Entry gate opened for:', vehicleNumber);
            },
            error: (err) => {
              this.verifyMessage = 'Prebooking found but gate failed to open. Check gate server.';
              console.error('Gate open failed:', err);
            }
          });
          return;
        }

        this.verifyStatus = 'not-found';
        this.verifyMessage = result.exists
          ? 'Vehicle found but no active prebooking.'
          : 'No prebooking found for this plate.';
      },
      error: (error) => {
        this.verifyStatus = 'error';
        this.verifyMessage = 'Could not verify against database. Please try again.';
        console.error('ANPR verify error:', error);
      }
    });
  }

  private stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }
}
