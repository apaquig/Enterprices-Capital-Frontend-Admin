import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../models/api-response.model';
import { environment } from '../../../environments/environment';

export interface CompanySettings {
  name: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface SystemCatalogs {
  categories: string[];
  crmStatuses: { value: string; label: string }[];
  clientSources: { value: string; label: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  constructor(private http: HttpClient) {}

  getCompanySettings(): Observable<ApiResponse<CompanySettings>> {
    return this.http.get<ApiResponse<CompanySettings>>(`${environment.apiUrl}/settings/company`);
  }

  updateCompanySettings(settings: CompanySettings): Observable<ApiResponse<CompanySettings>> {
    const payload = {
      ...settings,
      companyName: settings.name || (settings as any).companyName || ''
    };
    return this.http.patch<ApiResponse<CompanySettings>>(`${environment.apiUrl}/settings/company`, payload);
  }

  getSystemCatalogs(): Observable<ApiResponse<SystemCatalogs>> {
    return this.http.get<ApiResponse<SystemCatalogs>>(`${environment.apiUrl}/settings/catalogs`);
  }

  updateSystemCatalogs(catalogs: Partial<SystemCatalogs>): Observable<ApiResponse<SystemCatalogs>> {
    return this.http.patch<ApiResponse<SystemCatalogs>>(`${environment.apiUrl}/settings/catalogs`, catalogs);
  }
}
