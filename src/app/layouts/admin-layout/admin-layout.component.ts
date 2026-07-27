import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../models/user.model';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent implements OnInit {
  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  profileDropdownOpen = false;
  notificationsOpen = false;
  currentUser: User | null = null;
  currentPathLabel = 'Dashboard';

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }
  
  notifications: any[] = [];
 
  constructor(
    private authService: AuthService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.authService.currentUser$.subscribe(user => {
      Promise.resolve().then(() => {
        this.currentUser = user;
        this.generateNotifications();
        this.cdr.detectChanges();
      });
    });
  }
 
  generateNotifications(): void {
    if (!this.currentUser) {
      this.notifications = [];
      return;
    }
 
    if (this.currentUser.role === 'admin') {
      this.notifications = [
        { id: 1, text: 'Nuevo colaborador registrado: Angel Paqui', time: 'Hace 5m', unread: true },
        { id: 2, text: 'Propiedad Hudson View reservada por Alejandro Ruiz', time: 'Hace 20m', unread: true },
        { id: 3, text: 'Actualización de tarifa del servicio Notaría Pública', time: 'Hace 1h', unread: false }
      ];
    } else {
      // Personal notifications for manager
      this.notifications = [
        { id: 1, text: `¡Bienvenido al sistema, ${this.currentUser.firstName || 'Colaborador'}!`, time: 'Hace 1m', unread: true },
        { id: 2, text: 'Tu plantilla de prospectos ha sido cargada correctamente', time: 'Hace 10m', unread: true },
        { id: 3, text: 'Recuerda vincular tu WhatsApp para contactar clientes', time: 'Hace 1h', unread: false }
      ];
    }
  }
 
  ngOnInit(): void {
    // Sincronizar perfil con el backend
    this.authService.getProfile().subscribe({
      next: () => {
        this.generateNotifications();
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });

    this.updateBreadcrumbs(this.router.url);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateBreadcrumbs(event.urlAfterRedirects || event.url);
      this.mobileSidebarOpen = false;
      this.profileDropdownOpen = false;
      this.notificationsOpen = false;
      this.cdr.detectChanges();
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  toggleProfileDropdown(): void {
    this.profileDropdownOpen = !this.profileDropdownOpen;
    if (this.profileDropdownOpen) this.notificationsOpen = false;
  }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) this.profileDropdownOpen = false;
  }

  markAllNotificationsRead(): void {
    this.notifications.forEach(n => n.unread = false);
  }

  get unreadNotificationsCount(): number {
    return this.notifications.filter(n => n.unread).length;
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    const first = this.currentUser.firstName || '';
    const last = this.currentUser.lastName || '';
    if (first || last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    const name = this.currentUser.name || this.currentUser.email || '';
    return name.slice(0, 2).toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private updateBreadcrumbs(url: string): void {
    if (url.includes('/dashboard')) {
      this.currentPathLabel = 'Dashboard';
    } else if (url.includes('/clients')) {
      this.currentPathLabel = 'Clientes / CRM';
    } else if (url.includes('/prospects-sheet')) {
      this.currentPathLabel = 'Plantilla de Prospectos';
    } else if (url.includes('/services')) {
      this.currentPathLabel = 'Servicios';
    } else if (url.includes('/real-estate')) {
      this.currentPathLabel = 'Real Estate';
    } else if (url.includes('/reports')) {
      this.currentPathLabel = 'Reportes';
    } else if (url.includes('/settings')) {
      this.currentPathLabel = 'Configuración';
    } else if (url.includes('/appointments')) {
      this.currentPathLabel = 'Citas / Agenda';
    } else {
      this.currentPathLabel = 'Dashboard';
    }
  }
}
