import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService, CompanySettings } from '../../core/services/settings.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { User } from '../../models/user.model';
import { phoneValidator, normalizePhoneNumber } from '../../core/utils/phone.utils';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  activeTab = 'general';
  
  // Forms
  companyForm!: FormGroup;
  profileForm!: FormGroup;
  preferencesForm!: FormGroup;
  staffForm!: FormGroup;

  // Validation Error Messages
  companyErrorMessage: string | null = null;
  profileErrorMessage: string | null = null;
  staffErrorMessage: string | null = null;
  companyValidationErrors: { label: string; message: string }[] = [];
  profileValidationErrors: { label: string; message: string }[] = [];
  staffValidationErrors: { label: string; message: string }[] = [];

  private getCompanyFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      companyName: 'Nombre de la empresa',
      phone: 'Teléfono',
      email: 'Correo Electrónico',
      address: 'Dirección',
      website: 'Sitio Web'
    };
    return labels[field] || field;
  }

  private getProfileFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'Nombre',
      lastName: 'Apellido',
      email: 'Correo Electrónico',
      phone: 'Teléfono',
      currentPassword: 'Contraseña Actual',
      newPassword: 'Nueva Contraseña',
      confirmPassword: 'Confirmar Contraseña'
    };
    return labels[field] || field;
  }

  private getStaffFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'Nombre',
      lastName: 'Apellido',
      email: 'Correo Electrónico',
      phone: 'Teléfono',
      role: 'Rol',
      password: 'Contraseña'
    };
    return labels[field] || field;
  }



  // Staff list
  usersList: User[] = [];
  isStaffLoading = false;
  isStaffSaving = false;
  showStaffForm = false;
  isStaffEditMode = false;
  isStaffSubmitted = false;
  selectedStaff?: User;
  showStaffDeleteConfirm = false;
  staffToDeleteId?: string;
  roleOptions = ['admin', 'manager'];
  
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  showStaffPassword = false;



  // Toast notifications (global toast service is used, but we keep compatibility triggers)
  toastMessage = '';
  showToast = false;
  isLoading = false;
  currentUser: User | null = null;
  hasLoadedData = false;

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  get isManager(): boolean {
    return this.currentUser?.role === 'manager';
  }

  get isAdminOrManager(): boolean {
    return this.isAdmin || this.isManager;
  }

  // Avatar upload
  avatarFile: File | null = null;
  avatarPreview: string | null = null;
  isAvatarLoading = false;
  avatarError = '';
  avatarSuccess = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private settingsService: SettingsService,
    private userService: UserService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.authService.currentUser$.subscribe(user => {
      console.log('SettingsComponent: Loaded user object:', user);
      Promise.resolve().then(() => {
        this.currentUser = user;
        if (user && user.role !== 'admin') {
          this.activeTab = 'profile';
        }
        if (user && this.profileForm) {
          const nameParts = user.name ? user.name.split(' ') : ['', ''];
          this.profileForm.patchValue({
            firstName: user.firstName || nameParts[0] || '',
            lastName: user.lastName || nameParts.slice(1).join(' ') || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'Administrador'
          }, { emitEvent: false });
        }
        if (this.isAdmin && !this.hasLoadedData) {
          this.hasLoadedData = true;
          this.loadSettings();
          this.loadStaff();
        }
        this.cdr.detectChanges();
      });
    });
  }

  ngOnInit(): void {
    this.initCompanyForm();
    this.initProfileForm();
    this.initPreferencesForm();
    this.initStaffForm();
    
    if (!this.isAdmin) {
      this.activeTab = 'profile';
    }
    
    if (this.isAdmin && !this.hasLoadedData) {
      this.hasLoadedData = true;
      this.loadSettings();
      this.loadStaff();
    }
  }

  loadSettings(): void {
    this.isLoading = true;
    this.settingsService.getCompanySettings().subscribe({
      next: (res) => {
        this.isLoading = false;
        
        if (res.success && res.data) {
          const raw = res.data as any;
          this.companyForm.patchValue({
            companyName: raw.companyName || '',
            phone: raw.phone || '',
            email: raw.email || '',
            address: raw.address || ''
          });
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadStaff(): void {
    this.isStaffLoading = true;
    this.userService.getUsers().subscribe({
      next: (res) => {
        this.isStaffLoading = false;
        if (res.success && res.data) {
          // Filter to only show staff, not the current admin itself (or maybe show all?)
          // The user requested to see and edit collaborators
          this.usersList = res.data.map((u: any) => ({
            ...u,
            id: u._id || u.id,
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email
          }));
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isStaffLoading = false;
        const msg = err.error?.message || 'Error al cargar el personal.';
        this.toastService.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  initCompanyForm(): void {
    this.companyForm = this.fb.group({
      companyName: ['', Validators.required],
      phone: ['', [Validators.required, phoneValidator()]],
      email: ['', [Validators.required, Validators.email]],
      address: ['', Validators.required]
    });

    Object.keys(this.companyForm.controls).forEach(key => {
      this.companyForm.get(key)?.valueChanges.subscribe(() => {
        const control = this.companyForm.get(key);
        if (control && control.hasError('backend')) {
          const errors = { ...control.errors };
          delete errors['backend'];
          control.setErrors(Object.keys(errors).length ? errors : null);
          this.cdr.detectChanges();
        }
      });
    });
  }

  initProfileForm(): void {
    const nameParts = this.currentUser?.name ? this.currentUser.name.split(' ') : ['', ''];
    this.profileForm = this.fb.group({
      firstName: [this.currentUser?.firstName || nameParts[0] || '', Validators.required],
      lastName: [this.currentUser?.lastName || nameParts.slice(1).join(' ') || '', Validators.required],
      email: [this.currentUser?.email || '', [Validators.required, Validators.email]],
      phone: [this.currentUser?.phone || '', [phoneValidator()]],
      role: [{ value: this.currentUser?.role || 'Administrador', disabled: true }, Validators.required],
      currentPassword: [''],
      newPassword: ['', Validators.minLength(6)],
      confirmPassword: ['']
    });

    Object.keys(this.profileForm.controls).forEach(key => {
      this.profileForm.get(key)?.valueChanges.subscribe(() => {
        const control = this.profileForm.get(key);
        if (control && control.hasError('backend')) {
          const errors = { ...control.errors };
          delete errors['backend'];
          control.setErrors(Object.keys(errors).length ? errors : null);
          this.cdr.detectChanges();
        }
      });
    });
  }

  initPreferencesForm(): void {
    this.preferencesForm = this.fb.group({
      theme: ['light'],
      notificationsEnabled: [true],
      defaultDashboardView: ['general'],
      itemsPerPage: [10]
    });
  }

  initStaffForm(): void {
    this.staffForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [phoneValidator()]],
      role: ['manager', Validators.required],
      password: ['', this.isStaffEditMode ? [] : [Validators.required, Validators.minLength(6)]]
    });

    Object.keys(this.staffForm.controls).forEach(key => {
      this.staffForm.get(key)?.valueChanges.subscribe(() => {
        const control = this.staffForm.get(key);
        if (control && control.hasError('backend')) {
          const errors = { ...control.errors };
          delete errors['backend'];
          control.setErrors(Object.keys(errors).length ? errors : null);
          this.cdr.detectChanges();
        }
      });
    });
  }

  triggerToast(message: string): void {
    this.toastService.success(message);
  }

  saveCompanySettings(): void {
    this.companyErrorMessage = null;
    this.companyValidationErrors = [];
    if (this.companyForm.valid) {
      this.isLoading = true;
      const payload = { ...this.companyForm.value };
      if (payload.phone) {
        payload.phone = normalizePhoneNumber(payload.phone);
      }
      this.settingsService.updateCompanySettings(payload).subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.success) {
            this.toastService.success('Configuración de la empresa guardada con éxito.');
          } else {
            this.toastService.error(res.message || 'Error al guardar la configuración.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.companyErrorMessage = err.error?.message || 'Error al guardar la configuración.';
          this.toastService.error(this.companyErrorMessage || 'Error al guardar la configuración.');
          this.companyValidationErrors = [];
          
          if (err.error && err.error.errors) {
            err.error.errors.forEach((backendError: any) => {
              const control = this.companyForm.get(backendError.field);
              if (control) {
                control.setErrors({ backend: backendError.message });
              }
              this.companyValidationErrors.push({
                label: this.getCompanyFieldLabel(backendError.field),
                message: backendError.message
              });
            });
          }
          this.cdr.detectChanges();
        }
      });
    }
  }

  saveProfileSettings(): void {
    this.profileErrorMessage = null;
    this.profileValidationErrors = [];
    if (this.profileForm.valid && this.currentUser) {
      const formVal = this.profileForm.value;
      const newPass = formVal.newPassword;
      const confPass = formVal.confirmPassword;
      
      if (newPass && newPass !== confPass) {
        this.toastService.error('La confirmación de la contraseña no coincide.');
        return;
      }
      
      const payload: any = {
        firstName: formVal.firstName,
        lastName: formVal.lastName,
        email: formVal.email,
        phone: formVal.phone ? normalizePhoneNumber(formVal.phone) : ''
      };
      
      if (newPass) {
        payload.password = newPass;
      }

      this.isLoading = true;
      const myId = this.currentUser._id || this.currentUser.id;
      this.userService.updateUser(myId!, payload).subscribe({
        next: (res) => {
          this.isLoading = false;
          if (res.success) {
            this.toastService.success('Perfil actualizado correctamente.');
            // Refresh currently logged in user state
            this.authService.getProfile().subscribe({
              next: () => this.cdr.detectChanges(),
              error: () => this.cdr.detectChanges()
            });
          } else {
            this.toastService.error(res.message || 'Error al actualizar el perfil.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.profileErrorMessage = err.error?.message || 'Error al actualizar el perfil.';
          this.toastService.error(this.profileErrorMessage || 'Error al actualizar el perfil.');
          this.profileValidationErrors = [];
          
          if (err.error && err.error.errors) {
            err.error.errors.forEach((backendError: any) => {
              const control = this.profileForm.get(backendError.field);
              if (control) {
                control.setErrors({ backend: backendError.message });
              }
              this.profileValidationErrors.push({
                label: this.getProfileFieldLabel(backendError.field),
                message: backendError.message
              });
            });
          }
          this.cdr.detectChanges();
        }
      });
    }
  }

  savePreferences(): void {
    if (this.preferencesForm.valid) {
      this.toastService.success('Preferencias guardadas.');
    }
  }



  // Staff operations
  openCreateStaff(): void {
    this.isStaffEditMode = false;
    this.isStaffSubmitted = false;
    this.staffErrorMessage = null;
    this.staffValidationErrors = [];
    this.initStaffForm();
    this.showStaffForm = true;
  }

  openEditStaff(user: User): void {
    this.isStaffEditMode = true;
    this.isStaffSubmitted = false;
    this.staffErrorMessage = null;
    this.staffValidationErrors = [];
    this.selectedStaff = user;
    this.initStaffForm();
    
    this.staffForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'manager'
    });
    
    this.showStaffForm = true;
  }

  closeStaffForm(): void {
    this.showStaffForm = false;
    this.selectedStaff = undefined;
  }

  onSubmitStaff(): void {
    this.isStaffSubmitted = true;
    this.staffErrorMessage = null;
    if (this.staffForm.invalid) {
      this.toastService.error('Por favor, complete todos los campos requeridos.');
      return;
    }

    this.isStaffSaving = true;
    const val = { ...this.staffForm.value };
    if (val.phone) {
      val.phone = normalizePhoneNumber(val.phone);
    }
 
    const handleStaffBackendError = (err: any) => {
      this.isStaffSaving = false;
      this.staffErrorMessage = err.error?.message || 'Error al guardar el colaborador.';
      this.toastService.error(this.staffErrorMessage || 'Error al guardar el colaborador.');
      this.staffValidationErrors = [];
      
      if (err.error && err.error.errors) {
        err.error.errors.forEach((backendError: any) => {
          const control = this.staffForm.get(backendError.field);
          if (control) {
            control.setErrors({ backend: backendError.message });
          }
          this.staffValidationErrors.push({
            label: this.getStaffFieldLabel(backendError.field),
            message: backendError.message
          });
        });
      }
      this.cdr.detectChanges();
    };

    if (this.isStaffEditMode && this.selectedStaff) {
      const payload: any = {
        firstName: val.firstName,
        lastName: val.lastName,
        email: val.email,
        phone: val.phone || '',
        role: val.role
      };
      if (val.password) {
        payload.password = val.password;
      }
      
      const staffId = this.selectedStaff.id || this.selectedStaff._id;
      this.userService.updateUser(staffId!, payload).subscribe({
        next: (res) => {
          this.isStaffSaving = false;
          if (res.success) {
            this.loadStaff();
            this.closeStaffForm();
            this.toastService.success('Usuario interno actualizado.');
          } else {
            this.toastService.error(res.message || 'Error al actualizar el colaborador.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => handleStaffBackendError(err)
      });
    } else {
      this.userService.createUser(val).subscribe({
        next: (res) => {
          this.isStaffSaving = false;
          if (res.success) {
            this.loadStaff();
            this.closeStaffForm();
            this.toastService.success('Nuevo colaborador registrado.');
          } else {
            this.toastService.error(res.message || 'Error al registrar el colaborador.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => handleStaffBackendError(err)
      });
    }
  }

  toggleStaffStatus(user: User): void {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const userId = user.id || user._id;
    this.userService.updateUserStatus(userId!, newStatus).subscribe({
      next: (res) => {
        if (res.success) {
          this.toastService.success(`Colaborador marcado como ${newStatus === 'active' ? 'Activo' : 'Inactivo'}`);
          this.loadStaff();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al actualizar el estado del colaborador.';
        this.toastService.error(msg);
        this.cdr.detectChanges();
      }
    });
  }

  confirmDeleteStaff(userId: string): void {
    this.staffToDeleteId = userId;
    this.showStaffDeleteConfirm = true;
  }

  closeStaffDeleteConfirm(): void {
    this.showStaffDeleteConfirm = false;
    this.staffToDeleteId = undefined;
  }

  deleteStaff(): void {
    if (this.staffToDeleteId) {
      this.userService.deleteUser(this.staffToDeleteId).subscribe({
        next: (res) => {
          if (res.success) {
            this.toastService.success('Colaborador eliminado del sistema.');
            this.loadStaff();
            this.closeStaffDeleteConfirm();
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          const msg = err.error?.message || 'Error al eliminar el colaborador.';
          this.toastService.error(msg);
          this.cdr.detectChanges();
        }
      });
    }
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    const first = this.currentUser.firstName || '';
    const last = this.currentUser.lastName || '';
    if (first || last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    const name = this.currentUser.name || this.currentUser.email || '';
    return name.slice(0, 2).toUpperCase();
  }

  onAvatarFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.avatarError = '';
    this.avatarSuccess = '';

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.avatarError = 'Solo se permiten imágenes JPG, JPEG, PNG o WEBP.';
      return;
    }

    if (file.size > maxSize) {
      this.avatarError = 'La imagen no debe superar los 5MB.';
      return;
    }

    this.avatarFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  uploadAvatar(): void {
    if (!this.avatarFile) return;

    this.isAvatarLoading = true;
    this.avatarError = '';
    this.avatarSuccess = '';

    this.authService.uploadProfileAvatar(this.avatarFile).subscribe({
      next: (res) => {
        this.isAvatarLoading = false;
        if (res.success && res.data && res.data.user) {
          this.avatarSuccess = 'Foto de perfil actualizada correctamente.';
          this.avatarFile = null;
          this.avatarPreview = null;
        } else {
          this.avatarError = res.message || 'Error al actualizar la foto de perfil.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isAvatarLoading = false;
        this.avatarError = err.error?.message || err.message || 'Error de conexión con el servidor.';
        this.cdr.detectChanges();
      }
    });
  }

  deleteAvatar(): void {
    if (!confirm('¿Estás seguro de que deseas eliminar tu foto de perfil?')) {
      return;
    }

    this.isAvatarLoading = true;
    this.avatarError = '';
    this.avatarSuccess = '';

    this.authService.deleteProfileAvatar().subscribe({
      next: (res) => {
        this.isAvatarLoading = false;
        if (res.success && res.data && res.data.user) {
          this.avatarSuccess = 'Foto de perfil eliminada correctamente.';
          this.avatarFile = null;
          this.avatarPreview = null;
        } else {
          this.avatarError = res.message || 'Error al eliminar la foto de perfil.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isAvatarLoading = false;
        this.avatarError = err.error?.message || err.message || 'Error de conexión con el servidor.';
        this.cdr.detectChanges();
      }
    });
  }
}
