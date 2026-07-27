import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GalleryItem } from '../../models/gallery.model';
import { ApiResponse } from '../../models/api-response.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  constructor(private http: HttpClient) {}

  getGalleryItems(): Observable<ApiResponse<GalleryItem[]>> {
    return this.http.get<ApiResponse<GalleryItem[]>>(`${environment.apiUrl}/gallery`);
  }

  createGalleryItem(title: string, file: File): Observable<ApiResponse<GalleryItem>> {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('photo', file);
    return this.http.post<ApiResponse<GalleryItem>>(`${environment.apiUrl}/gallery`, formData);
  }

  deleteGalleryItem(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${environment.apiUrl}/gallery/${id}`);
  }
}
