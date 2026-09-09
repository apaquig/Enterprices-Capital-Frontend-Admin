import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../models/api-response.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WhatsAppService {
  constructor(private http: HttpClient) {}

  getStatus(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${environment.apiUrl}/whatsapp/status`);
  }

  getQR(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${environment.apiUrl}/whatsapp/qr`);
  }

  logout(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/whatsapp/logout`, {});
  }

  sendBulkWhatsApp(payload: {
    clientIds?: string[];
    selectAll?: boolean;
    filters?: any;
    excludedIds?: string[];
    body?: string;
    salutationPrefix?: string;
    includeGreeting?: boolean;
    nameFormat?: string;
    media?: {
      base64?: string;
      url?: string;
      mimetype?: string;
      name?: string;
    };
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/clients/send-whatsapp`, payload);
  }
}
