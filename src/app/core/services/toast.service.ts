import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastMessage | null>(null);
  public toast$: Observable<ToastMessage | null> = this.toastSubject.asObservable();
  private timeoutId: any;

  show(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'success', duration: number = 3000): void {
    // Clear any active timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.toastSubject.next({ message, type, duration });

    this.timeoutId = setTimeout(() => {
      this.clear();
    }, duration);
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'danger', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  clear(): void {
    this.toastSubject.next(null);
  }
}
