import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client } from '../../models/client.model';
import { ApiResponse } from '../../models/api-response.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  constructor(private http: HttpClient) {}

  getClients(filters?: {
    search?: string;
    serviceId?: string;
    clientStatus?: string;
    source?: string;
    priority?: string;
    assignedTo?: string;
    createdBy?: string;
    country?: string;
    hasEvaluation?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Observable<ApiResponse<Client[]>> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<ApiResponse<Client[]>>(`${environment.apiUrl}/clients`, { params });
  }

  getClientById(id: string): Observable<ApiResponse<Client>> {
    return this.http.get<ApiResponse<Client>>(`${environment.apiUrl}/clients/${id}`);
  }

  createClient(clientData: Partial<Client>): Observable<ApiResponse<Client>> {
    // Clean up fields to match backend
    const payload = this.mapToBackend(clientData);
    return this.http.post<ApiResponse<Client>>(`${environment.apiUrl}/clients`, payload);
  }

  updateClient(id: string, clientData: Partial<Client>): Observable<ApiResponse<Client>> {
    const payload = this.mapToBackend(clientData);
    return this.http.patch<ApiResponse<Client>>(`${environment.apiUrl}/clients/${id}`, payload);
  }

  deleteClient(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${environment.apiUrl}/clients/${id}`);
  }

  updateClientStatus(id: string, clientStatus: string): Observable<ApiResponse<Client>> {
    return this.http.patch<ApiResponse<Client>>(`${environment.apiUrl}/clients/${id}/status`, { clientStatus });
  }

  updateClientServices(id: string, services: string[]): Observable<ApiResponse<Client>> {
    return this.http.patch<ApiResponse<Client>>(`${environment.apiUrl}/clients/${id}/services`, { services });
  }

  addClientNote(id: string, note: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/clients/${id}/notes`, { note });
  }

  getClientActivities(id: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/clients/${id}/activity`);
  }

  updateClientEvaluation(id: string, evaluation: any): Observable<ApiResponse<Client>> {
    return this.http.patch<ApiResponse<Client>>(`${environment.apiUrl}/clients/${id}/evaluation`, evaluation);
  }

  sendBulkEmails(clientIds: string[], subject: string, body: string, attachments?: { content: string; name: string }[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/clients/send-email`, { clientIds, subject, body, attachments });
  }

  // Maps frontend mock attributes to backend names if they exist
  private mapToBackend(data: Partial<Client>): any {
    const mapped: any = { ...data };
    
    // Naming transitions
    if (data.status !== undefined) {
      mapped.clientStatus = data.status;
      delete mapped.status;
    }
    if (data.assignedServices !== undefined) {
      mapped.services = data.assignedServices;
      delete mapped.assignedServices;
    }
    if (data.assignedAgent !== undefined) {
      mapped.assignedTo = data.assignedAgent || null;
      delete mapped.assignedAgent;
    }
    if (data.notes !== undefined) {
      mapped.internalNotes = data.notes;
      delete mapped.notes;
    }
    
    return mapped;
  }
}
