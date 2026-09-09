import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { LoginComponent } from './features/auth/login.component';
import { ResetPasswordComponent } from './features/auth/reset-password.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ClientsComponent } from './features/clients/clients.component';
import { ServicesComponent } from './features/services/services.component';
import { RealEstateComponent } from './features/real-estate/real-estate.component';
import { SettingsComponent } from './features/settings/settings.component';
import { AppointmentsComponent } from './features/appointments/appointments.component';
import { ProspectTemplateComponent } from './features/prospect-template/prospect-template.component';
import { GalleryComponent } from './features/gallery/gallery.component';
import { NotFoundComponent } from './features/not-found/not-found.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Auth Routes
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'auth/reset-password/:token', component: ResetPasswordComponent }
    ]
  },
  
  // Admin Shell Routes (Protected)
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent, data: { roles: ['admin'] } },
      { path: 'customers', component: ClientsComponent },
      { path: 'prospects-sheet', component: ProspectTemplateComponent },
      { path: 'services', component: ServicesComponent, data: { roles: ['admin'] } },
      { path: 'real-estate', component: RealEstateComponent, data: { roles: ['admin'] } },
      { path: 'settings', component: SettingsComponent },
      { path: 'appointments', component: AppointmentsComponent, data: { roles: ['admin'] } },
      { path: 'gallery', component: GalleryComponent, data: { roles: ['admin'] } },

      // Redirecciones y Alias en Español / Nombres anteriores
      { path: 'clients', redirectTo: 'customers', pathMatch: 'full' },
      { path: 'clientes', redirectTo: 'customers', pathMatch: 'full' },
      { path: 'crm', redirectTo: 'customers', pathMatch: 'full' },
      { path: 'prospects', redirectTo: 'prospects-sheet', pathMatch: 'full' },
      { path: 'prospectos', redirectTo: 'prospects-sheet', pathMatch: 'full' },
      { path: 'plantilla-prospectos', redirectTo: 'prospects-sheet', pathMatch: 'full' },
      { path: 'servicios', redirectTo: 'services', pathMatch: 'full' },
      { path: 'bienes-raices', redirectTo: 'real-estate', pathMatch: 'full' },
      { path: 'propiedades', redirectTo: 'real-estate', pathMatch: 'full' },
      { path: 'citas', redirectTo: 'appointments', pathMatch: 'full' },
      { path: 'agenda', redirectTo: 'appointments', pathMatch: 'full' },
      { path: 'galeria', redirectTo: 'gallery', pathMatch: 'full' },
      { path: 'configuracion', redirectTo: 'settings', pathMatch: 'full' },
      { path: 'perfil', redirectTo: 'settings', pathMatch: 'full' },
      { path: 'admin', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'inicio', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'home', redirectTo: 'dashboard', pathMatch: 'full' },

      // 404 dentro del panel administrativo
      { path: '404', component: NotFoundComponent },
      { path: 'not-found', component: NotFoundComponent },
      { path: '**', component: NotFoundComponent }
    ]
  },

  // Fallback global
  { path: '**', redirectTo: 'login' }
];

