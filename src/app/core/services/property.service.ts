import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { Property, PropertyImage } from '../../models/property.model';
import { ApiResponse } from '../../models/api-response.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  constructor(private http: HttpClient) {}

  getProperties(filters?: {
    search?: string;
    country?: string;
    propertyType?: string;
    propertyStatus?: string;
    operationType?: string;
    city?: string;
    state?: string;
    minPrice?: number;
    maxPrice?: number;
    responsibleAgent?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Observable<ApiResponse<Property[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const val = (filters as any)[key];
        if (val !== undefined && val !== null && val !== '') {
          params = params.set(key, val.toString());
        }
      });
    }
    return this.http.get<ApiResponse<Property[]>>(`${environment.apiUrl}/properties`, { params });
  }

  getPropertyById(id: string): Observable<ApiResponse<Property>> {
    return this.http.get<ApiResponse<Property>>(`${environment.apiUrl}/properties/${id}`);
  }

  createProperty(propertyData: Partial<Property>): Observable<ApiResponse<Property>> {
    const payload = this.mapToBackend(propertyData);
    return this.http.post<ApiResponse<Property>>(`${environment.apiUrl}/properties`, payload);
  }

  updateProperty(id: string, propertyData: Partial<Property>): Observable<ApiResponse<Property>> {
    const payload = this.mapToBackend(propertyData);
    return this.http.patch<ApiResponse<Property>>(`${environment.apiUrl}/properties/${id}`, payload);
  }

  deleteProperty(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${environment.apiUrl}/properties/${id}`);
  }

  updatePropertyStatus(id: string, propertyStatus: string): Observable<ApiResponse<Property>> {
    return this.http.patch<ApiResponse<Property>>(`${environment.apiUrl}/properties/${id}/status`, { propertyStatus });
  }

  updatePropertyPrice(id: string, currentPrice: number): Observable<ApiResponse<Property>> {
    return this.http.patch<ApiResponse<Property>>(`${environment.apiUrl}/properties/${id}/price`, { currentPrice });
  }

  uploadPropertyImage(id: string, file: File): Observable<ApiResponse<Property>> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.patch<ApiResponse<Property>>(`${environment.apiUrl}/properties/${id}/image`, formData);
  }

  uploadPropertyImages(propertyId: string, files: File[]): Observable<ApiResponse<{ images: PropertyImage[] }>> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    return this.http.post<ApiResponse<{ images: PropertyImage[] }>>(
      `${environment.apiUrl}/properties/${propertyId}/images`,
      formData
    );
  }

  getPropertyImages(propertyId: string): Observable<ApiResponse<{ images: PropertyImage[] }>> {
    const timestamp = new Date().getTime();
    return this.http.get<ApiResponse<{ images: PropertyImage[] }>>(
      `${environment.apiUrl}/properties/${propertyId}/images?t=${timestamp}`
    );
  }

  setMainPropertyImage(propertyId: string, imageId: string): Observable<ApiResponse<{ images: PropertyImage[] }>> {
    return this.http.patch<ApiResponse<{ images: PropertyImage[] }>>(
      `${environment.apiUrl}/properties/${propertyId}/images/${imageId}/main`,
      {}
    );
  }

  deletePropertyImage(propertyId: string, imageId: string): Observable<ApiResponse<{ images: PropertyImage[] }>> {
    return this.http.delete<ApiResponse<{ images: PropertyImage[] }>>(
      `${environment.apiUrl}/properties/${propertyId}/images/${imageId}`
    );
  }

  deleteLegacyCoverImage(propertyId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${environment.apiUrl}/properties/${propertyId}/image`);
  }

  reorderPropertyImages(
    propertyId: string,
    images: { imageId: string; order: number }[]
  ): Observable<ApiResponse<{ images: PropertyImage[] }>> {
    return this.http.patch<ApiResponse<{ images: PropertyImage[] }>>(
      `${environment.apiUrl}/properties/${propertyId}/images/reorder`,
      { images }
    );
  }

  getPropertiesByCountry(country: string): Observable<ApiResponse<Property[]>> {
    return this.http.get<ApiResponse<Property[]>>(`${environment.apiUrl}/properties/country/${country}`);
  }

  private mapToBackend(data: Partial<Property>): any {
    const mapped: any = { ...data };
    if (data.name !== undefined) {
      mapped.propertyName = data.name;
      delete mapped.name;
    }
    if (data.type !== undefined) {
      mapped.propertyType = data.type;
      delete mapped.type;
    }
    if (data.status !== undefined) {
      mapped.propertyStatus = data.status;
      delete mapped.status;
    }
    if (data.area !== undefined) {
      mapped.areaSize = data.area;
      delete mapped.area;
    }
    if (data.agent !== undefined) {
      mapped.responsibleAgent = data.agent;
      delete mapped.agent;
    }
    if (data.notes !== undefined) {
      mapped.internalNotes = data.notes;
      delete mapped.notes;
    }
    
    // Remove image fields from standard creation/updates as they are handled via uploadPropertyImage
    delete mapped.imageUrl;
    delete mapped.imagePublicId;
    
    return mapped;
  }
}
