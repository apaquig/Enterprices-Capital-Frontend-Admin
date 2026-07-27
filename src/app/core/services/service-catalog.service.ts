import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Service } from '../../models/service.model';
import { ApiResponse } from '../../models/api-response.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServiceCatalogService {
  constructor(private http: HttpClient) {}

  getServices(filters?: { category?: string; status?: string; search?: string }): Observable<ApiResponse<Service[]>> {
    let params = new HttpParams();
    if (filters) {
      if (filters.category) params = params.set('category', filters.category);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.search) params = params.set('search', filters.search);
    }
    return this.http.get<ApiResponse<Service[]>>(`${environment.apiUrl}/services`, { params });
  }

  getServiceById(id: string): Observable<ApiResponse<Service>> {
    return this.http.get<ApiResponse<Service>>(`${environment.apiUrl}/services/${id}`);
  }

  createService(serviceData: Partial<Service>): Observable<ApiResponse<Service>> {
    const payload = this.mapToBackend(serviceData);
    return this.http.post<ApiResponse<Service>>(`${environment.apiUrl}/services`, payload);
  }

  updateService(id: string, serviceData: Partial<Service>): Observable<ApiResponse<Service>> {
    const payload = this.mapToBackend(serviceData);
    return this.http.patch<ApiResponse<Service>>(`${environment.apiUrl}/services/${id}`, payload);
  }

  toggleServiceStatus(id: string): Observable<ApiResponse<Service>> {
    return this.http.patch<ApiResponse<Service>>(`${environment.apiUrl}/services/${id}/status`, {});
  }

  deleteService(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${environment.apiUrl}/services/${id}`);
  }

  getServiceClients(id: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/services/${id}/clients`);
  }

  private mapToBackend(data: Partial<Service>): any {
    const mapped: any = { ...data };
    if (data.notes !== undefined) {
      mapped.internalNotes = data.notes;
      delete mapped.notes;
    }
    return mapped;
  }
}
