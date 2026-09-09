import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, map, catchError, share } from 'rxjs';
import { User } from '../../models/user.model';
import { ApiResponse } from '../../models/api-response.model';
import { environment } from '../../../environments/environment';

interface LoginData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'ec_access_token';
  private readonly REFRESH_TOKEN_KEY = 'ec_refresh_token';
  private readonly USER_KEY = 'ec_current_user';

  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  private refreshSubscription$: Observable<ApiResponse<{ accessToken: string; refreshToken: string }>> | null = null;

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem(this.USER_KEY);
    this.currentUserSubject = new BehaviorSubject<User | null>(savedUser ? JSON.parse(savedUser) : null);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getUserRole(): string | null {
    const user = this.currentUserValue;
    return user ? user.role : null;
  }

  login(email: string, password: string): Observable<ApiResponse<LoginData>> {
    return this.http.post<ApiResponse<LoginData>>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => {
        if (res.success && res.data) {
          localStorage.setItem(this.ACCESS_TOKEN_KEY, res.data.accessToken);
          localStorage.setItem(this.REFRESH_TOKEN_KEY, res.data.refreshToken);
          
          // Map backend User structure if firstName/lastName exist
          const userObj = res.data.user;
          if (!userObj.name && (userObj.firstName || userObj.lastName)) {
            userObj.name = `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.email;
          }
          
          localStorage.setItem(this.USER_KEY, JSON.stringify(userObj));
          this.currentUserSubject.next(userObj);
        }
      })
    );
  }


  refreshToken(): Observable<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    if (this.refreshSubscription$) {
      return this.refreshSubscription$;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return of({ success: false, message: 'No refresh token available', data: { accessToken: '', refreshToken: '' } });
    }

    this.refreshSubscription$ = this.http.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      `${environment.apiUrl}/auth/refresh-token`,
      { refreshToken }
    ).pipe(
      tap(res => {
        if (res.success && res.data) {
          localStorage.setItem(this.ACCESS_TOKEN_KEY, res.data.accessToken);
          localStorage.setItem(this.REFRESH_TOKEN_KEY, res.data.refreshToken);
        } else {
          this.logout();
        }
        this.refreshSubscription$ = null;
      }),
      catchError(err => {
        this.logout();
        this.refreshSubscription$ = null;
        throw err;
      }),
      share()
    );

    return this.refreshSubscription$;
  }

  getProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${environment.apiUrl}/auth/me`).pipe(
      tap(res => {
        if (res.success && res.data) {
          const rawData = res.data as any;
          const userObj = rawData.user || rawData;
          if (!userObj.name && (userObj.firstName || userObj.lastName)) {
            userObj.name = `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || userObj.email;
          }
          localStorage.setItem(this.USER_KEY, JSON.stringify(userObj));
          this.currentUserSubject.next(userObj);
        }
      })
    );
  }

  recoverPassword(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/auth/reset-password/${token}`, data);
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({
        next: () => {},
        error: () => {}
      });
    }

    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  updateCurrentUser(updatedUser: User): void {
    if (!updatedUser.name && (updatedUser.firstName || updatedUser.lastName)) {
      updatedUser.name = `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim() || updatedUser.email;
    }
    localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
    localStorage.setItem('user', JSON.stringify(updatedUser));
    this.currentUserSubject.next(updatedUser);
  }

  uploadProfileAvatar(file: File): Observable<ApiResponse<{ user: User }>> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.patch<ApiResponse<{ user: User }>>(
      `${environment.apiUrl}/users/me/avatar`,
      formData
    ).pipe(
      tap(res => {
        if (res.success && res.data && res.data.user) {
          this.updateCurrentUser(res.data.user);
        }
      })
    );
  }

  deleteProfileAvatar(): Observable<ApiResponse<{ user: User }>> {
    return this.http.delete<ApiResponse<{ user: User }>>(
      `${environment.apiUrl}/users/me/avatar`
    ).pipe(
      tap(res => {
        if (res.success && res.data && res.data.user) {
          this.updateCurrentUser(res.data.user);
        }
      })
    );
  }

  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  isAdmin(): boolean {
    const role = this.getUserRole();
    return role ? role.toLowerCase() === 'admin' : false;
  }
}
