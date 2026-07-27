import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  recoveryForm: FormGroup;
  showRecoveryModal = false;
  loginError = '';
  recoverySuccess = false;
  recoveryError = '';
  isSubmitted = false;
  isRecoverySubmitted = false;
  isLoading = false;
  isRecoveryLoading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.recoveryForm = this.fb.group({
      recoveryEmail: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    this.isSubmitted = true;
    this.loginError = '';

    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.toastService.success('¡Sesión iniciada con éxito!');
          this.router.navigate(['/dashboard']);
        } else {
          this.loginError = res.message || 'Error de autenticación.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Login component error handler triggered:', err);
        this.isLoading = false;
        // The interceptor may have shown a toast, but we can also display a local alert
        this.loginError = err.error?.message || err.message || 'Verifica tus credenciales.';
        console.log('isLoading is now:', this.isLoading, 'loginError is:', this.loginError);
        this.cdr.detectChanges();
      }
    });
  }



  openRecovery(): void {
    this.showRecoveryModal = true;
    this.recoverySuccess = false;
    this.recoveryError = '';
    this.isRecoverySubmitted = false;
    this.recoveryForm.reset();
    this.cdr.detectChanges();
  }

  closeRecovery(): void {
    this.showRecoveryModal = false;
    this.cdr.detectChanges();
  }

  onRecoverPassword(): void {
    this.isRecoverySubmitted = true;
    this.recoveryError = '';
    this.recoverySuccess = false;

    if (this.recoveryForm.invalid) {
      return;
    }

    this.isRecoveryLoading = true;
    const email = this.recoveryForm.value.recoveryEmail;
    this.authService.recoverPassword(email).subscribe({
      next: (res) => {
        this.isRecoveryLoading = false;
        if (res.success) {
          this.recoverySuccess = true;
          this.toastService.success('Se ha enviado el enlace de recuperación.');
          setTimeout(() => {
            this.closeRecovery();
          }, 3000);
        } else {
          this.recoveryError = res.message || 'Error al procesar recuperación.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isRecoveryLoading = false;
        this.recoveryError = err.error?.message || err.message || 'Hubo un error al procesar tu solicitud.';
        this.cdr.detectChanges();
      }
    });
  }
}
