import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ServiceCatalogService } from '../../core/services/service-catalog.service';
import { ClientService } from '../../core/services/client.service';
import { ToastService } from '../../core/services/toast.service';
import { Service } from '../../models/service.model';
import { Client } from '../../models/client.model';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.css']
})
export class ServicesComponent implements OnInit {
  services: Service[] = [];
  filteredServices: Service[] = [];
  clients: Client[] = [];
  
  // Search & Filters
  searchTerm = '';
  filterCategory = '';
  filterStatus = '';

  // Categories list
  categories = [
    'Trámites y Notaría',
    'Contabilidad y Finanzas',
    'Seguros',
    'Real Estate',
    'Retiro y Jubilación'
  ];

  // Drawer / Modals State
  showFormModal = false;
  showClientsModal = false;
  showDeleteConfirm = false;
  isLoading = false;
  isSaving = false;
  serviceToDeleteId?: string;
  
  // Form variables
  serviceForm!: FormGroup;
  selectedService?: Service;
  isEditMode = false;
  isSubmitted = false;
  errorMessage: string | null = null;
  validationErrors: { label: string; message: string }[] = [];

  private getServiceFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      name: 'Nombre del Servicio',
      category: 'Categoría',
      description: 'Descripción',
      estimatedPrice: 'Precio Estimado',
      status: 'Estado',
      estimatedDuration: 'Duración Estimada',
      requiredDocuments: 'Documentos Requeridos',
      notes: 'Notas Internas',
      internalNotes: 'Notas Internas'
    };
    return labels[field] || field;
  }

  // Related Clients list
  relatedClients: Client[] = [];
  viewedServiceName = '';

  constructor(
    private fb: FormBuilder,
    private serviceService: ServiceCatalogService,
    private clientService: ClientService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadClients();
    this.loadServices();
    this.initForm();
  }

  loadServices(): void {
    this.isLoading = true;
    this.serviceService.getServices().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.services = res.data.map(s => ({
            ...s,
            id: s._id || s.id,
            notes: s.internalNotes || s.notes || ''
          }));
          this.applyFilters();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadClients(): void {
    this.clientService.getClients().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.clients = res.data.map(c => ({
            ...c,
            id: c._id || c.id,
            assignedServices: c.services 
              ? c.services.map((s: any) => (typeof s === 'object' ? (s._id || s.id) : s))
              : (c.assignedServices || [])
          }));
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  initForm(): void {
    this.serviceForm = this.fb.group({
      name: ['', Validators.required],
      category: ['Trámites y Notaría', Validators.required],
      description: ['', Validators.required],
      status: ['active', Validators.required],
      requiredDocuments: [''], // Will handle as string in form, then split by comma
      notes: ['']
    });

    // Clear backend error for a control when its value changes
    Object.keys(this.serviceForm.controls).forEach(key => {
      this.serviceForm.get(key)?.valueChanges.subscribe(() => {
        const control = this.serviceForm.get(key);
        if (control && control.hasError('backend')) {
          const errors = { ...control.errors };
          delete errors['backend'];
          control.setErrors(Object.keys(errors).length ? errors : null);
          this.cdr.detectChanges();
        }
      });
    });
  }

  applyFilters(): void {
    let result = [...this.services];

    // Search by name
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(term));
    }

    // Filter by category
    if (this.filterCategory) {
      result = result.filter(s => s.category === this.filterCategory);
    }

    // Filter by status
    if (this.filterStatus) {
      result = result.filter(s => s.status === this.filterStatus);
    }

    this.filteredServices = result;
  }

  // Get services grouped by Category (for the display UI)
  getServicesByCategory(category: string): Service[] {
    return this.filteredServices.filter(s => s.category === category);
  }

  // Related clients count
  getRelatedClientsCount(serviceId: string | undefined): number {
    if (!serviceId) return 0;
    return this.clients.filter(c => c.assignedServices?.includes(serviceId)).length;
  }

  // Actions
  openCreateModal(): void {
    this.isEditMode = false;
    this.isSubmitted = false;
    this.errorMessage = null;
    this.validationErrors = [];
    this.initForm();
    this.showFormModal = true;
  }

  openEditModal(service: Service): void {
    this.isEditMode = true;
    this.isSubmitted = false;
    this.errorMessage = null;
    this.validationErrors = [];
    this.selectedService = service;

    this.serviceForm.patchValue({
      name: service.name,
      category: service.category,
      description: service.description,
      status: service.status,
      requiredDocuments: service.requiredDocuments ? service.requiredDocuments.join(', ') : '',
      notes: service.notes || ''
    });

    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
  }

  onSubmitService(): void {
    this.isSubmitted = true;
    this.errorMessage = null;

    if (this.serviceForm.invalid) {
      this.toastService.error('Por favor, complete todos los campos obligatorios.');
      return;
    }

    this.isSaving = true;
    const formData = this.serviceForm.value;
    const docs = formData.requiredDocuments
      ? formData.requiredDocuments.split(',').map((d: string) => d.trim()).filter((d: string) => d.length > 0)
      : [];

    const servicePayload: any = {
      ...formData,
      requiredDocuments: docs,
      internalNotes: formData.notes
    };
    delete servicePayload.notes;

    const handleBackendError = (err: any) => {
      this.isSaving = false;
      this.errorMessage = err.error?.message || 'Error al guardar el servicio.';
      this.toastService.error(this.errorMessage || 'Error al guardar el servicio.');
      this.validationErrors = [];
      
      if (err.error && err.error.errors) {
        err.error.errors.forEach((backendError: any) => {
          let controlName = backendError.field;
          if (backendError.field === 'internalNotes') {
            controlName = 'notes';
          }
          
          const control = this.serviceForm.get(controlName);
          if (control) {
            control.setErrors({ backend: backendError.message });
          }

          this.validationErrors.push({
            label: this.getServiceFieldLabel(backendError.field),
            message: backendError.message
          });
        });
      }
      this.cdr.detectChanges();
    };

    if (this.isEditMode && this.selectedService) {
      this.serviceService.updateService(this.selectedService.id!, servicePayload).subscribe({
        next: (res) => {
          this.isSaving = false;
          if (res.success) {
            this.loadServices();
            this.closeFormModal();
            this.toastService.success('Servicio actualizado con éxito.');
          } else {
            this.toastService.error(res.message || 'Error al actualizar el servicio.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => handleBackendError(err)
      });
    } else {
      this.serviceService.createService(servicePayload).subscribe({
        next: (res) => {
          this.isSaving = false;
          if (res.success) {
            this.loadServices();
            this.closeFormModal();
            this.toastService.success('Servicio creado con éxito.');
          } else {
            this.toastService.error(res.message || 'Error al crear el servicio.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => handleBackendError(err)
      });
    }
  }

  toggleServiceStatus(service: Service, event: Event): void {
    event.stopPropagation(); // prevent card click
    this.serviceService.toggleServiceStatus(service.id!).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadServices();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  viewRelatedClients(service: Service, event: Event): void {
    event.stopPropagation();
    this.viewedServiceName = service.name;
    this.relatedClients = this.clients.filter(c => c.assignedServices?.includes(service.id!));
    this.showClientsModal = true;
  }

  closeClientsModal(): void {
    this.showClientsModal = false;
  }

  confirmDeleteService(serviceId: string, event: Event): void {
    event.stopPropagation();
    this.serviceToDeleteId = serviceId;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.serviceToDeleteId = undefined;
  }

  deleteService(): void {
    if (this.serviceToDeleteId) {
      this.serviceService.deleteService(this.serviceToDeleteId).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadServices();
            this.closeDeleteConfirm();
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.cdr.detectChanges();
        }
      });
    }
  }

  getStatusLabel(statusValue: string | undefined): string {
    if (!statusValue) return 'Inactivo';
    const statusOptions = [
      { value: 'prospect', label: 'Prospecto' },
      { value: 'active', label: 'Activo' },
      { value: 'in_process', label: 'En Proceso' },
      { value: 'inactive', label: 'Inactivo' },
      { value: 'closed', label: 'Cerrado' }
    ];
    return statusOptions.find(opt => opt.value === statusValue)?.label || statusValue;
  }
}
