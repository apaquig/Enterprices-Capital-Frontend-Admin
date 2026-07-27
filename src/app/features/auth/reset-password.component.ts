import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  token: string = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  isSubmitted = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Extract token from route parameter
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Enlace de recuperación inválido o expirado.';
      this.toastService.error('Token de recuperación faltante.');
    }
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onSubmit(): void {
    this.isSubmitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.resetForm.invalid) {
      return;
    }

    if (!this.token) {
      this.errorMessage = 'Enlace de recuperación inválido o expirado.';
      return;
    }

    this.isLoading = true;
    const password = this.resetForm.value.password;
    const confirmPassword = this.resetForm.value.confirmPassword;

    this.authService.resetPassword(this.token, { newPassword: password, confirmPassword }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.successMessage = 'Tu contraseña ha sido restablecida con éxito.';
          this.toastService.success('¡Contraseña restablecida con éxito!');
          this.cdr.detectChanges();
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          this.errorMessage = res.message || 'Error al restablecer contraseña.';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isLoading = false;
        
        // Detailed error message handling
        this.errorMessage = err.error?.message || err.message || 'El enlace de recuperación es inválido o ha expirado.';
        
        if (err.error && err.error.errors && Array.isArray(err.error.errors)) {
          const detailedErrors: string[] = [];
          err.error.errors.forEach((backendError: any) => {
            const fieldName = backendError.field;
            const controlName = fieldName === 'newPassword' ? 'password' : fieldName;
            
            const control = this.resetForm.get(controlName);
            if (control) {
              control.setErrors({ backend: backendError.message });
            }
            detailedErrors.push(backendError.message);
          });
          
          if (detailedErrors.length > 0) {
            this.errorMessage = detailedErrors.join('. ');
          }
        }
        
        this.toastService.error(this.errorMessage);
        this.cdr.detectChanges();
      }
    });
  }
}
