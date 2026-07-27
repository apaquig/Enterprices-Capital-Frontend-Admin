import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { PropertyService } from '../../core/services/property.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Property, PropertyImage } from '../../models/property.model';
import { phoneValidator, normalizePhoneNumber } from '../../core/utils/phone.utils';

@Component({
  selector: 'app-real-estate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './real-estate.component.html',
  styleUrls: ['./real-estate.component.css']
})
export class RealEstateComponent implements OnInit {
  properties: Property[] = [];
  filteredProperties: Property[] = [];
  
  // View mode
  viewMode: 'grid' | 'table' = 'grid';

  // Search & Filters
  searchTerm = '';
  filterStatus = '';
  filterOperation = '';
  filterCountry = '';
  priceMin: number | null = null;
  priceMax: number | null = null;

  // Modals & Drawers state
  showFormModal = false;
  showDetailDrawer = false;
  showDeleteConfirm = false;
  isLoading = false;
  isSaving = false;

  // Pagination
  pagination = {
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 1
  };

  // Form & Selection variables
  propertyForm!: FormGroup;
  selectedProperty?: Property;
  isEditMode = false;
  isSubmitted = false;
  errorMessage: string | null = null;
  propertyToDeleteId?: string;
  validationErrors: { label: string; message: string }[] = [];

  // Multi-image gallery state
  propertyImages: PropertyImage[] = [];
  selectedFilesToUpload: File[] = [];
  uploadPreviews: { file: File; url: string; name: string; size: string }[] = [];
  showImageDeleteConfirm = false;
  imageToDeleteId?: string;

  private getPropertyFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      propertyName: 'Nombre de la propiedad',
      name: 'Nombre de la propiedad',
      propertyType: 'Tipo de propiedad',
      type: 'Tipo de propiedad',
      country: 'País',
      address: 'Dirección',
      city: 'Ciudad',
      state: 'Estado',
      zipCode: 'Código Postal',
      currentPrice: 'Precio Actual',
      previousPrice: 'Precio Anterior',
      operationType: 'Tipo de Operación',
      bedrooms: 'Habitaciones',
      bathrooms: 'Baños',
      areaSize: 'Área',
      area: 'Área',
      lotSize: 'Tamaño del Lote',
      yearBuilt: 'Año de Construcción',
      ownerName: 'Nombre del Propietario',
      ownerPhone: 'Teléfono del Propietario',
      ownerEmail: 'Correo del Propietario',
      responsibleAgent: 'Agente Responsable',
      agent: 'Agente Responsable',
      estimatedCommission: 'Comisión Estimada',
      internalNotes: 'Notas Internas',
      notes: 'Notas Internas',
      imageUrl: 'Imagen de Portada'
    };
    return labels[field] || field;
  }

  // File pending upload (for create mode)
  pendingImage: File | null = null;
  imagePreview: string | null = null;

  // Detail Drawer active tab
  activeDetailTab = 'general';

  // Option lists
  typeOptions = [
    { value: 'house', label: 'Casa' },
    { value: 'apartment', label: 'Apartamento' },
    { value: 'land', label: 'Terreno' },
    { value: 'commercial', label: 'Local Comercial' },
    { value: 'multifamily', label: 'Multifamiliar' },
    { value: 'office', label: 'Oficina' },
    { value: 'other', label: 'Otro' }
  ];

  statusOptions = [
    { value: 'available', label: 'Disponible' },
    { value: 'reserved', label: 'Reservada' },
    { value: 'sold', label: 'Vendida' },
    { value: 'rented', label: 'Rentada' },
    { value: 'inactive', label: 'Inactiva' }
  ];

  operationOptions = [
    { value: 'sale', label: 'Venta' },
    { value: 'rent', label: 'Renta' },
    { value: 'investment', label: 'Inversión' }
  ];

  agentOptions: any[] = [];

  constructor(
    private fb: FormBuilder,
    private propertyService: PropertyService,
    private userService: UserService,
    private authService: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProperties();
    this.initForm();
    this.loadAgents();
  }

  loadAgents(): void {
    this.userService.getUsers().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.agentOptions = res.data.map(u => ({
            id: u._id || u.id || '',
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email
          }));
          
          if (!this.isEditMode) {
            const currentUserId = this.authService.currentUserValue?._id || this.authService.currentUserValue?.id || '';
            const hasCurrentUser = this.agentOptions.some(opt => opt.id === currentUserId);
            if (hasCurrentUser) {
              this.propertyForm.patchValue({ agent: currentUserId });
            } else if (this.agentOptions.length > 0) {
              this.propertyForm.patchValue({ agent: this.agentOptions[0].id });
            }
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  mapToFrontendCompat(p: any): Property {
    let agentName = 'Sin asignar';
    if (p.responsibleAgent) {
      if (typeof p.responsibleAgent === 'object') {
        agentName = `${p.responsibleAgent.firstName || ''} ${p.responsibleAgent.lastName || ''}`.trim() || p.responsibleAgent.email || 'Sin asignar';
      } else {
        agentName = p.responsibleAgent;
      }
    }

    const imagesList = p.images || [];
    // Sort images by order ascending
    imagesList.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    return {
      ...p,
      id: p._id || p.id || '',
      name: p.propertyName || p.name || '',
      type: p.propertyType || p.type || 'house',
      status: p.propertyStatus || p.status || 'available',
      area: p.areaSize || p.area || 0,
      agent: agentName,
      agentId: p.responsibleAgent?._id || p.responsibleAgent?.id || p.responsibleAgent || '',
      notes: p.internalNotes || p.notes || '',
      imageUrl: p.imageUrl || '',
      imagePublicId: p.imagePublicId || '',
      images: imagesList,
      activeImageIndex: 0,
      hasImageError: false
    } as any;
  }

  loadProperties(): void {
    this.isLoading = true;
    this.propertyService.getProperties({
      search: this.searchTerm,
      country: this.filterCountry || undefined,
      propertyStatus: this.filterStatus || undefined,
      operationType: this.filterOperation || undefined,
      minPrice: this.priceMin !== null ? this.priceMin : undefined,
      maxPrice: this.priceMax !== null ? this.priceMax : undefined,
      page: this.pagination.page,
      limit: this.pagination.limit
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.properties = res.data.map(p => this.mapToFrontendCompat(p));
          this.filteredProperties = this.properties;
          if (res.pagination) {
            this.pagination = res.pagination;
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  initForm(): void {
    this.propertyForm = this.fb.group({
      name: ['', Validators.required],
      type: ['house', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['USA', Validators.required],
      description: ['', Validators.required],
      currentPrice: [0, [Validators.required, Validators.min(0)]],
      previousPrice: [null],
      status: ['available', Validators.required],
      operationType: ['sale', Validators.required],
      bedrooms: [0, Validators.min(0)],
      bathrooms: [0, Validators.min(0)],
      area: [0, [Validators.required, Validators.min(0)]],
      lotSize: [null],
      yearBuilt: [new Date().getFullYear(), Validators.required],
      ownerName: ['', Validators.required],
      ownerPhone: ['', [Validators.required, phoneValidator()]],
      ownerEmail: ['', Validators.email],
      agent: [this.authService.currentUserValue?._id || this.authService.currentUserValue?.id || '', Validators.required],
      estimatedCommission: [0, [Validators.required, Validators.min(0)]],
      notes: [''],
      imageUrl: ['']
    });

    // Clear backend error for a control when its value changes
    Object.keys(this.propertyForm.controls).forEach(key => {
      this.propertyForm.get(key)?.valueChanges.subscribe(() => {
        const control = this.propertyForm.get(key);
        if (control && control.hasError('backend')) {
          const errors = { ...control.errors };
          delete errors['backend'];
          control.setErrors(Object.keys(errors).length ? errors : null);
        }
      });
    });
  }

  applyFilters(): void {
    this.pagination.page = 1;
    this.loadProperties();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterStatus = '';
    this.filterOperation = '';
    this.filterCountry = '';
    this.priceMin = null;
    this.priceMax = null;
    this.applyFilters();
  }

  hasPriceDropped(property: Property): boolean {
    return !!(property.previousPrice && property.previousPrice > property.currentPrice);
  }

  getPriceDropPercentage(property: Property): number {
    if (!property.previousPrice) return 0;
    const diff = property.previousPrice - property.currentPrice;
    return Math.round((diff / property.previousPrice) * 100);
  }

  setViewMode(mode: 'grid' | 'table'): void {
    this.viewMode = mode;
    this.pagination.limit = mode === 'table' ? 10 : 9;
    this.pagination.page = 1;
    this.loadProperties();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.pagination.page = page;
      this.loadProperties();
    }
  }

  getPagesArray(): number[] {
    const pages = [];
    for (let i = 1; i <= this.pagination.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.isSubmitted = false;
    this.pendingImage = null;
    this.imagePreview = null;
    this.validationErrors = [];
    this.selectedFilesToUpload = [];
    this.uploadPreviews = [];
    this.propertyImages = [];
    this.initForm();
    this.showFormModal = true;
  }

  openEditModal(property: Property, event?: Event): void {
    if (event) event.stopPropagation();
    this.isEditMode = true;
    this.isSubmitted = false;
    this.validationErrors = [];
    this.selectedProperty = property;
    this.pendingImage = null;
    this.imagePreview = property.imageUrl || null;
    this.showDetailDrawer = false;

    this.selectedFilesToUpload = [];
    this.uploadPreviews = [];
    this.propertyImages = property.images ? [...property.images] : [];
    if (property.id) {
      this.loadPropertyImages(property.id);
    }

    this.propertyForm.patchValue({
      name: property.name,
      type: property.type,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      country: property.country,
      description: property.description,
      currentPrice: property.currentPrice,
      previousPrice: property.previousPrice || null,
      status: property.status,
      operationType: property.operationType,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      lotSize: property.lotSize || null,
      yearBuilt: property.yearBuilt,
      ownerName: property.ownerName,
      ownerPhone: property.ownerPhone,
      ownerEmail: property.ownerEmail || '',
      agent: (property as any).agentId || property.agent,
      estimatedCommission: property.estimatedCommission,
      notes: property.notes || '',
      imageUrl: property.imageUrl || ''
    });

    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
  }

  compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.85);
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  }

  onPhoneInput(event: any): void {
    const input = event.target;
    const clean = input.value.replace(/[^\d\s\-()+]/g, '');
    input.value = clean;
    this.propertyForm.get('ownerPhone')?.setValue(clean, { emitEvent: false });
  }

  async onImageSelected(event: any): Promise<void> {
    const rawFile = event.target.files[0];
    if (!rawFile) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(rawFile.type)) {
      this.toastService.error('Formato no permitido. Use JPG, PNG o WEBP.');
      return;
    }

    this.toastService.info('Optimizando imagen...');
    let file = rawFile;
    try {
      file = await this.compressImage(rawFile);
    } catch (err) {
      console.warn('Compression failed, using original file', err);
    }

    this.pendingImage = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
      this.propertyForm.get('imageUrl')?.setValue(this.imagePreview);
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    this.toastService.success('Imagen seleccionada y optimizada.');
  }

  removeImage(): void {
    this.imagePreview = null;
    this.pendingImage = null;
    this.propertyForm.get('imageUrl')?.setValue('');
    this.propertyForm.get('imageUrl')?.markAsTouched();
    this.cdr.detectChanges();
  }

  onSubmitProperty(): void {
    this.isSubmitted = true;
    this.errorMessage = null;
    this.validationErrors = [];
    this.propertyForm.markAllAsTouched();

    if (this.propertyForm.invalid) {
      this.toastService.error('Por favor, complete todos los campos obligatorios marcados con *');
      
      this.validationErrors = [];
      this.errorMessage = 'Por favor, corrija los siguientes errores en el formulario:';
      
      Object.keys(this.propertyForm.controls).forEach(key => {
        const control = this.propertyForm.get(key);
        if (control && control.invalid) {
          let errMsg = 'Campo requerido o inválido.';
          if (control.hasError('required')) {
            errMsg = 'Este campo es obligatorio.';
          } else if (control.hasError('email')) {
            errMsg = 'Correo electrónico inválido.';
          } else if (control.hasError('invalidPhone')) {
            errMsg = control.getError('invalidPhone') || 'Teléfono inválido.';
          } else if (control.hasError('min')) {
            errMsg = `El valor mínimo es ${control.getError('min').min}.`;
          }
          
          this.validationErrors.push({
            label: this.getPropertyFieldLabel(key),
            message: errMsg
          });
        }
      });
      
      this.cdr.detectChanges();
      
      setTimeout(() => {
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
          modalBody.scrollTop = 0;
        }
      }, 50);
      
      return;
    }

    this.isSaving = true;
    const formData = { ...this.propertyForm.value };
    if (formData.ownerPhone) {
      formData.ownerPhone = normalizePhoneNumber(formData.ownerPhone, formData.country);
    }

    const handleBackendError = (err: any) => {
      this.isSaving = false;
      this.errorMessage = err.error?.message || 'Error al guardar la propiedad.';
      this.validationErrors = [];
      
      if (err.error && err.error.errors) {
        err.error.errors.forEach((backendError: any) => {
          let controlName = backendError.field;
          if (backendError.field === 'propertyName') {
            controlName = 'name';
          } else if (backendError.field === 'propertyType') {
            controlName = 'type';
          } else if (backendError.field === 'propertyStatus') {
            controlName = 'status';
          } else if (backendError.field === 'areaSize') {
            controlName = 'area';
          } else if (backendError.field === 'responsibleAgent') {
            controlName = 'agent';
          } else if (backendError.field === 'internalNotes') {
            controlName = 'notes';
          }
          
          const control = this.propertyForm.get(controlName);
          if (control) {
            control.setErrors({ backend: backendError.message });
          }

          this.validationErrors.push({
            label: this.getPropertyFieldLabel(backendError.field),
            message: backendError.message
          });
        });
      }
      this.toastService.error(this.errorMessage || 'Error de validación en el servidor.');
      this.cdr.detectChanges();
      
      setTimeout(() => {
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
          modalBody.scrollTop = 0;
        }
      }, 50);
    };

    if (this.isEditMode && this.selectedProperty) {
      this.propertyService.updateProperty(this.selectedProperty.id!, formData).subscribe({
        next: (res) => {
          if (res.success) {
            if (this.selectedFilesToUpload.length > 0) {
              this.propertyService.uploadPropertyImages(this.selectedProperty!.id!, this.selectedFilesToUpload).subscribe({
                next: () => {
                  this.isSaving = false;
                  this.selectedFilesToUpload = [];
                  this.uploadPreviews = [];
                  this.loadProperties();
                  this.closeFormModal();
                  this.toastService.success('Propiedad actualizada e imágenes subidas correctamente.');
                  this.cdr.detectChanges();
                },
                error: (err) => {
                  this.isSaving = false;
                  this.selectedFilesToUpload = [];
                  this.uploadPreviews = [];
                  this.toastService.error('Propiedad actualizada, pero hubo un error al subir las imágenes.');
                  this.loadProperties();
                  this.closeFormModal();
                  this.cdr.detectChanges();
                }
              });
            } else {
              this.isSaving = false;
              this.loadProperties();
              this.closeFormModal();
              this.toastService.success('Propiedad actualizada correctamente.');
              this.cdr.detectChanges();
            }
          } else {
            this.isSaving = false;
            this.cdr.detectChanges();
          }
        },
        error: (err) => handleBackendError(err)
      });
    } else {
      // Create Mode
      this.propertyService.createProperty(formData).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const createdId = res.data._id || res.data.id;
            
            if (this.selectedFilesToUpload.length > 0) {
              this.propertyService.uploadPropertyImages(createdId!, this.selectedFilesToUpload).subscribe({
                next: () => {
                  this.isSaving = false;
                  this.selectedFilesToUpload = [];
                  this.uploadPreviews = [];
                  this.loadProperties();
                  this.closeFormModal();
                  this.toastService.success('Propiedad registrada e imágenes subidas correctamente.');
                  this.cdr.detectChanges();
                },
                error: () => {
                  this.isSaving = false;
                  this.selectedFilesToUpload = [];
                  this.uploadPreviews = [];
                  this.toastService.error('Propiedad registrada, pero hubo un error al subir las imágenes.');
                  this.loadProperties();
                  this.closeFormModal();
                  this.cdr.detectChanges();
                }
              });
            } else {
              this.isSaving = false;
              this.loadProperties();
              this.closeFormModal();
              this.toastService.success('Propiedad registrada correctamente.');
              this.cdr.detectChanges();
            }
          } else {
            this.isSaving = false;
            this.cdr.detectChanges();
          }
        },
        error: (err) => handleBackendError(err)
      });
    }
  }

  // Detail Drawer Actions
  openDetailDrawer(property: Property): void {
    this.selectedProperty = property;
    this.activeDetailTab = 'general';
    this.showDetailDrawer = true;
    this.selectedFilesToUpload = [];
    this.uploadPreviews = [];
    this.propertyImages = property.images ? [...property.images] : [];
    if (property.id) {
      this.loadPropertyImages(property.id);
    }
  }

  closeDetailDrawer(): void {
    this.showDetailDrawer = false;
  }

  // Delete Actions
  confirmDeleteProperty(propertyId: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.propertyToDeleteId = propertyId;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.propertyToDeleteId = undefined;
  }

  deleteProperty(): void {
    if (this.propertyToDeleteId) {
      this.propertyService.deleteProperty(this.propertyToDeleteId).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadProperties();
            this.closeDeleteConfirm();
            if (this.selectedProperty && this.selectedProperty.id === this.propertyToDeleteId) {
              this.showDetailDrawer = false;
            }
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.cdr.detectChanges();
        }
      });
    }
  }

  // --- IMAGES GALLERY METHODS ---

  loadPropertyImages(propertyId: string): void {
    this.propertyService.getPropertyImages(propertyId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.propertyImages = res.data.images || [];
          if (this.propertyImages.length === 0 && this.selectedProperty?.imageUrl) {
            this.propertyImages = [{
              _id: 'legacy-cover',
              url: this.selectedProperty.imageUrl,
              isMain: true,
              order: 1
            }];
          }
          if (this.selectedProperty) {
            this.selectedProperty.images = this.propertyImages;
            const mainImg = this.propertyImages.find(img => img.isMain);
            if (mainImg) {
              this.selectedProperty.imageUrl = mainImg.url;
            }
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching property images:', err);
        this.cdr.detectChanges();
      }
    });
  }

  getFileSizeString(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onMultipleImagesSelected(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const maxImages = 5;
    const currentImagesCount = this.propertyImages.length + this.selectedFilesToUpload.length;
    const availableSlots = maxImages - currentImagesCount;

    if (files.length > availableSlots) {
      this.toastService.error(`Solo puedes agregar ${availableSlots} imagen(es) más. Cada propiedad permite máximo 5 imágenes.`);
      event.target.value = '';
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size === 0) {
        this.toastService.error(`El archivo "${file.name}" está vacío.`);
        event.target.value = '';
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        this.toastService.error('Solo se permiten imágenes JPG, PNG o WEBP.');
        event.target.value = '';
        return;
      }

      if (file.size > maxSize) {
        this.toastService.error('Cada imagen debe pesar máximo 5MB.');
        event.target.value = '';
        return;
      }

      // Check if image is already uploaded in the gallery
      const alreadyUploaded = this.propertyImages.some(img => img.fileName === file.name);
      // Check if image is already selected in the pending upload list
      const alreadySelected = this.selectedFilesToUpload.some(pendingFile => pendingFile.name === file.name);

      if (alreadyUploaded) {
        this.toastService.error(`La imagen "${file.name}" ya se encuentra en la galería.`);
        event.target.value = '';
        return;
      }

      if (alreadySelected) {
        this.toastService.error(`La imagen "${file.name}" ya está seleccionada para subir.`);
        event.target.value = '';
        return;
      }

      validFiles.push(file);
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.uploadPreviews.push({
          file: file,
          url: e.target.result,
          name: file.name,
          size: this.getFileSizeString(file.size)
        });
        this.selectedFilesToUpload.push(file);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    });

    event.target.value = '';
  }

  removePendingImage(index: number): void {
    this.uploadPreviews.splice(index, 1);
    this.selectedFilesToUpload.splice(index, 1);
    this.cdr.detectChanges();
  }

  uploadSelectedImages(): void {
    if (!this.selectedProperty || !this.selectedProperty.id) {
      this.toastService.error('Primero guarda la propiedad para poder agregar imágenes.');
      return;
    }

    if (this.selectedFilesToUpload.length === 0) {
      this.toastService.error('No hay imágenes seleccionadas para subir.');
      return;
    }

    const totalCount = this.propertyImages.length + this.selectedFilesToUpload.length;
    if (totalCount > 5) {
      this.toastService.error('Solo puedes subir máximo 5 imágenes por propiedad.');
      return;
    }

    this.isSaving = true;
    this.propertyService.uploadPropertyImages(this.selectedProperty.id, this.selectedFilesToUpload).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.success && res.data) {
          this.toastService.success('Imágenes agregadas correctamente.');
          this.uploadPreviews = [];
          this.selectedFilesToUpload = [];
          this.propertyImages = res.data.images || [];
          
          if (this.selectedProperty) {
            this.selectedProperty.images = this.propertyImages;
            const mainImg = this.propertyImages.find(img => img.isMain);
            if (mainImg) {
              this.selectedProperty.imageUrl = mainImg.url;
            }
          }
          this.loadProperties();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        const errMsg = err.error?.message || 'No se pudo subir la imagen.';
        this.toastService.error(errMsg);
        this.cdr.detectChanges();
      }
    });
  }

  setAsMainImage(imageId: string): void {
    if (!this.selectedProperty || !this.selectedProperty.id) return;

    this.propertyService.setMainPropertyImage(this.selectedProperty.id, imageId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.toastService.success('Imagen principal actualizada.');
          this.propertyImages = res.data.images || [];
          if (this.selectedProperty) {
            this.selectedProperty.images = this.propertyImages;
            const mainImg = this.propertyImages.find(img => img.isMain);
            if (mainImg) {
              this.selectedProperty.imageUrl = mainImg.url;
            }
          }
          this.loadProperties();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const errMsg = err.error?.message || 'No se pudo actualizar la imagen principal.';
        this.toastService.error(errMsg);
        this.cdr.detectChanges();
      }
    });
  }

  confirmDeleteImage(imageId: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.imageToDeleteId = imageId;
    this.showImageDeleteConfirm = true;
    this.cdr.detectChanges();
  }

  closeImageDeleteConfirm(): void {
    this.showImageDeleteConfirm = false;
    this.imageToDeleteId = undefined;
    this.cdr.detectChanges();
  }

  deletePropertyImage(): void {
    if (!this.selectedProperty || !this.selectedProperty.id || !this.imageToDeleteId) return;

    if (this.imageToDeleteId === 'legacy-cover') {
      this.propertyService.deleteLegacyCoverImage(this.selectedProperty.id).subscribe({
        next: (res) => {
          this.closeImageDeleteConfirm();
          this.toastService.success('Imagen eliminada correctamente.');
          this.propertyImages = [];
          if (this.selectedProperty) {
            this.selectedProperty.imageUrl = '';
          }
          this.loadProperties();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.closeImageDeleteConfirm();
          const errMsg = err.error?.message || 'No se pudo eliminar la imagen.';
          this.toastService.error(errMsg);
          this.cdr.detectChanges();
        }
      });
      return;
    }

    this.propertyService.deletePropertyImage(this.selectedProperty.id, this.imageToDeleteId).subscribe({
      next: (res) => {
        this.closeImageDeleteConfirm();
        if (res.success && res.data) {
          this.toastService.success('Imagen eliminada correctamente.');
          this.propertyImages = res.data.images || [];
          if (this.selectedProperty) {
            this.selectedProperty.images = this.propertyImages;
            const mainImg = this.propertyImages.find(img => img.isMain);
            this.selectedProperty.imageUrl = mainImg ? mainImg.url : '';
          }
          this.loadProperties();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.closeImageDeleteConfirm();
        const errMsg = err.error?.message || 'No se pudo eliminar la imagen.';
        this.toastService.error(errMsg);
        this.cdr.detectChanges();
      }
    });
  }

  moveImage(index: number, direction: 'up' | 'down'): void {
    if (!this.selectedProperty || !this.selectedProperty.id) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= this.propertyImages.length) return;

    const updatedImages = [...this.propertyImages];
    const temp = updatedImages[index];
    updatedImages[index] = updatedImages[targetIndex];
    updatedImages[targetIndex] = temp;

    const payload = updatedImages.map((img, idx) => ({
      imageId: img._id!,
      order: idx + 1
    }));

    this.propertyService.reorderPropertyImages(this.selectedProperty.id, payload).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.toastService.success('Orden de imágenes actualizado.');
          this.propertyImages = res.data.images || [];
          if (this.selectedProperty) {
            this.selectedProperty.images = this.propertyImages;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        const errMsg = err.error?.message || 'No se pudo reordenar las imágenes.';
        this.toastService.error(errMsg);
        this.cdr.detectChanges();
      }
    });
  }

  // Helpers
  getTypeLabel(value: string | undefined): string {
    if (!value) return 'Otro';
    return this.typeOptions.find(opt => opt.value === value)?.label || value;
  }

  getStatusLabel(value: string | undefined): string {
    if (!value) return 'Inactivo';
    return this.statusOptions.find(opt => opt.value === value)?.label || value;
  }

  getOperationLabel(value: string | undefined): string {
    if (!value) return 'Venta';
    return this.operationOptions.find(opt => opt.value === value)?.label || value;
  }

  prevImage(prop: any, event: Event): void {
    event.stopPropagation();
    const len = prop.images ? prop.images.length : 0;
    if (len <= 1) return;
    prop.activeImageIndex = ((prop.activeImageIndex || 0) - 1 + len) % len;
  }

  nextImage(prop: any, event: Event): void {
    event.stopPropagation();
    const len = prop.images ? prop.images.length : 0;
    if (len <= 1) return;
    prop.activeImageIndex = ((prop.activeImageIndex || 0) + 1) % len;
  }
}
