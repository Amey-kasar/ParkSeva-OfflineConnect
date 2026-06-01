import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { interval, Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';

interface IncidentStatus {
  status: 'NORMAL' | 'ALERT' | 'ESCALATED';
  timestamp?: string;
  type?: string;
  acknowledged?: boolean;
}

interface CurrentIncident {
  id: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'FALSE_ALARM' | 'ESCALATED';
  type: string;
  location: string;
  timestamp: string;
  description?: string;
  escalation_time?: number;
}

interface Evidence {
  filename: string;
  timestamp: string;
  url: string;
}

@Component({
  selector: 'app-safety-console',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './safety-console.component.html',
  styleUrls: ['./safety-console.component.css']
})
export class SafetyConsoleComponent implements OnInit, OnDestroy {
  private BACKEND_URL = 'http://localhost:5055';
  private pollSubscription?: Subscription;
  private countdownSubscription?: Subscription;
  private lastGateOpenedIncidentId: string | null = null;

  incidentStatus: IncidentStatus = { status: 'NORMAL' };
  currentIncident: CurrentIncident | null = null;
  evidenceList: Evidence[] = [];
  cameraFeedUrl: string;
  loading = false;
  feedError = false;
  actionTaken = false;
  countdown = 0;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer, private apiService: ApiService) {
    this.cameraFeedUrl = 'http://localhost:5055/video_feed';
  }

  ngOnInit() {
    this.loadIncidentStatus();
    this.loadCurrentIncident();
    this.loadEvidence();
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
    this.countdownSubscription?.unsubscribe();
  }

  startPolling() {
    this.pollSubscription = interval(3000).subscribe(() => {
      this.loadIncidentStatus();
      this.loadCurrentIncident();
      this.loadEvidence();
    });
  }

  stopPolling() {
    this.pollSubscription?.unsubscribe();
  }

  loadIncidentStatus() {
    this.http.get<IncidentStatus>(`${this.BACKEND_URL}/api/status`).subscribe({
      next: (data) => this.incidentStatus = data,
      error: (err) => console.error('Failed to load status:', err)
    });
  }

  loadCurrentIncident() {
    this.http.get<CurrentIncident>(`${this.BACKEND_URL}/api/incident/current`).subscribe({
      next: (data) => {
        this.currentIncident = data;
        if (data && data.status === 'PENDING' && this.lastGateOpenedIncidentId !== data.id) {
          this.apiService.openGateD().subscribe({
            next: () => {
              console.log("Gate opened");
            },
            error: (err) => {
              console.log("Gate failed", err);
            }
          });
          this.lastGateOpenedIncidentId = data.id;
        }
        if (data && data.status === 'PENDING' && data.escalation_time) {
          this.startCountdown(data.escalation_time);
        } else {
          this.countdown = 0;
          this.countdownSubscription?.unsubscribe();
        }
        if (data && data.status !== 'PENDING') {
          this.actionTaken = true;
        } else {
          this.actionTaken = false;
        }
      },
      error: (err) => {
        this.currentIncident = null;
        console.error('Failed to load current incident:', err);
      }
    });
  }

  startCountdown(escalationTime: number) {
    this.countdownSubscription?.unsubscribe();
    this.countdown = Math.max(0, escalationTime);
    this.countdownSubscription = interval(1000).subscribe(() => {
      this.countdown = Math.max(0, this.countdown - 1);
    });
  }

  loadEvidence() {
    this.http.get<any[]>(`http://127.0.0.1:5055/api/evidence`).subscribe({
      next: (data) => {
        this.evidenceList = data.map(item => ({
          filename: item.filename,
          timestamp: item.timestamp,
          url: `http://127.0.0.1:5055/api/evidence/${item.filename}`
        }));
      },
      error: (err) => console.error('Failed to load evidence:', err)
    });
  }

  acknowledgeIncident() {
    this.loading = true;
    this.http.post(`${this.BACKEND_URL}/api/acknowledge`, {}).subscribe({
      next: () => {
        this.loading = false;
        this.loadIncidentStatus();
      },
      error: (err) => {
        console.error('Failed to acknowledge:', err);
        this.loading = false;
      }
    });
  }

  acknowledgeCurrentIncident() {
    this.http.post(`${this.BACKEND_URL}/api/incident/acknowledge`, {}).subscribe({
      next: () => {
        this.actionTaken = true;
        this.loadCurrentIncident();
      },
      error: (err) => console.error('Failed to acknowledge:', err)
    });
  }

  markFalseAlarm() {
    this.loading = true;
    this.http.post(`${this.BACKEND_URL}/api/false-alarm`, {}).subscribe({
      next: () => {
        this.loading = false;
        this.loadIncidentStatus();
      },
      error: (err) => {
        console.error('Failed to mark false alarm:', err);
        this.loading = false;
      }
    });
  }

  markCurrentFalseAlarm() {
    this.http.post(`${this.BACKEND_URL}/api/incident/false_alarm`, {}).subscribe({
      next: () => {
        this.actionTaken = true;
        this.loadCurrentIncident();
      },
      error: (err) => console.error('Failed to mark false alarm:', err)
    });
  }

  escalateIncident() {
    this.loading = true;
    this.http.post(`${this.BACKEND_URL}/api/escalate`, {}).subscribe({
      next: () => {
        this.loading = false;
        this.loadIncidentStatus();
      },
      error: (err) => {
        console.error('Failed to escalate:', err);
        this.loading = false;
      }
    });
  }

  escalateCurrentIncident() {
    this.http.post(`${this.BACKEND_URL}/api/incident/escalate`, {}).subscribe({
      next: () => {
        this.actionTaken = true;
        this.loadCurrentIncident();
      },
      error: (err) => console.error('Failed to escalate:', err)
    });
  }

  getStatusClass(): string {
    switch(this.incidentStatus.status) {
      case 'ALERT': return 'status-alert';
      case 'ESCALATED': return 'status-escalated';
      default: return 'status-normal';
    }
  }

  getIncidentBannerClass(): string {
    return this.currentIncident?.status === 'ESCALATED' ? 'banner-escalated' : 'banner-pending';
  }

  getIncidentStatusClass(): string {
    if (!this.currentIncident) return '';
    switch(this.currentIncident.status) {
      case 'PENDING': return 'incident-pending';
      case 'ACKNOWLEDGED': return 'incident-acknowledged';
      case 'FALSE_ALARM': return 'incident-false-alarm';
      case 'ESCALATED': return 'incident-escalated';
      default: return '';
    }
  }

  onFeedError() {
    this.feedError = true;
    console.error('Camera feed error. Check if Python backend is running on http://localhost:5055');
  }

  retryFeed() {
    this.feedError = false;
    this.cameraFeedUrl = `http://localhost:5055/video_feed?t=${Date.now()}`;
  }
}
