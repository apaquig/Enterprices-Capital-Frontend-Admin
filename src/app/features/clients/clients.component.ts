import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ClientService } from '../../core/services/client.service';
import { ServiceCatalogService } from '../../core/services/service-catalog.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { Client } from '../../models/client.model';
import { Service } from '../../models/service.model';
import { phoneValidator, normalizePhoneNumber } from '../../core/utils/phone.utils';
import { WhatsAppService } from '../../core/services/whatsapp.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.css']
})
export class ClientsComponent implements OnInit, OnDestroy {
  clients: Client[] = [];
  filteredClients: Client[] = [];
  servicesList: Service[] = [];

  // Selections & Bulk communication (Ultra-fast Set & SelectAll Architecture)
  selectAllMatching = false;
  selectedClientIds = new Set<string>();
  deselectedClientIds = new Set<string>();
  selectedClientsMap = new Map<string, Client>();
  
  get selectedCount(): number {
    if (this.selectAllMatching) {
      const total = this.pagination.total > 0 ? this.pagination.total : this.filteredClients.length;
      return Math.max(0, total - this.deselectedClientIds.size);
    }
    return this.selectedClientIds.size;
  }

  showBulkEmailModal = false;
  showBulkSMSModal = false;
  bulkEmailSubject = '';
  bulkEmailBody = '';
  bulkEmailAttachments: { content: string; name: string }[] = [];
  bulkSMSBody = '';
  isPhonesCopied = false;
  waAttachedImage: { base64: string; name: string; size: string; mimetype: string } | null = null;
  
  // Message Personalization State
  includeGreeting = true;
  salutationType = 'Hola';
  customSalutation = '';
  nameFormat: 'fullName' | 'firstName' | 'lastName' | 'none' = 'fullName';

  salutationOptions = [
    { value: 'Hola', label: 'Hola' },
    { value: 'Estimado/a', label: 'Estimado/a' },
    { value: 'Buenos días', label: 'Buenos días' },
    { value: 'Buenas tardes', label: 'Buenas tardes' },
    { value: 'Saludos cordiales', label: 'Saludos cordiales' },
    { value: 'custom', label: 'Personalizado...' },
    { value: 'none', label: 'Sin saludo (Solo nombre)' }
  ];

  nameFormatOptions = [
    { value: 'fullName', label: 'Nombre Completo (ej: Juan Pérez)' },
    { value: 'firstName', label: 'Solo Primer Nombre (ej: Juan)' },
    { value: 'lastName', label: 'Solo Apellido (ej: Pérez)' },
    { value: 'none', label: 'Sin Nombre' }
  ];

  // WhatsApp Integration State
  waStatus = 'disconnected'; // 'disconnected', 'connecting', 'qr_ready', 'connected'
  waConnectedPhone = '';
  waQRData = '';
  showWhatsAppLinkModal = false;
  showDisconnectConfirmModal = false;
  isDisconnectingWhatsApp = false;
  isLoadingQR = false;
  activeSMSTab = 'manual'; // 'manual' or 'automatic'
  
  // Search & Filters
  searchTerm = '';
  filterStatus = '';
  filterService = '';
  filterSource = '';
  filterCreator = '';

  // Modals & Drawers state
  showFormDrawer = false;
  showDetailDrawer = false;
  showDeleteConfirm = false;
  isLoading = false;
  isSaving = false;
  
  // Pagination
  pagination = {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  };
  
  // Forms & Selections
  clientForm!: FormGroup;
  selectedClient?: Client;
  isEditMode = false;
  isFormSubmitted = false;
  clientToDeleteId?: string;
  errorMessage: string | null = null;
  validationErrors: { label: string; message: string }[] = [];

  private getClientFieldLabel(field: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'Nombre',
      lastName: 'Apellido',
      phone: 'Teléfono',
      email: 'Correo Electrónico',
      birthDate: 'Fecha de Nacimiento',
      address: 'Dirección',
      city: 'Ciudad',
      state: 'Estado',
      zipCode: 'Código Postal',
      preferredLanguage: 'Idioma de Preferencia',
      status: 'Estado CRM',
      clientStatus: 'Estado CRM',
      source: 'Fuente Origen',
      assignedServices: 'Servicios Asignados',
      services: 'Servicios Asignados',
      priority: 'Prioridad',
      assignedAgent: 'Agente Asignado',
      assignedTo: 'Agente Asignado',
      notes: 'Notas Internas',
      internalNotes: 'Notas Internas'
    };
    return labels[field] || field;
  }

  // Feedback modal
  showFeedbackModal = false;
  feedbackTitle = '';
  feedbackMessage = '';
  feedbackType: 'success' | 'danger' = 'success';
  feedbackIcon = '';

  // Detail view active tab
  activeDetailTab = 'general';

  // Available option values
  statusOptions = [
    { value: 'prospect', label: 'Prospecto' },
    { value: 'active', label: 'Activo' },
    { value: 'in_process', label: 'En Proceso' },
    { value: 'inactive', label: 'Inactivo' },
    { value: 'closed', label: 'Cerrado' }
  ];

  sourceOptions = [
    { value: 'referral', label: 'Referido' },
    { value: 'social_media', label: 'Redes Sociales' },
    { value: 'website', label: 'Página Web' },
    { value: 'phone_call', label: 'Llamada' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'office', label: 'Oficina' },
    { value: 'other', label: 'Otro' }
  ];

  priorityOptions = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' }
  ];

  agentOptions: any[] = [];
 
  get isAdmin(): boolean {
    return this.authService.getUserRole() === 'admin';
  }

  constructor(
    private fb: FormBuilder,
    private clientService: ClientService,
    private serviceService: ServiceCatalogService,
    private userService: UserService,
    private authService: AuthService,
    private whatsappService: WhatsAppService,
    private cdr: ChangeDetectorRef
  ) {}

  waGlobalStatusInterval: any = null;

  ngOnInit(): void {
    this.loadServices();
    this.loadClients();
    this.initForm();
    this.loadAgents();
    this.checkWhatsAppStatus();

    // Keep WhatsApp connection status in real-time sync everywhere
    this.waGlobalStatusInterval = setInterval(() => {
      this.checkWhatsAppStatus();
    }, 3500);
  }

  ngOnDestroy(): void {
    if (this.waGlobalStatusInterval) {
      clearInterval(this.waGlobalStatusInterval);
      this.waGlobalStatusInterval = null;
    }
    if (this.waStatusInterval) {
      clearInterval(this.waStatusInterval);
      this.waStatusInterval = null;
    }
  }

  loadAgents(): void {
    this.userService.getUsers().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.agentOptions = res.data.map(u => ({
            id: u._id || u.id || '',
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email
          }));
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  mapToFrontendCompat(c: Client): Client {
    const assignedServices = c.services 
      ? c.services.map((s: any) => (typeof s === 'object' ? (s._id || s.id) : s))
      : (c.assignedServices || []);

    const assignedToRaw = c.assignedTo as any;
    let agentName = 'Sin asignar';
    if (assignedToRaw) {
      if (typeof assignedToRaw === 'object') {
        agentName = `${assignedToRaw.firstName || ''} ${assignedToRaw.lastName || ''}`.trim() || assignedToRaw.email || 'Sin asignar';
      } else {
        agentName = assignedToRaw;
      }
    }

    return {
      ...c,
      id: c._id || c.id || '',
      status: c.clientStatus || c.status || 'prospect',
      assignedServices: assignedServices,
      assignedAgent: agentName,
      assignedAgentId: assignedToRaw?._id || assignedToRaw?.id || assignedToRaw || '',
      notes: c.internalNotes || c.notes || ''
    } as any;
  }

  loadClients(): void {
    this.isLoading = true;
    
    const filters: any = {
      search: this.searchTerm,
      clientStatus: this.filterStatus,
      serviceId: this.filterService,
      source: this.filterSource,
      page: this.pagination.page,
      limit: this.pagination.limit
    };

    if (this.isAdmin && this.filterCreator) {
      filters.createdBy = this.filterCreator;
    }

    this.clientService.getClients(filters).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.clients = res.data.map(c => this.mapToFrontendCompat(c));
          this.filteredClients = this.clients;
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

  loadServices(): void {
    this.serviceService.getServices({ status: 'active' }).subscribe(res => {
      if (res.success && res.data) {
        this.servicesList = res.data.map(s => ({
          ...s,
          id: s._id || s.id
        }));
      }
      this.cdr.detectChanges();
    });
  }

  initForm(): void {
    this.clientForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phone: ['', [Validators.required, phoneValidator()]],
      email: ['', [Validators.email]], // Optional, but validated if present
      birthDate: [''],
      address: [''],
      city: [''],
      state: [''],
      zipCode: [''],
      preferredLanguage: ['Español'],
      status: ['prospect', Validators.required],
      source: ['whatsapp', Validators.required],
      priority: ['medium', Validators.required],
      assignedServices: [[]],
      notes: ['']
    });

    // Clear backend error for a control when its value changes
    Object.keys(this.clientForm.controls).forEach(key => {
      this.clientForm.get(key)?.valueChanges.subscribe(() => {
        const control = this.clientForm.get(key);
        if (control && control.hasError('backend')) {
          const errors = { ...control.errors };
          delete errors['backend'];
          control.setErrors(Object.keys(errors).length ? errors : null);
          this.cdr.detectChanges();
        }
      });
    });
  }
  private searchTimeout: any;

  applyFilters(): void {
    this.clearSelection();
    // 1. Filter locally for instant response
    let temp = [...this.clients];

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      temp = temp.filter(c => 
        (c.firstName && c.firstName.toLowerCase().includes(term)) ||
        (c.lastName && c.lastName.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
      );
    }

    if (this.filterStatus) {
      temp = temp.filter(c => c.status === this.filterStatus);
    }

    if (this.filterSource) {
      temp = temp.filter(c => c.source === this.filterSource);
    }

    if (this.filterService) {
      temp = temp.filter(c => {
        if (!c.assignedServices) return false;
        return c.assignedServices.some((s: any) => {
          const id = typeof s === 'object' ? (s._id || s.id) : s;
          return id === this.filterService;
        });
      });
    }

    if (this.isAdmin && this.filterCreator) {
      temp = temp.filter(c => {
        const creatorId = c.createdBy?._id || c.createdBy?.id || c.createdBy || '';
        return creatorId === this.filterCreator;
      });
    }

    this.filteredClients = temp;
    this.cdr.detectChanges();

    // 2. Debounce backend load
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.pagination.page = 1;
      this.loadClients();
    }, 300);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.pagination.page = page;
      this.loadClients();
    }
  }

  // Handle service multi selection
  onServiceCheckboxChange(serviceId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const currentServices = this.clientForm.get('assignedServices')?.value as string[] || [];
    
    if (checked) {
      this.clientForm.patchValue({ assignedServices: [...currentServices, serviceId] });
    } else {
      this.clientForm.patchValue({ assignedServices: currentServices.filter(id => id !== serviceId) });
    }
  }

  isServiceSelected(serviceId: string): boolean {
    const currentServices = this.clientForm.get('assignedServices')?.value as string[] || [];
    return currentServices.includes(serviceId);
  }

  // Actions
  openCreateDrawer(): void {
    this.isEditMode = false;
    this.isFormSubmitted = false;
    this.errorMessage = null;
    this.validationErrors = [];
    this.initForm();
    this.showFormDrawer = true;
    this.showDetailDrawer = false;
  }

  openEditDrawer(client: Client): void {
    this.isEditMode = true;
    this.isFormSubmitted = false;
    this.errorMessage = null;
    this.validationErrors = [];
    this.selectedClient = client;
    
    this.clientForm.patchValue({
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      email: client.email || '',
      birthDate: client.birthDate || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zipCode: client.zipCode || '',
      preferredLanguage: client.preferredLanguage || 'Español',
      status: client.status,
      source: client.source,
      priority: client.priority,
      assignedServices: client.assignedServices || [],
      notes: client.notes || ''
    });

    this.showFormDrawer = true;
    this.showDetailDrawer = false;
  }

  closeFormDrawer(): void {
    this.showFormDrawer = false;
  }

  showFeedback(type: 'success' | 'danger', title: string, message: string): void {
    this.feedbackType = type;
    this.feedbackTitle = title;
    this.feedbackMessage = message;
    this.feedbackIcon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';
    this.showFeedbackModal = true;
    this.cdr.detectChanges();
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal = false;
    this.cdr.detectChanges();
  }

  onSubmitClient(): void {
    console.log('onSubmitClient called. isEditMode:', this.isEditMode, 'selectedClient:', this.selectedClient);
    this.isFormSubmitted = true;
    this.errorMessage = null;
    this.validationErrors = [];

    if (this.clientForm.invalid) {
      console.log('Form is invalid:', this.clientForm.errors);
      return;
    }

    this.isSaving = true;
    const formData = { ...this.clientForm.value };
    if (formData.phone) {
      formData.phone = normalizePhoneNumber(formData.phone);
    }
    console.log('Form data to submit:', formData);

    if (this.isEditMode && this.selectedClient) {
      console.log('Calling clientService.updateClient for ID:', this.selectedClient.id);
      this.clientService.updateClient(this.selectedClient.id!, formData).subscribe({
        next: (res) => {
          console.log('updateClient next callback triggered. res:', res);
          this.isSaving = false;
          if (res.success) {
            console.log('res.success is true, calling loadClients and closeFormDrawer');
            this.loadClients();
            this.closeFormDrawer();
            this.showFeedback('success', '¡Actualizado con éxito!', 'La información del cliente ha sido actualizada de forma segura.');
          } else {
            console.warn('res.success is false!');
            this.showFeedback('danger', 'Error de actualización', res.message || 'La respuesta del servidor no fue exitosa.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('updateClient error callback triggered. err:', err);
          this.isSaving = false;
          this.errorMessage = err.error?.message || 'Error al actualizar el cliente.';
          
          if (err.error && err.error.errors) {
            err.error.errors.forEach((backendError: any) => {
              let controlName = backendError.field;
              if (backendError.field === 'clientStatus') {
                controlName = 'status';
              } else if (backendError.field === 'services') {
                controlName = 'assignedServices';
              } else if (backendError.field === 'assignedTo') {
                controlName = 'assignedAgent';
              } else if (backendError.field === 'internalNotes') {
                controlName = 'notes';
              }
              
              const control = this.clientForm.get(controlName);
              if (control) {
                control.setErrors({ backend: backendError.message });
              }

              this.validationErrors.push({
                label: this.getClientFieldLabel(backendError.field),
                message: backendError.message
              });
            });
          }
          this.showFeedback('danger', 'Error de actualización', this.errorMessage || 'Error al actualizar el cliente.');
          this.cdr.detectChanges();
        }
      });
    } else {
      console.log('Calling clientService.createClient');
      this.clientService.createClient(formData).subscribe({
        next: (res) => {
          console.log('createClient next callback triggered. res:', res);
          this.isSaving = false;
          if (res.success) {
            this.loadClients();
            this.closeFormDrawer();
            this.showFeedback('success', '¡Registrado con éxito!', 'El cliente ha sido registrado correctamente en el sistema.');
          } else {
            this.showFeedback('danger', 'Error de registro', res.message || 'La respuesta del servidor no fue exitosa.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('createClient error callback triggered. err:', err);
          this.isSaving = false;
          this.errorMessage = err.error?.message || 'Error al registrar el cliente.';
          
          if (err.error && err.error.errors) {
            err.error.errors.forEach((backendError: any) => {
              let controlName = backendError.field;
              if (backendError.field === 'clientStatus') {
                controlName = 'status';
              } else if (backendError.field === 'services') {
                controlName = 'assignedServices';
              } else if (backendError.field === 'assignedTo') {
                controlName = 'assignedAgent';
              } else if (backendError.field === 'internalNotes') {
                controlName = 'notes';
              }
              
              const control = this.clientForm.get(controlName);
              if (control) {
                control.setErrors({ backend: backendError.message });
              }

              this.validationErrors.push({
                label: this.getClientFieldLabel(backendError.field),
                message: backendError.message
              });
            });
          }
          this.showFeedback('danger', 'Error de registro', this.errorMessage || 'Error al registrar el cliente.');
          this.cdr.detectChanges();
        }
      });
    }
  }

  openDetailDrawer(client: Client): void {
    this.selectedClient = client;
    this.activeDetailTab = 'general';
    this.showDetailDrawer = true;
    this.showFormDrawer = false;
  }

  closeDetailDrawer(): void {
    this.showDetailDrawer = false;
  }

  confirmDeleteClient(clientId: string): void {
    this.clientToDeleteId = clientId;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.clientToDeleteId = undefined;
  }

  deleteClient(): void {
    if (this.clientToDeleteId) {
      this.clientService.deleteClient(this.clientToDeleteId).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadClients();
            this.closeDeleteConfirm();
            if (this.selectedClient && this.selectedClient.id === this.clientToDeleteId) {
              this.showDetailDrawer = false;
            }
            this.showFeedback('success', '¡Eliminado con éxito!', 'El cliente ha sido eliminado permanentemente del sistema.');
          } else {
            this.showFeedback('danger', 'Error al eliminar', res.message || 'La respuesta del servidor no fue exitosa.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          const errMsg = err.error?.message || 'No se pudo eliminar el cliente.';
          this.showFeedback('danger', 'Error al eliminar', errMsg);
          this.closeDeleteConfirm();
          this.cdr.detectChanges();
        }
      });
    }
  }

  // Helpers
  getStatusLabel(statusValue: string | undefined): string {
    if (!statusValue) return 'Ninguno';
    const found = this.statusOptions.find(opt => opt.value === statusValue);
    if (found) return found.label;
    if (statusValue === 'in_process') return 'En Proceso';
    return statusValue;
  }

  getSourceLabel(sourceValue: string | undefined): string {
    if (!sourceValue) return 'Ninguno';
    return this.sourceOptions.find(opt => opt.value === sourceValue)?.label || sourceValue;
  }

  getServiceName(serviceId: string | undefined): string {
    if (!serviceId) return 'Servicio Desconocido';
    return this.servicesList.find(s => s.id === serviceId)?.name || 'Servicio Desconocido';
  }

  getServiceCategory(serviceId: string | undefined): string {
    if (!serviceId) return 'General';
    return this.servicesList.find(s => s.id === serviceId)?.category || 'General';
  }

  getWhatsAppLink(phone: string): string {
    const cleanNumber = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanNumber}`;
  }

  getPagesArray(): (number | string)[] {
    const total = this.pagination.totalPages;
    const current = this.pagination.page;
    const delta = 2; // pages around current
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    const left = Math.max(2, current - delta);
    const right = Math.min(total - 1, current + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 1) pages.push('...');
    pages.push(total);

    return pages;
  }

  // Helper to extract active filters for bulk queries
  getActiveFilters(): any {
    const filters: any = {
      search: this.searchTerm,
      clientStatus: this.filterStatus,
      serviceId: this.filterService,
      source: this.filterSource
    };
    if (this.isAdmin && this.filterCreator) {
      filters.createdBy = this.filterCreator;
    }
    return filters;
  }

  // Selection Helper Methods (Instant 0ms Set Architecture)
  isClientSelected(client: Client): boolean {
    const clientId = client.id || client._id || '';
    if (!clientId) return false;
    if (this.selectAllMatching) {
      return !this.deselectedClientIds.has(clientId);
    }
    return this.selectedClientIds.has(clientId);
  }

  toggleClientSelection(client: Client, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const clientId = client.id || client._id || '';
    if (!clientId) return;

    if (this.selectAllMatching) {
      if (!checked) {
        this.deselectedClientIds.add(clientId);
      } else {
        this.deselectedClientIds.delete(clientId);
      }
      const total = this.pagination.total > 0 ? this.pagination.total : this.filteredClients.length;
      if (this.deselectedClientIds.size >= total) {
        this.clearSelection();
      }
    } else {
      if (checked) {
        this.selectedClientIds.add(clientId);
        this.selectedClientsMap.set(clientId, client);
        const total = this.pagination.total > 0 ? this.pagination.total : this.filteredClients.length;
        if (total > 0 && this.selectedClientIds.size >= total) {
          this.selectAllMatching = true;
          this.deselectedClientIds.clear();
          this.selectedClientIds.clear();
          this.selectedClientsMap.clear();
        }
      } else {
        this.selectedClientIds.delete(clientId);
        this.selectedClientsMap.delete(clientId);
      }
    }
    this.cdr.detectChanges();
  }

  areAllSelected(): boolean {
    const totalCount = this.pagination.total > 0 ? this.pagination.total : this.filteredClients.length;
    if (totalCount === 0) return false;
    if (this.selectAllMatching) {
      return this.deselectedClientIds.size === 0;
    }
    return this.selectedClientIds.size >= totalCount;
  }

  isPartiallySelected(): boolean {
    if (this.selectAllMatching) {
      return this.deselectedClientIds.size > 0 && this.selectedCount > 0;
    }
    return this.selectedClientIds.size > 0 && !this.areAllSelected();
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (!checked || this.areAllSelected()) {
      this.clearSelection();
      return;
    }

    // Instant 0ms selection of all records across all pages
    this.selectAllMatching = true;
    this.deselectedClientIds.clear();
    this.selectedClientIds.clear();
    this.selectedClientsMap.clear();
    this.cdr.detectChanges();
  }

  clearSelection(): void {
    this.selectAllMatching = false;
    this.deselectedClientIds.clear();
    this.selectedClientIds.clear();
    this.selectedClientsMap.clear();
    this.cdr.detectChanges();
  }

  // Communication Helper Methods
  get selectedEmailCount(): number {
    if (this.selectAllMatching) {
      return this.selectedCount;
    }
    return this.getClientsWithEmail().length;
  }

  get selectedPhoneCount(): number {
    if (this.selectAllMatching) {
      return this.selectedCount;
    }
    return this.getClientsWithPhone().length;
  }

  getClientsWithEmail(): Client[] {
    if (this.selectAllMatching) {
      return this.filteredClients.filter(c => !this.deselectedClientIds.has(c.id || c._id || '') && !!c.email);
    }
    return Array.from(this.selectedClientsMap.values()).filter(c => !!c.email);
  }

  getClientsWithPhone(): Client[] {
    if (this.selectAllMatching) {
      return this.filteredClients.filter(c => !this.deselectedClientIds.has(c.id || c._id || '') && !!c.phone);
    }
    return Array.from(this.selectedClientsMap.values()).filter(c => !!c.phone);
  }

  openBulkEmailModal(): void {
    this.bulkEmailSubject = '';
    this.bulkEmailBody = '';
    this.bulkEmailAttachments = [];
    this.showBulkEmailModal = true;
    this.cdr.detectChanges();
  }

  closeBulkEmailModal(): void {
    this.showBulkEmailModal = false;
    this.bulkEmailAttachments = [];
    this.cdr.detectChanges();
  }

  onEmailAttachmentsChange(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Content = e.target.result.split(',')[1];
        this.bulkEmailAttachments.push({
          content: base64Content,
          name: file.name
        });
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeEmailAttachment(index: number): void {
    this.bulkEmailAttachments.splice(index, 1);
    this.cdr.detectChanges();
  }

  sendBulkEmail(): void {
    if (this.selectedCount === 0) {
      this.showFeedback('danger', 'Sin destinatarios', 'Debe seleccionar al menos un cliente.');
      return;
    }

    if (!this.bulkEmailSubject.trim()) {
      this.showFeedback('danger', 'Asunto requerido', 'El asunto del correo es obligatorio.');
      return;
    }

    this.isLoading = true;

    const payload: any = {
      subject: this.bulkEmailSubject,
      body: this.bulkEmailBody,
      attachments: this.bulkEmailAttachments
    };

    if (this.selectAllMatching) {
      payload.selectAll = true;
      payload.filters = this.getActiveFilters();
      payload.excludedIds = Array.from(this.deselectedClientIds);
    } else {
      payload.clientIds = Array.from(this.selectedClientIds);
    }

    this.clientService.sendBulkEmails(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.showFeedback('success', 'Procesando Envíos', res.message || 'El envío de correos ha comenzado en segundo plano con un intervalo de 1 minuto entre cada cliente.');
          this.clearSelection();
          this.closeBulkEmailModal();
        } else {
          this.showFeedback('danger', 'Error al enviar', res.message || 'La respuesta del servidor no fue exitosa.');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        const errMsg = err.error?.message || 'Ocurrió un error al intentar enviar los correos desde el servidor.';
        this.showFeedback('danger', 'Error al enviar', errMsg);
        this.cdr.detectChanges();
      }
    });
  }

  openBulkSMSModal(): void {
    this.bulkSMSBody = '';
    this.waAttachedImage = null;
    this.isPhonesCopied = false;
    this.checkWhatsAppStatus();
    this.showBulkSMSModal = true;
    this.cdr.detectChanges();
  }

  closeBulkSMSModal(): void {
    this.showBulkSMSModal = false;
    this.waAttachedImage = null;
    this.cdr.detectChanges();
  }

  isProcessingImage = false;

  async onWhatsAppImageSelected(event: any): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    await this.processImageFile(file);
    event.target.value = '';
  }

  onImageDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onImageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processImageFile(file);
    }
  }

  async processImageFile(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      this.showFeedback('danger', 'Formato no soportado', 'Por favor seleccione un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    // Direct instant load for standard image sizes (up to 2.5 MB)
    if (file.size <= 2.5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.waAttachedImage = {
          base64: e.target.result,
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          mimetype: file.type || 'image/jpeg'
        };
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
      return;
    }

    // Fast optimization only if image exceeds 2.5 MB
    this.isProcessingImage = true;
    this.cdr.detectChanges();

    try {
      const optimized = await this.quickOptimizeLargeImage(file);
      this.waAttachedImage = optimized;
      this.isProcessingImage = false;
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error procesando imagen grande:', err);
      // Fallback: direct read
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.waAttachedImage = {
          base64: e.target.result,
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          mimetype: file.type || 'image/jpeg'
        };
        this.isProcessingImage = false;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  quickOptimizeLargeImage(file: File, maxDimension = 1920, quality = 0.90): Promise<{ base64: string; size: string; name: string; mimetype: string }> {
    return new Promise((resolve, reject) => {
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = (e) => {
        URL.revokeObjectURL(blobUrl);
        reject(e);
      };
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        let width = img.width;
        let height = img.height;

        // Resize only if strictly larger than 1920px
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(outputType, quality);

        const stringLength = compressedBase64.length - 'data:image/jpeg;base64,'.length;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383612;
        const sizeInKb = (sizeInBytes / 1024).toFixed(1);

        resolve({
          base64: compressedBase64,
          name: file.name,
          size: `${sizeInKb} KB (Listo para WhatsApp)`,
          mimetype: outputType
        });
      };
      img.src = blobUrl;
    });
  }

  removeWhatsAppImage(): void {
    this.waAttachedImage = null;
    this.cdr.detectChanges();
  }

  copyPhonesToClipboard(): void {
    if (this.selectAllMatching) {
      this.isLoading = true;
      const filters = {
        ...this.getActiveFilters(),
        page: 1,
        limit: this.pagination.total > 0 ? this.pagination.total : 10000
      };
      this.clientService.getClients(filters).subscribe({
        next: (res) => {
          this.isLoading = false;
          const allPhones = (res.data || [])
            .filter(c => !this.deselectedClientIds.has(c.id || c._id || '') && !!c.phone)
            .map(c => c.phone.trim());
          
          if (allPhones.length === 0) {
            this.showFeedback('danger', 'Sin teléfonos', 'Ninguno de los clientes seleccionados tiene un teléfono válido.');
            this.cdr.detectChanges();
            return;
          }
          const phonesString = allPhones.join(', ');
          navigator.clipboard.writeText(phonesString).then(() => {
            this.isPhonesCopied = true;
            this.showFeedback('success', 'Teléfonos Copiados', `Se han copiado ${allPhones.length} números de teléfono al portapapeles.`);
            this.cdr.detectChanges();
            setTimeout(() => {
              this.isPhonesCopied = false;
              this.cdr.detectChanges();
            }, 3000);
          }).catch(err => {
            console.error('Error al copiar:', err);
            this.showFeedback('danger', 'Error al copiar', 'No se pudo copiar la lista de teléfonos automáticamente.');
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.isLoading = false;
          this.showFeedback('danger', 'Error', 'No se pudieron obtener los teléfonos.');
          this.cdr.detectChanges();
        }
      });
      return;
    }

    const phones = this.getClientsWithPhone().map(c => c.phone.trim());
    if (phones.length === 0) {
      this.showFeedback('danger', 'Sin teléfonos', 'Ninguno de los clientes seleccionados tiene un teléfono válido.');
      return;
    }

    const phonesString = phones.join(', ');
    navigator.clipboard.writeText(phonesString).then(() => {
      this.isPhonesCopied = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.isPhonesCopied = false;
        this.cdr.detectChanges();
      }, 3000);
    }).catch(err => {
      console.error('Error al copiar al portapapeles:', err);
      this.showFeedback('danger', 'Error al copiar', 'No se pudo copiar la lista de teléfonos automáticamente.');
    });
  }

  sendGroupSMS(): void {
    const phones = this.getClientsWithPhone().map(c => c.phone.trim());
    if (phones.length === 0) {
      this.showFeedback('danger', 'Sin teléfonos', 'Ninguno de los clientes seleccionados tiene un teléfono válido.');
      return;
    }

    const phonesString = phones.join(',');
    const smsUrl = `sms:${phonesString}?body=${encodeURIComponent(this.bulkSMSBody)}`;
    this.launchSMSProtocol(smsUrl);
  }

  getEffectiveSalutation(): string {
    if (!this.includeGreeting) return '';
    if (this.salutationType === 'custom') {
      return this.customSalutation || '';
    }
    if (this.salutationType === 'none') {
      return '';
    }
    return this.salutationType;
  }

  insertTag(tag: string): void {
    const textarea = document.getElementById('bulkSMSBodyTextarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart || this.bulkSMSBody.length;
      const end = textarea.selectionEnd || this.bulkSMSBody.length;
      const text = this.bulkSMSBody;
      this.bulkSMSBody = text.substring(0, start) + tag + text.substring(end);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
        this.cdr.detectChanges();
      }, 0);
    } else {
      this.bulkSMSBody = (this.bulkSMSBody || '') + ' ' + tag;
    }
    this.cdr.detectChanges();
  }

  getFormattedPersonalizedMessage(client?: Client): string {
    const targetClient = client || this.getClientsWithPhone()[0] || ({
      firstName: 'Patricia',
      lastName: 'Lojan',
      phone: '+19738203353',
      email: 'patricia@ejemplo.com'
    } as any);

    const firstName = (targetClient.firstName || '').trim();
    const lastName = (targetClient.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || 'Cliente';

    let selectedName = fullName;
    if (this.nameFormat === 'firstName') selectedName = firstName || 'Cliente';
    else if (this.nameFormat === 'lastName') selectedName = lastName || 'Cliente';
    else if (this.nameFormat === 'none') selectedName = '';

    let template = this.bulkSMSBody || '';

    // Replace dynamic variable placeholders
    template = template
      .replace(/\{\{\s*nombre\s*\}\}|\{\s*nombre\s*\}|\{\{\s*firstname\s*\}\}|\{\s*firstname\s*\}/gi, firstName || 'Cliente')
      .replace(/\{\{\s*apellido\s*\}\}|\{\s*apellido\s*\}|\{\{\s*lastname\s*\}\}|\{\s*lastname\s*\}/gi, lastName || '')
      .replace(/\{\{\s*nombre_completo\s*\}\}|\{\s*nombre_completo\s*\}|\{\{\s*fullname\s*\}\}|\{\s*fullname\s*\}/gi, fullName)
      .replace(/\{\{\s*email\s*\}\}|\{\s*email\s*\}/gi, targetClient.email || '')
      .replace(/\{\{\s*telefono\s*\}\}|\{\s*telefono\s*\}/gi, targetClient.phone || '');

    let fullMessage = template;
    if (this.includeGreeting) {
      const prefix = this.getEffectiveSalutation().trim();
      let greetingLine = '';
      if (prefix && selectedName) {
        greetingLine = `${prefix} ${selectedName},\n\n`;
      } else if (prefix) {
        greetingLine = `${prefix},\n\n`;
      } else if (selectedName) {
        greetingLine = `${selectedName},\n\n`;
      }

      if (greetingLine) {
        fullMessage = `${greetingLine}${template}`;
      }
    }

    return fullMessage;
  }

  sendIndividualSMS(client: Client): void {
    const cleanNumber = client.phone.replace(/[^\d+]/g, '');
    const message = this.getFormattedPersonalizedMessage(client);
    const smsUrl = `sms:${cleanNumber}?body=${encodeURIComponent(message)}`;
    this.launchSMSProtocol(smsUrl);
  }

  launchSMSProtocol(smsUrl: string): void {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = smsUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 500);
  }

  getIndividualWhatsAppLink(client: Client): string {
    const cleanNumber = client.phone.replace(/[^0-9]/g, '');
    const message = this.getFormattedPersonalizedMessage(client);
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  }

  // WhatsApp Integration Methods
  waStatusInterval: any = null;

  checkWhatsAppStatus(): void {
    this.whatsappService.getStatus().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.waStatus = res.data.status;
          this.waConnectedPhone = res.data.connectedPhone || '';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al consultar estado de WhatsApp:', err);
      }
    });
  }

  openWhatsAppLinkModal(): void {
    this.showWhatsAppLinkModal = true;
    this.waQRData = '';
    
    if (this.waStatus === 'connected') {
      this.isLoadingQR = false;
      this.cdr.detectChanges();
      return;
    }

    this.isLoadingQR = true;
    this.cdr.detectChanges();

    this.fetchWhatsAppQR();

    // Start polling status every 2.5 seconds to auto-update when connected
    if (this.waStatusInterval) {
      clearInterval(this.waStatusInterval);
    }
    
    this.waStatusInterval = setInterval(() => {
      this.whatsappService.getStatus().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const prevStatus = this.waStatus;
            this.waStatus = res.data.status;
            this.waConnectedPhone = res.data.connectedPhone || '';
            if (this.waStatus === 'connected') {
              this.isLoadingQR = false;
              this.waQRData = '';
              if (prevStatus !== 'connected') {
                this.showFeedback('success', '¡WhatsApp Vinculado!', `Tu número +${this.waConnectedPhone} se ha conectado con éxito.`);
              }
            }
            this.cdr.detectChanges();
          }
        },
        error: (err) => console.error('Error en sondeo de estado WhatsApp:', err)
      });
    }, 2500);
  }

  fetchWhatsAppQR(retryCount = 0): void {
    this.isLoadingQR = true;
    this.cdr.detectChanges();

    this.whatsappService.getQR().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          if (res.data.qr) {
            this.waQRData = res.data.qr;
            this.isLoadingQR = false;
            this.cdr.detectChanges();
            return;
          }
          
          if (res.data.loading) {
            if (retryCount < 10 && this.showWhatsAppLinkModal) {
              setTimeout(() => {
                if (this.showWhatsAppLinkModal && !this.waQRData) {
                  this.fetchWhatsAppQR(retryCount + 1);
                }
              }, 1500);
              return;
            }
          }
        }
        
        this.isLoadingQR = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al obtener QR de WhatsApp:', err);
        if (retryCount < 5 && this.showWhatsAppLinkModal) {
          setTimeout(() => {
            if (this.showWhatsAppLinkModal && !this.waQRData) {
              this.fetchWhatsAppQR(retryCount + 1);
            }
          }, 2000);
        } else {
          this.isLoadingQR = false;
          this.showFeedback('danger', 'Error al obtener QR', 'No se pudo generar el código QR de WhatsApp.');
          this.cdr.detectChanges();
        }
      }
    });
  }

  closeWhatsAppLinkModal(): void {
    this.showWhatsAppLinkModal = false;
    this.waQRData = '';
    this.isLoadingQR = false;
    if (this.waStatusInterval) {
      clearInterval(this.waStatusInterval);
      this.waStatusInterval = null;
    }
    this.cdr.detectChanges();
  }

  openDisconnectConfirmModal(): void {
    this.showDisconnectConfirmModal = true;
    this.cdr.detectChanges();
  }

  closeDisconnectConfirmModal(): void {
    if (!this.isDisconnectingWhatsApp) {
      this.showDisconnectConfirmModal = false;
      this.cdr.detectChanges();
    }
  }

  confirmLogoutWhatsApp(): void {
    this.isDisconnectingWhatsApp = true;
    this.cdr.detectChanges();

    this.whatsappService.logout().subscribe({
      next: (res) => {
        this.isDisconnectingWhatsApp = false;
        this.showDisconnectConfirmModal = false;
        this.waStatus = 'disconnected';
        this.waConnectedPhone = '';
        this.waQRData = '';
        this.showWhatsAppLinkModal = false;
        if (this.waStatusInterval) {
          clearInterval(this.waStatusInterval);
          this.waStatusInterval = null;
        }
        this.showFeedback('success', 'WhatsApp Desvinculado', 'Tu número de WhatsApp se ha desconectado correctamente del CRM.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al desvincular WhatsApp:', err);
        this.isDisconnectingWhatsApp = false;
        this.showDisconnectConfirmModal = false;
        this.waStatus = 'disconnected';
        this.waConnectedPhone = '';
        this.waQRData = '';
        this.showWhatsAppLinkModal = false;
        if (this.waStatusInterval) {
          clearInterval(this.waStatusInterval);
          this.waStatusInterval = null;
        }
        this.showFeedback('success', 'WhatsApp Desvinculado', 'La sesión de WhatsApp ha sido cerrada.');
        this.cdr.detectChanges();
      }
    });
  }

  logoutWhatsApp(): void {
    this.openDisconnectConfirmModal();
  }

  sendBulkWhatsAppCRM(): void {
    if (this.selectedCount === 0) {
      this.showFeedback('danger', 'Sin teléfonos', 'Debe seleccionar al menos un cliente.');
      return;
    }

    if (!this.bulkSMSBody.trim() && !this.waAttachedImage) {
      this.showFeedback('danger', 'Mensaje vacío', 'Debe escribir un mensaje o adjuntar una imagen para envíos automáticos.');
      return;
    }

    this.isLoading = true;

    const payload: any = {
      body: this.bulkSMSBody,
      salutationPrefix: this.getEffectiveSalutation(),
      includeGreeting: this.includeGreeting,
      nameFormat: this.nameFormat
    };

    if (this.waAttachedImage) {
      payload.media = {
        base64: this.waAttachedImage.base64,
        name: this.waAttachedImage.name,
        mimetype: this.waAttachedImage.mimetype
      };
    }

    if (this.selectAllMatching) {
      payload.selectAll = true;
      payload.filters = this.getActiveFilters();
      payload.excludedIds = Array.from(this.deselectedClientIds);
    } else {
      payload.clientIds = Array.from(this.selectedClientIds);
    }

    this.whatsappService.sendBulkWhatsApp(payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.showFeedback('success', 'Procesando Envíos', res.message || 'El envío de mensajes de WhatsApp ha comenzado en segundo plano con un intervalo de 10 segundos entre cada cliente.');
          this.clearSelection();
          this.closeBulkSMSModal();
        } else {
          this.showFeedback('danger', 'Error al enviar', res.message || 'La respuesta del servidor no fue exitosa.');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        const errMsg = err.error?.message || 'Ocurrió un error al intentar enviar los mensajes por WhatsApp.';
        this.showFeedback('danger', 'Error al enviar', errMsg);
        this.cdr.detectChanges();
      }
    });
  }
}
