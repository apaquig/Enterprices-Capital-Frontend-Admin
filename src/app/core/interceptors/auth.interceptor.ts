import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  const accessToken = authService.getAccessToken();
  let clonedReq = req;

  // List of public endpoints that don't need authorization header
  const publicUrls = [
    '/auth/login', 
    '/auth/register', 
    '/auth/forgot-password', 
    '/auth/reset-password',
    '/auth/refresh-token',
    '/auth/google',
    '/auth/logout'
  ];
  const isPublic = publicUrls.some(url => req.url.includes(url));
  console.log('authInterceptor: request method:', req.method, 'url:', req.url, 'isPublic:', isPublic, 'hasToken:', !!accessToken);

  if (accessToken && !isPublic) {
    clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${accessToken}`)
    });
    console.log('authInterceptor: Authorization header attached.');
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.warn('authInterceptor caught error:', error.status, error.url, 'message:', error.message);
      if (error.status === 401 && !isPublic) {
        console.log('authInterceptor: attempting to refresh token');
        // Attempt to refresh token
        return authService.refreshToken().pipe(
          switchMap((res) => {
            if (res && res.data && res.data.accessToken) {
              console.log('authInterceptor: token refresh successful, retrying request');
              const retryReq = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${res.data.accessToken}`)
              });
              return next(retryReq);
            }
            console.log('authInterceptor: token refresh returned malformed response');
            // Logout if response is malformed
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            console.error('authInterceptor: token refresh failed:', refreshError);
            authService.logout();
            router.navigate(['/login']);
            toastService.error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
            return throwError(() => refreshError);
          })
        );
      }

      // Handle other API errors
      let errorMessage = 'Ha ocurrido un error inesperado.';
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Do not show errors globally for 401 as we try to refresh them
      if (error.status !== 401) {
        toastService.error(errorMessage);
      }

      console.warn('authInterceptor: propagating error to subscriber:', errorMessage);
      return throwError(() => error);
    })
  );
};
