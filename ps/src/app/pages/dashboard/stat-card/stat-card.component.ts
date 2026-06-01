import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat-card" [ngClass]="theme">
      <div class="icon-box">
        <i [class]="icon"></i>
      </div>
      <div class="stat-info">
        <span class="stat-title">{{ title }}</span>
        <span class="stat-value">{{ value }}</span>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      border: 1px solid #f1f5f9;
      transition: transform 0.2s;
    }
    .stat-card:hover { transform: translateY(-2px); }
    
    .icon-box {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }

    .stat-info { display: flex; flex-direction: column; }
    .stat-title { font-size: 0.75rem; color: #64748b; font-weight: 500; }
    .stat-value { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-top: 2px; }

    /* Themes */
    .primary .icon-box { background: #eff6ff; color: #3b82f6; } /* Blue */
    .success .icon-box { background: #f0fdf4; color: #22c55e; } /* Green */
    .warning .icon-box { background: #fefce8; color: #eab308; } /* Yellow */
    .secondary .icon-box { background: #f8fafc; color: #64748b; } /* Gray */
  `]
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = 0;
  @Input() icon: string = '';
  @Input() theme: 'primary' | 'success' | 'warning' | 'secondary' = 'primary';
}