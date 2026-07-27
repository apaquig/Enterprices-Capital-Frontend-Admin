import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../core/services/client.service';
import { ToastService } from '../../core/services/toast.service';
import { Client } from '../../models/client.model';
import { forkJoin } from 'rxjs';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-prospect-template',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prospect-template.component.html',
  styleUrls: ['./prospect-template.component.css']
})
export class ProspectTemplateComponent implements OnInit {
  evaluatedClients: Client[] = [];
  availableClients: Client[] = [];
  selectedClientIdForEvaluation = '';
  clientSearchText = '';
  showDropdown = false;
  filteredDropdownClients: Client[] = [];

  get filteredAvailableClients(): Client[] {
    const evaluatedIds = new Set(this.evaluatedClients.map(c => c._id || c.id));
    return this.availableClients.filter(c => !evaluatedIds.has(c._id || c.id));
  }

  showNewRow = false;
  isLoading = false;
  isInitialLoading = true;
  isSavingEvaluation = false;

  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  pageSize = 10;

  newRowErrors = {
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  };

  newRowData = {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    salud: null as any,
    edad25_50: null as any,
    enParejaCasado: null as any,
    duenoCasa: null as any,
    hijos: null as any,
    trabaja: null as any,
    puntos: null as any,
    observacion: '',
    usState: 'NJ'
  };

  usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  currentUser: any = null;
  agentOptions: any[] = [];
  filterCreator = '';

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  constructor(
    private clientService: ClientService,
    private toastService: ToastService,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user && !this.filterCreator) {
        this.filterCreator = user._id || user.id || '';
      }
    });
  }

  tableSearchText = '';

  ngOnInit(): void {
    this.loadUnresolvedClients();
    this.loadProspects();
    this.loadAgents();
  }

  loadAgents(): void {
    this.userService.getUsers().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.agentOptions = res.data.map(u => ({
            id: u._id || u.id || '',
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            role: u.role
          }));
        }
        this.cdr.detectChanges();
      }
    });
  }

  onCreatorChange(): void {
    this.currentPage = 1;
    this.loadProspects();
    this.loadUnresolvedClients();
  }

  loadUnresolvedClients(): void {
    const params: any = { hasEvaluation: 'false', limit: 300 };
    if (this.filterCreator) {
      params.createdBy = this.filterCreator;
    }
    this.clientService.getClients(params).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.availableClients = res.data;
          this.filterDropdown();
        }
      }
    });
  }

  loadProspects(): void {
    if (this.isInitialLoading) {
      this.isLoading = true;
    }
    const params: any = { 
      hasEvaluation: 'true', 
      page: this.currentPage, 
      limit: this.pageSize, 
      sort: '-updatedAt',
      search: this.tableSearchText.trim() || undefined
    };
    if (this.filterCreator) {
      params.createdBy = this.filterCreator;
    }
    this.clientService.getClients(params).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.isInitialLoading = false;
        if (res.success && res.data) {
          this.evaluatedClients = res.data.filter(client => {
            return client.leadEvaluation && (client.leadEvaluation.isQualified || (client.leadEvaluation.puntos !== undefined && client.leadEvaluation.puntos > 0));
          });
          if (res.pagination) {
            this.totalPages = res.pagination.totalPages || 1;
            this.totalItems = res.pagination.total || 0;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.isInitialLoading = false;
        this.toastService.error('Error al cargar la lista de prospectos.');
        this.cdr.detectChanges();
      }
    });
  }

  onTableSearch(): void {
    this.currentPage = 1;
    this.loadProspects();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadProspects();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadProspects();
    }
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.currentPage = p;
      this.loadProspects();
    }
  }

  filterDropdown(): void {
    const query = this.clientSearchText.trim().toLowerCase();
    if (!query) {
      this.filteredDropdownClients = this.filteredAvailableClients.slice(0, 15); // Show first 15 as suggestions
      return;
    }
    this.filteredDropdownClients = this.filteredAvailableClients.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
      (c.phone && c.phone.includes(query))
    );
  }

  selectDropdownClient(client: Client): void {
    this.selectedClientIdForEvaluation = client._id || client.id || '';
    this.clientSearchText = `${client.firstName} ${client.lastName} (${client.phone})`;
    this.showDropdown = false;
  }

  openWhatsApp(phone: string): void {
    if (!phone) return;
    const cleaned = phone.replace(/\D/g, ''); // Remove non-numeric characters
    window.open(`https://wa.me/${cleaned}`, '_blank');
  }

  recalculatePoints(client: Client): void {
    if (!client.leadEvaluation) {
      client.leadEvaluation = {
        salud: null as any,
        edad25_50: null as any,
        enParejaCasado: null as any,
        duenoCasa: null as any,
        hijos: null as any,
        trabaja: null as any,
        puntos: null as any,
        observacion: '',
        usState: 'NJ',
        isQualified: false
      };
    }
    const evalData = client.leadEvaluation;
    const hasValues = 
      evalData.salud !== null && evalData.salud !== undefined ||
      evalData.edad25_50 !== null && evalData.edad25_50 !== undefined ||
      evalData.enParejaCasado !== null && evalData.enParejaCasado !== undefined ||
      evalData.duenoCasa !== null && evalData.duenoCasa !== undefined ||
      evalData.hijos !== null && evalData.hijos !== undefined ||
      evalData.trabaja !== null && evalData.trabaja !== undefined;

    if (hasValues) {
      evalData.puntos = 
        Number(evalData.salud || 0) + 
        Number(evalData.edad25_50 || 0) + 
        Number(evalData.enParejaCasado || 0) + 
        Number(evalData.duenoCasa || 0) + 
        Number(evalData.hijos || 0) + 
        Number(evalData.trabaja || 0);
    } else {
      evalData.puntos = null as any;
    }
  }

  addExistingClientToEvaluation(): void {
    if (!this.selectedClientIdForEvaluation) return;
    const client = this.availableClients.find(c => (c._id || c.id) === this.selectedClientIdForEvaluation);
    if (client) {
      if (!client.leadEvaluation) {
        client.leadEvaluation = {
          salud: null as any,
          edad25_50: null as any,
          enParejaCasado: null as any,
          duenoCasa: null as any,
          hijos: null as any,
          trabaja: null as any,
          puntos: null as any,
          observacion: '',
          usState: 'NJ',
          isQualified: false
        };
      }
      client.isUnsaved = true;
      this.evaluatedClients.unshift(client);
      this.availableClients = this.availableClients.filter(c => (c._id || c.id) !== this.selectedClientIdForEvaluation);
      this.selectedClientIdForEvaluation = '';
      this.clientSearchText = '';
      this.filterDropdown();
      this.toastService.success(`Se agregó a ${client.firstName} ${client.lastName} a la lista para calificar.`);
    }
    this.cdr.detectChanges();
  }

  saveClientEvaluation(client: Client): void {
    const id = client._id || client.id;
    if (!id) return;

    this.isSavingEvaluation = true;
    this.clientService.updateClientEvaluation(id, client.leadEvaluation).subscribe({
      next: (res) => {
        this.isSavingEvaluation = false;
        if (res.success) {
          client.isUnsaved = false;
          this.toastService.success(`Calificación guardada para ${client.firstName} ${client.lastName}.`);
          this.loadProspects();
          this.loadUnresolvedClients();
        }
      },
      error: (err) => {
        this.isSavingEvaluation = false;
        this.toastService.error('Error al guardar la calificación.');
      }
    });
  }

  addNewRow(): void {
    this.showNewRow = true;
    this.newRowErrors = {
      firstName: '',
      lastName: '',
      phone: '',
      email: ''
    };
    this.newRowData = {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      salud: null as any,
      edad25_50: null as any,
      enParejaCasado: null as any,
      duenoCasa: null as any,
      hijos: null as any,
      trabaja: null as any,
      puntos: null as any,
      observacion: '',
      usState: 'NJ'
    };
  }

  cancelNewRow(): void {
    this.showNewRow = false;
  }

  recalculateNewRowPoints(): void {
    const hasValues = 
      this.newRowData.salud !== null && this.newRowData.salud !== undefined ||
      this.newRowData.edad25_50 !== null && this.newRowData.edad25_50 !== undefined ||
      this.newRowData.enParejaCasado !== null && this.newRowData.enParejaCasado !== undefined ||
      this.newRowData.duenoCasa !== null && this.newRowData.duenoCasa !== undefined ||
      this.newRowData.hijos !== null && this.newRowData.hijos !== undefined ||
      this.newRowData.trabaja !== null && this.newRowData.trabaja !== undefined;

    if (hasValues) {
      this.newRowData.puntos = 
        Number(this.newRowData.salud || 0) + 
        Number(this.newRowData.edad25_50 || 0) + 
        Number(this.newRowData.enParejaCasado || 0) + 
        Number(this.newRowData.duenoCasa || 0) + 
        Number(this.newRowData.hijos || 0) + 
        Number(this.newRowData.trabaja || 0);
    } else {
      this.newRowData.puntos = null as any;
    }
  }

  validateFirstName(): boolean {
    if (!this.newRowData.firstName || !this.newRowData.firstName.trim()) {
      this.newRowErrors.firstName = 'El nombre es obligatorio';
      return false;
    }
    this.newRowErrors.firstName = '';
    return true;
  }

  validateLastName(): boolean {
    if (!this.newRowData.lastName || !this.newRowData.lastName.trim()) {
      this.newRowErrors.lastName = 'El apellido es obligatorio';
      return false;
    }
    this.newRowErrors.lastName = '';
    return true;
  }

  validatePhone(): boolean {
    const error = this.validatePhoneString(this.newRowData.phone);
    this.newRowErrors.phone = error || '';
    return !error;
  }

  validateEmail(): boolean {
    const error = this.validateEmailString(this.newRowData.email);
    this.newRowErrors.email = error || '';
    return !error;
  }

  private validatePhoneString(phone: string): string | null {
    if (!phone || !phone.trim()) {
      return 'El celular es obligatorio.';
    }

    const trimmed = phone.trim();
    const basicPhoneRegex = /^\+?[0-9\s\-()]+$/;
    if (!basicPhoneRegex.test(trimmed)) {
      return 'No se permiten letras ni caracteres inválidos.';
    }

    const cleaned = trimmed.replace(/[^\d+]/g, '');
    const digitsOnly = cleaned.replace(/^\+/, '');

    if (/^(\d)\1+$/.test(digitsOnly)) {
      return 'El número no parece real (dígitos repetidos).';
    }
    const seqAsc = '01234567890123456789';
    const seqDesc = '98765432109876543210';
    if (seqAsc.includes(digitsOnly) || seqDesc.includes(digitsOnly)) {
      return 'El número no parece real (dígitos consecutivos).';
    }

    const isUSACandidate = cleaned.startsWith('+1') || 
      (digitsOnly.length === 10 && !cleaned.startsWith('+') && !cleaned.startsWith('0') && !cleaned.startsWith('593'));
    
    const isEcuadorCandidate = cleaned.startsWith('+593') || 
      cleaned.startsWith('593') || 
      (digitsOnly.length === 10 && digitsOnly.startsWith('09')) || 
      (digitsOnly.length === 9 && digitsOnly.startsWith('0'));

    if (isUSACandidate) {
      if (cleaned.startsWith('+1')) {
        if (digitsOnly.length !== 11 || !digitsOnly.startsWith('1')) {
          return 'El teléfono de USA debe tener 10 dígitos (más prefijo +1).';
        }
      } else {
        if (digitsOnly.length !== 10) {
          return 'El teléfono de USA debe tener 10 dígitos.';
        }
      }
      return null;
    }

    if (isEcuadorCandidate) {
      let localDigits = digitsOnly;
      if (cleaned.startsWith('+593')) {
        localDigits = digitsOnly.slice(3);
      } else if (cleaned.startsWith('593') && digitsOnly.length >= 11) {
        localDigits = digitsOnly.slice(3);
      }

      if (localDigits.startsWith('0')) {
        localDigits = localDigits.slice(1);
      }

      const isMobile = localDigits.startsWith('9') && localDigits.length === 9;
      const isLandline = /^[2-7]/.test(localDigits) && localDigits.length === 8;

      if (!isMobile && !isLandline) {
        return 'Ecuador: celular debe tener 9 dígitos (ej. 9XXXXXXXX) y convencional 8 dígitos.';
      }

      return null;
    }

    return 'Ingresa un número válido de USA (+1) o Ecuador (+593).';
  }

  private validateEmailString(email: string): string | null {
    if (!email || !email.trim()) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return 'Formato de correo inválido.';
    }
    return null;
  }

  saveNewProspect(): void {
    const isFirstNameValid = this.validateFirstName();
    const isLastNameValid = this.validateLastName();
    const isPhoneValid = this.validatePhone();
    const isEmailValid = this.validateEmail();

    if (!isFirstNameValid || !isLastNameValid || !isPhoneValid || !isEmailValid) {
      this.toastService.error('Por favor, corrija los campos marcados en rojo.');
      return;
    }

    this.isSavingEvaluation = true;
    const clientPayload: Partial<Client> = {
      firstName: this.newRowData.firstName.trim(),
      lastName: this.newRowData.lastName.trim(),
      phone: this.newRowData.phone.trim(),
      email: this.newRowData.email ? this.newRowData.email.trim() : undefined,
      clientStatus: 'prospect',
      source: 'website',
      leadEvaluation: {
        salud: this.newRowData.salud,
        edad25_50: this.newRowData.edad25_50,
        enParejaCasado: this.newRowData.enParejaCasado,
        duenoCasa: this.newRowData.duenoCasa,
        hijos: this.newRowData.hijos,
        trabaja: this.newRowData.trabaja,
        puntos: this.newRowData.puntos,
        observacion: this.newRowData.observacion ? this.newRowData.observacion.trim() : undefined,
        usState: this.newRowData.usState
      }
    };

    this.clientService.createClient(clientPayload).subscribe({
      next: (res) => {
        this.isSavingEvaluation = false;
        if (res.success) {
          this.toastService.success('Nuevo prospecto registrado y calificado correctamente.');
          this.showNewRow = false;
          this.currentPage = 1;
          this.loadProspects();
          this.loadUnresolvedClients();
        }
      },
      error: (err) => {
        this.isSavingEvaluation = false;
        const backendMessage = err.error?.message || 'Error al registrar el prospecto.';
        
        // If the backend indicates a duplicate phone or similar field error, map it to the form
        if (backendMessage.toLowerCase().includes('teléfono') || backendMessage.toLowerCase().includes('celular') || backendMessage.toLowerCase().includes('phone') || backendMessage.toLowerCase().includes('duplicado')) {
          this.newRowErrors.phone = backendMessage;
        } else if (backendMessage.toLowerCase().includes('correo') || backendMessage.toLowerCase().includes('email')) {
          this.newRowErrors.email = backendMessage;
        }
        
        this.toastService.error(backendMessage);
      }
    });
  }

  downloadExcel(): void {
    const params: any = { hasEvaluation: 'true', limit: 1000, sort: '-updatedAt' };
    if (this.filterCreator) {
      params.createdBy = this.filterCreator;
    }
    this.clientService.getClients(params).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const allClients = res.data;
          let rowsHtml = '';
          allClients.forEach(client => {
            const evalData = client.leadEvaluation || {
              salud: 0, edad25_50: 0, enParejaCasado: 0, duenoCasa: 0, hijos: 0, trabaja: 0, puntos: 0, observacion: '', usState: ''
            };
            const scoreClass = evalData.puntos >= 4 ? 'green-score' : 'red-score';
            rowsHtml += `
              <tr>
                <td style="border: 1px solid #000000; padding: 6px; text-align: left;">${client.firstName} ${client.lastName}</td>
                <td style="border: 1px solid #000000; padding: 6px; text-align: center; mso-number-format:'\\@';">${client.phone}</td>
                <td style="border: 1px solid #000000; padding: 6px; text-align: center;">${evalData.salud}</td>
                <td style="border: 1px solid #000000; padding: 6px; text-align: center;">${evalData.edad25_50}</td>
                <td style="border: 1px solid #000000; padding: 6px; text-align: center;">${evalData.enParejaCasado}</td>
                <td style="border: 1px solid #000000; padding: 6px; text-align: center;">${evalData.duenoCasa}</td>
                <td style="border: 1px solid #000000; padding: 6px; text-align: center;">${evalData.hijos}</td>
                <td style="border: 1px solid #000000; padding: 6px; text-align: center;">${evalData.trabaja}</td>
                <td class="${scoreClass}" style="border: 1px solid #000000; padding: 6px; text-align: center; font-weight: bold;">${evalData.puntos}</td>
                <td style="border: 1px solid #000000; padding: 6px; text-align: left;">${evalData.observacion || ''}</td>
                <td style="border: 1px solid #000000; padding: 6px; text-align: center;">${evalData.usState || ''}</td>
              </tr>
            `;
          });

          const fileContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
              <meta charset="utf-8">
              <!--[if gte mso 9]>
              <xml>
                <x:ExcelWorkbook>
                  <x:ExcelWorksheets>
                    <x:ExcelWorksheet>
                      <x:Name>Prospectos</x:Name>
                      <x:WorksheetOptions>
                        <x:DisplayGridlines/>
                      </x:WorksheetOptions>
                    </x:ExcelWorksheet>
                  </x:ExcelWorksheets>
                </x:ExcelWorkbook>
              </xml>
              <![endif]-->
              <style>
                table { border-collapse: collapse; }
                th { border: 1px solid #000000; padding: 8px; text-align: center; font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; background-color: #cbd5e1; }
                td { font-family: Arial, sans-serif; font-size: 10pt; }
                .title-header { font-size: 16pt; font-weight: bold; background-color: #1e293b; color: #ffffff; text-align: center; height: 50px; }
                .green-score { background-color: #c6efce; color: #006100; }
                .red-score { background-color: #ffc7ce; color: #9c0006; }
              </style>
            </head>
            <body>
              <table>
                <tr><th colspan="11" class="title-header">Plantilla de Prospectos</th></tr>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Celular</th>
                  <th>Salud</th>
                  <th>Edad 25-50</th>
                  <th>EnPareja/Casado</th>
                  <th>Dueño de Casa</th>
                  <th>Hijos</th>
                  <th>Trabaja</th>
                  <th>Puntos</th>
                  <th>Observacion</th>
                  <th>Estado</th>
                </tr>
                ${rowsHtml}
              </table>
            </body>
            </html>
          `;

          const blob = new Blob([fileContent], { type: 'application/vnd.ms-excel' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Plantilla_de_Prospectos_${new Date().toISOString().split('T')[0]}.xls`;
          link.click();
          window.URL.revokeObjectURL(url);
        }
      },
      error: (err) => {
        this.toastService.error('Error al exportar los datos a Excel.');
      }
    });
  }
}
