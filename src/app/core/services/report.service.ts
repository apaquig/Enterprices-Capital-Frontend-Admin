import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../models/api-response.model';
import { environment } from '../../../environments/environment';

export interface ChartDataPoint {
  name: string;
  value: number;
  percentage?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  constructor(private http: HttpClient) {}

  private buildParams(filters?: {
    startDate?: string;
    endDate?: string;
    country?: string;
    serviceId?: string;
    status?: string;
  }): HttpParams {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const val = (filters as any)[key];
        if (val !== undefined && val !== null && val !== '') {
          params = params.set(key, val.toString());
        }
      });
    }
    return params;
  }

  getClientsByService(filters?: any): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.http.get<ApiResponse<ChartDataPoint[]>>(
      `${environment.apiUrl}/reports/clients-by-service`, 
      { params: this.buildParams(filters) }
    );
  }

  getClientsByStatus(filters?: any): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.http.get<ApiResponse<ChartDataPoint[]>>(
      `${environment.apiUrl}/reports/clients-by-status`, 
      { params: this.buildParams(filters) }
    );
  }

  getClientsBySource(filters?: any): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.http.get<ApiResponse<ChartDataPoint[]>>(
      `${environment.apiUrl}/reports/clients-by-source`, 
      { params: this.buildParams(filters) }
    );
  }

  getMonthlyClientEvolution(filters?: any): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.http.get<ApiResponse<ChartDataPoint[]>>(
      `${environment.apiUrl}/reports/clients-by-month`, 
      { params: this.buildParams(filters) }
    );
  }

  getPropertiesByStatus(filters?: any): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.http.get<ApiResponse<ChartDataPoint[]>>(
      `${environment.apiUrl}/reports/properties-by-status`, 
      { params: this.buildParams(filters) }
    );
  }

  getPropertiesByCountry(filters?: any): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.http.get<ApiResponse<ChartDataPoint[]>>(
      `${environment.apiUrl}/reports/properties-by-country`, 
      { params: this.buildParams(filters) }
    );
  }

  getPropertiesByCity(filters?: any): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.http.get<ApiResponse<ChartDataPoint[]>>(
      `${environment.apiUrl}/reports/properties-by-city`, 
      { params: this.buildParams(filters) }
    );
  }

  getServicesMostRequested(filters?: any): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.http.get<ApiResponse<ChartDataPoint[]>>(
      `${environment.apiUrl}/reports/services-most-requested`, 
      { params: this.buildParams(filters) }
    );
  }

  getEstimatedRevenueByService(filters?: any): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.http.get<ApiResponse<ChartDataPoint[]>>(
      `${environment.apiUrl}/reports/estimated-revenue-by-service`, 
      { params: this.buildParams(filters) }
    );
  }

  getEstimatedRevenueRealEstate(filters?: any): Observable<ApiResponse<ChartDataPoint[]>> {
    return this.http.get<ApiResponse<ChartDataPoint[]>>(
      `${environment.apiUrl}/reports/estimated-revenue-real-estate`, 
      { params: this.buildParams(filters) }
    );
  }
}
