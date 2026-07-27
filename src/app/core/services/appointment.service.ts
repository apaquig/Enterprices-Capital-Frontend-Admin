import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment } from '../../models/appointment.model';
import { ApiResponse } from '../../models/api-response.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  constructor(private http: HttpClient) {}

  getAppointments(start?: string, end?: string): Observable<ApiResponse<Appointment[]>> {
    let params = new HttpParams();
    if (start) params = params.set('start', start);
    if (end) params = params.set('end', end);
    return this.http.get<ApiResponse<Appointment[]>>(`${environment.apiUrl}/appointments`, { params });
  }

  getAvailableSlots(date: string): Observable<ApiResponse<string[]>> {
    const params = new HttpParams().set('date', date);
    return this.http.get<ApiResponse<string[]>>(`${environment.apiUrl}/appointments/available-slots`, { params });
  }

  bookAppointment(appointmentData: Partial<Appointment>): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(`${environment.apiUrl}/appointments/book`, appointmentData);
  }

  updateAppointment(id: string, appointmentData: Partial<Appointment>): Observable<ApiResponse<Appointment>> {
    return this.http.patch<ApiResponse<Appointment>>(`${environment.apiUrl}/appointments/${id}`, appointmentData);
  }
}
