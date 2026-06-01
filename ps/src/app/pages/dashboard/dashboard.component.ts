import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { forkJoin } from 'rxjs';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';

// Child Component
import { StatCardComponent } from './stat-card/stat-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    ChartModule,
    TagModule,
    ProgressBarModule,
    StatCardComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  // ====== KPI STATS ======
  stats = {
    totalVehicles: 0,
    activeEntries: 0,
    availableSlots: 0,
    dailyRevenue: 0
  };

  // ====== AI / INSIGHTS ======
  aiSummary = 'Traffic is stable. Predicted influx at 6:00 PM based on local event data.';
  aiPredictions = {
    peakTime: '6:00 PM',
    riskLevel: 'Low'
  };

  // ====== CSAT ======
  csatScore = 92;
  csatTotal = 127;
  sentiments = {
    positive: 80,
    neutral: 15,
    negative: 5
  };

  // ====== CHARTS ======
  occupancyChartData: any;
  revenueChartData: any;
  donutOptions: any;
  chartOptions: any;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.initializeCharts();
    this.loadStats();
  }

  initializeCharts() {
    // 1. Donut Chart (Occupancy)
    this.occupancyChartData = {
      labels: ['Occupied', 'Available'],
      datasets: [
        {
          data: [0, 100], // Init with placeholder
          backgroundColor: ['#2563eb', '#e2e8f0'], // Blue 600, Slate 200
          hoverBackgroundColor: ['#1d4ed8', '#cbd5e1'],
          borderWidth: 0
        }
      ]
    };

    this.donutOptions = {
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false } // Minimal look
      },
      responsive: true,
      maintainAspectRatio: false
    };

    // 2. Line Chart (Revenue Trend)
    this.revenueChartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Occupancy',
          data: [65, 59, 80, 81, 56, 55, 40],
          fill: true,
          borderColor: '#10b981', // Emerald 500
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4
        },
        {
          label: 'Revenue',
          data: [28, 48, 40, 19, 86, 27, 90],
          fill: true,
          borderColor: '#3b82f6', // Blue 500
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4
        }
      ]
    };

    this.chartOptions = {
      plugins: {
        legend: { 
            display: true,
            labels: { usePointStyle: true, boxWidth: 6, font: { size: 10 } } 
        }
      },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 }, color: '#94a3b8' }
        },
        y: {
          display: false, // Hide Y axis for cleaner look
          grid: { display: false }
        }
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
    };
  }

  loadStats() {
    // In a real scenario, check if methods exist. 
    // This example assumes ApiService works or falls back gracefully.
    
    // Simulate API delay or fetch real data
    // For now, we manually set data to match your requirements
    this.stats = {
      totalVehicles: 142,
      activeEntries: 86,
      availableSlots: 34,
      dailyRevenue: 12500
    };

    // Update Chart Data
    this.occupancyChartData.datasets[0].data = [
      this.stats.activeEntries, 
      this.stats.availableSlots
    ];
    // Force chart refresh requires reassigning the object in some chart versions, 
    // or PrimeNG detects changes in the data object properties.
    this.occupancyChartData = { ...this.occupancyChartData };
  }

  // --- Helpers ---
  getOccupancyPercentage(): number {
    const total = this.stats.activeEntries + this.stats.availableSlots;
    return total > 0 ? Math.round((this.stats.activeEntries / total) * 100) : 0;
  }

  getTargetProgress(): number {
    const target = 15000;
    return Math.min(Math.round((this.stats.dailyRevenue / target) * 100), 100);
  }

  exportPDF() {
    console.log('Exporting Dashboard PDF...');
  }
}