import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../core/services/appointment.service';
import { ToastService } from '../../core/services/toast.service';
import { Appointment } from '../../models/appointment.model';

interface CalendarDay {
  date: Date;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css']
})
export class AppointmentsComponent implements OnInit {
  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  appointments: Appointment[] = [];
  isLoading = false;
  
  // Drawer States
  selectedAppointment: Appointment | null = null;
  showDrawer = false;
  isSaving = false;

  // Month names
  monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Week days
  weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  constructor(
    private appointmentService: AppointmentService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.isLoading = true;
    
    // Range: start of current month to end of current month
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // Buffer dates slightly to capture overlapping timezone queries
    const start = new Date(year, month, 1, 0, 0, 0, 0).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();

    this.appointmentService.getAppointments(start, end).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.appointments = res.data;
          this.generateCalendar();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.error('Error al cargar la agenda de citas.');
        this.generateCalendar();
        this.cdr.detectChanges();
      }
    });
  }

  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();

    // First day of current month (0: Sunday, 1: Monday, ...)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Total days in previous month
    const prevTotalDays = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    // 1. Previous month offset days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDay = prevTotalDays - i;
      const date = new Date(year, month - 1, prevDay);
      days.push({
        date,
        dayNum: prevDay,
        isCurrentMonth: false,
        isToday: false,
        appointments: this.getAppointmentsForDate(date)
      });
    }

    // 2. Current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(year, month, i);
      const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
      days.push({
        date,
        dayNum: i,
        isCurrentMonth: true,
        isToday,
        appointments: this.getAppointmentsForDate(date)
      });
    }

    // 3. Next month offset days to fill 42 cells grid (6 rows)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        dayNum: i,
        isCurrentMonth: false,
        isToday: false,
        appointments: this.getAppointmentsForDate(date)
      });
    }

    this.calendarDays = days;
  }

  getAppointmentsForDate(date: Date): Appointment[] {
    return this.appointments.filter(appt => {
      const apptDate = new Date(appt.dateTime);
      return apptDate.getUTCDate() === date.getDate() &&
             apptDate.getUTCMonth() === date.getMonth() &&
             apptDate.getUTCFullYear() === date.getFullYear();
    });
  }

  prevMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.loadAppointments();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.loadAppointments();
  }

  setToday(): void {
    this.currentDate = new Date();
    this.loadAppointments();
  }

  openAppointmentDetail(appt: Appointment): void {
    this.selectedAppointment = appt;
    this.showDrawer = true;
    this.cdr.detectChanges();
  }

  closeDrawer(): void {
    this.showDrawer = false;
    this.selectedAppointment = null;
    this.cdr.detectChanges();
  }

  updateAppointmentStatus(status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'): void {
    if (!this.selectedAppointment || !this.selectedAppointment._id) return;
    
    this.isSaving = true;
    this.appointmentService.updateAppointment(this.selectedAppointment._id, { status }).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.success) {
          this.toastService.success('Estado de la cita actualizado correctamente.');
          this.closeDrawer();
          this.loadAppointments(); // Reload list to update calendar UI
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.toastService.error('Error al actualizar el estado de la cita.');
      }
    });
  }

  formatTime(dateStr: string | Date): string {
    const d = new Date(dateStr);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed': return 'status-confirmed';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      case 'completed': return 'status-completed';
      case 'no_show': return 'status-noshow';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelada';
      case 'completed': return 'Completada';
      case 'no_show': return 'Ausente (No Show)';
      default: return status;
    }
  }
}
