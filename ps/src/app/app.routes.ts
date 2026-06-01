import { Routes } from '@angular/router';

// --- LAYOUTS ---
import { LayoutComponent } from './components/layout/layout.component'; // Ensure path is correct

// --- PUBLIC PAGES ---
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { AdminRegisterComponent } from './pages/admin-register/admin-register.component';
import { LocationFinderComponent } from './pages/location-finder/location-finder.component';

// --- PROTECTED PAGES ---
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { ParkingComponent } from './pages/parking/parking.component';
import { ActiveSessionComponent } from './pages/active-session/active-session.component';
import { SlotsComponent } from './pages/slots/slots.component';
import { SlotOverviewComponent } from './pages/slot-overview/slot-overview.component';
import { PaymentsComponent } from './pages/payments/payments.component';
import { HistoryComponent } from './pages/history/history.component';
import { HelpCenterComponent } from './pages/chat/chat.component';
import { AdminComponent } from './pages/admin/admin.component';
import { SafetyConsoleComponent } from './pages/safety-console/safety-console.component';
import { SupportCenterComponent } from './pages/support-center/support.component';

// NEW: Import the ANPR Scanner Component
import { AnprComponent } from './pages/anpr/anpr.component'; 

// --- GUARDS ---
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  // ==========================================
  // 1. PUBLIC ROUTES (No Sidebar/Header)
  // ==========================================
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'admin-register', component: AdminRegisterComponent },
  { path: 'locations', component: LocationFinderComponent },

  // ==========================================
  // 2. PROTECTED APP SHELL (Layout + Children)
  // ==========================================
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard], // Protects all child routes below
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'admin-dashboard', component: AdminDashboardComponent },

      // Parking & Slots
      { path: 'parking', component: ParkingComponent },
      { path: 'activesession', component: ActiveSessionComponent },
      { path: 'slots', component: SlotsComponent },
      { path: 'slotoverview', component: SlotOverviewComponent },

      // Management
      { path: 'payments', component: PaymentsComponent },
      { path: 'history', component: HistoryComponent },
      { path: 'admin', component: AdminComponent },

      // Support & Tools
      { path: 'chat', component: HelpCenterComponent },
      { path: 'chat-full', component: HelpCenterComponent },
      { path: 'support-center', component: SupportCenterComponent },
      { path: 'safety-console', component: SafetyConsoleComponent },
      
      // NEW: ANPR Route added here
      { path: 'anpr', component: AnprComponent }, 
    ]
  },

  // ==========================================
  // 3. FALLBACK
  // ==========================================
  { path: '**', redirectTo: '' }
];  