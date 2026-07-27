import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { ReportService, ChartDataPoint } from '../../core/services/report.service';
import { DashboardStats } from '../../models/stats.model';
import { ActivityLog } from '../../models/activity.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats!: DashboardStats;
  recentActivities: ActivityLog[] = [];
  isLoading = true;

  // Chart data
  clientsByService: ChartDataPoint[] = [];
  clientsByStatus: ChartDataPoint[] = [];
  propertiesByStatus: ChartDataPoint[] = [];
  monthlyEvolution: ChartDataPoint[] = [];

  constructor(
    private dashboardService: DashboardService,
    private reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;

    forkJoin({
      stats: this.dashboardService.getStats(),
      activities: this.dashboardService.getRecentActivities(),
      clientsByService: this.reportService.getClientsByService(),
      clientsByStatus: this.reportService.getClientsByStatus(),
      propertiesByStatus: this.reportService.getPropertiesByStatus(),
      monthlyEvolution: this.reportService.getMonthlyClientEvolution()
    }).subscribe({
      next: (results) => {
        if (results.stats.success && results.stats.data) {
          const statsData = results.stats.data as any;
          this.stats = {
            ...statsData,
            activeServices: statsData.servicesActive || statsData.activeServices || 0
          };
        }

        if (results.activities.success && results.activities.data) {
          this.recentActivities = results.activities.data.map((act: any) => ({
            id: act._id || act.id || '',
            userId: act.userId?._id || act.userId || '',
            userName: act.userId ? `${act.userId.firstName || ''} ${act.userId.lastName || ''}`.trim() : 'Sistema',
            action: act.description || act.action || '',
            timestamp: act.createdAt || act.timestamp || '',
            type: act.module || act.type || 'system'
          })).slice(0, 5);
        }

        if (results.clientsByService.success && results.clientsByService.data) {
          this.clientsByService = results.clientsByService.data.map((item: any) => ({
            name: item._id?.name || item.name || 'Otros',
            value: item.count || item.value || 0
          })).slice(0, 5);
        }

        if (results.clientsByStatus.success && results.clientsByStatus.data) {
          const rawClientsByStatus = results.clientsByStatus.data;
          const totalClients = rawClientsByStatus.reduce((acc: number, curr: any) => acc + (curr.count || curr.value || 0), 0);
          const statusLabels: Record<string, string> = {
            'prospect': 'Prospecto',
            'active': 'Activo',
            'in_process': 'En Proceso',
            'inactive': 'Inactivo',
            'closed': 'Cerrado'
          };
          this.clientsByStatus = rawClientsByStatus.map((item: any) => {
            const nameKey = item._id || item.name || '';
            return {
              name: statusLabels[nameKey] || nameKey,
              value: item.count || item.value || 0,
              percentage: totalClients > 0 ? Math.round(((item.count || item.value || 0) / totalClients) * 100) : 0
            };
          });
        }

        if (results.propertiesByStatus.success && results.propertiesByStatus.data) {
          const rawPropsByStatus = results.propertiesByStatus.data;
          const totalProps = rawPropsByStatus.reduce((acc: number, curr: any) => acc + (curr.count || curr.value || 0), 0);
          const propLabels: Record<string, string> = {
            'available': 'Disponible',
            'reserved': 'Reservada',
            'sold': 'Vendida',
            'rented': 'Rentada',
            'inactive': 'Inactiva'
          };
          this.propertiesByStatus = rawPropsByStatus.map((item: any) => {
            const nameKey = item._id || item.name || '';
            return {
              name: propLabels[nameKey] || nameKey,
              value: item.count || item.value || 0,
              percentage: totalProps > 0 ? Math.round(((item.count || item.value || 0) / totalProps) * 100) : 0
            };
          });
        }

        if (results.monthlyEvolution.success && results.monthlyEvolution.data) {
          this.monthlyEvolution = results.monthlyEvolution.data.map((item: any) => ({
            name: item.label || item.name || item._id || '',
            value: item.count || item.value || 0
          }));
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('DashboardComponent: forkJoin error caught!', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getActivityBg(type: string): string {
    switch (type) {
      case 'client': return 'rgba(16, 185, 129, 0.1)';
      case 'service': return 'rgba(59, 130, 246, 0.1)';
      case 'property': return 'rgba(245, 158, 11, 0.1)';
      case 'auth': return 'rgba(100, 116, 139, 0.1)';
      default: return 'rgba(226, 232, 240, 0.5)';
    }
  }

  getActivityColor(type: string): string {
    switch (type) {
      case 'client': return 'var(--color-success)';
      case 'service': return 'var(--color-info)';
      case 'property': return 'var(--color-warning)';
      case 'auth': return 'var(--color-text-muted)';
      default: return 'var(--color-text-main)';
    }
  }
}
