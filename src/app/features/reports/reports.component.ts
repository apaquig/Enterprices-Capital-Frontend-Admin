import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ReportService, ChartDataPoint } from '../../core/services/report.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  // Datasets
  clientsByService: ChartDataPoint[] = [];
  clientsByStatus: ChartDataPoint[] = [];
  clientsBySource: ChartDataPoint[] = [];
  monthlyClientEvolution: ChartDataPoint[] = [];
  propertiesByStatus: ChartDataPoint[] = [];
  propertiesByCity: ChartDataPoint[] = [];
  revenueDistribution: ChartDataPoint[] = [];

  // Financial aggregates
  totalEstimatedRevenue = 0;
  realEstateRevenue = 0;
  serviceRevenue = 0;

  isLoading = true;

  constructor(
    private reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReportData();
  }

  loadReportData(): void {
    this.isLoading = true;

    forkJoin({
      clientsByService: this.reportService.getClientsByService(),
      clientsByStatus: this.reportService.getClientsByStatus(),
      clientsBySource: this.reportService.getClientsBySource(),
      monthlyClientEvolution: this.reportService.getMonthlyClientEvolution(),
      propertiesByStatus: this.reportService.getPropertiesByStatus(),
      propertiesByCity: this.reportService.getPropertiesByCity(),
      revenueRealEstate: this.reportService.getEstimatedRevenueRealEstate(),
      revenueServices: this.reportService.getEstimatedRevenueByService()
    }).subscribe({
      next: (results) => {
        if (results.clientsByService.success && results.clientsByService.data) {
          this.clientsByService = results.clientsByService.data.map((item: any) => ({
            name: item._id?.name || item.name || 'Otros',
            value: item.count || item.value || 0
          }));
        }
        if (results.clientsByStatus.success && results.clientsByStatus.data) {
          const raw = results.clientsByStatus.data;
          const total = raw.reduce((acc: number, curr: any) => acc + (curr.count || curr.value || 0), 0);
          this.clientsByStatus = raw.map((item: any) => ({
            name: this.getStatusLabel(item._id || item.name),
            value: item.count || item.value || 0,
            percentage: total > 0 ? Math.round(((item.count || item.value || 0) / total) * 100) : 0
          }));
        }
        if (results.clientsBySource.success && results.clientsBySource.data) {
          const raw = results.clientsBySource.data;
          const total = raw.reduce((acc: number, curr: any) => acc + (curr.count || curr.value || 0), 0);
          this.clientsBySource = raw.map((item: any) => ({
            name: this.getSourceLabel(item._id || item.name),
            value: item.count || item.value || 0,
            percentage: total > 0 ? Math.round(((item.count || item.value || 0) / total) * 100) : 0
          }));
        }
        if (results.monthlyClientEvolution.success && results.monthlyClientEvolution.data) {
          this.monthlyClientEvolution = results.monthlyClientEvolution.data.map((item: any) => ({
            name: item.label || item.name || '',
            value: item.count || item.value || 0
          }));
        }
        if (results.propertiesByStatus.success && results.propertiesByStatus.data) {
          this.propertiesByStatus = results.propertiesByStatus.data.map((item: any) => ({
            name: item._id || item.name || '',
            value: item.count || item.value || 0
          }));
        }
        if (results.propertiesByCity.success && results.propertiesByCity.data) {
          this.propertiesByCity = results.propertiesByCity.data.map((item: any) => ({
            name: item._id || item.name || 'Otros',
            value: item.count || item.value || 0
          }));
        }
        
        // Calculate revenue distribution
        const reData = results.revenueRealEstate.success && results.revenueRealEstate.data ? results.revenueRealEstate.data : [];
        const srvData = results.revenueServices.success && results.revenueServices.data ? results.revenueServices.data : [];
        
        const totalRealEstate = reData.reduce((acc: number, curr: any) => acc + (curr.totalCommission || 0), 0);
        const totalServices = srvData.reduce((acc: number, curr: any) => acc + (curr.totalRevenue || 0), 0);
        const totalRevenue = totalRealEstate + totalServices;
        
        this.realEstateRevenue = totalRealEstate;
        this.serviceRevenue = totalServices;
        this.totalEstimatedRevenue = totalRevenue;
        
        const pctRealEstate = totalRevenue > 0 ? Math.round((totalRealEstate / totalRevenue) * 100) : 0;
        const pctServices = totalRevenue > 0 ? Math.round((totalServices / totalRevenue) * 100) : 0;
        
        this.revenueDistribution = [
          { name: 'Real Estate', value: totalRealEstate, percentage: pctRealEstate },
          { name: 'Trámites & Servicios', value: totalServices, percentage: pctServices }
        ];
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Helpers
  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'prospect': 'Prospecto',
      'active': 'Activo',
      'in_process': 'En Proceso',
      'in_progress': 'En Proceso',
      'inactive': 'Inactivo',
      'closed': 'Cerrado'
    };
    return statusMap[status] || status;
  }

  getSourceLabel(source: string): string {
    const sourceMap: { [key: string]: string } = {
      'referral': 'Referido',
      'social_media': 'Redes Sociales',
      'website': 'Sitio Web',
      'call': 'Llamada',
      'phone_call': 'Llamada',
      'whatsapp': 'WhatsApp',
      'office': 'Oficina',
      'other': 'Otro'
    };
    return sourceMap[source] || source;
  }
}
