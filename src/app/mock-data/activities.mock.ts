import { ActivityLog } from '../models/activity.model';

export const MOCK_ACTIVITIES: ActivityLog[] = [
  {
    id: 'act_1',
    userId: 'usr_1',
    userName: 'María Delgado',
    action: 'Creó el cliente Carlos Mendoza',
    timestamp: '2026-03-05T10:12:00Z',
    type: 'client'
  },
  {
    id: 'act_2',
    userId: 'usr_2',
    userName: 'Alejandro Ruiz',
    action: 'Actualizó el estado de la propiedad Townhouse en Bergen Line a "Reservada"',
    timestamp: '2026-03-12T10:00:00Z',
    type: 'property'
  },
  {
    id: 'act_3',
    userId: 'usr_3',
    userName: 'Sandra Gómez',
    action: 'Registró una nueva propiedad: Apartamento Vista al Parque',
    timestamp: '2026-03-11T15:45:00Z',
    type: 'property'
  },
  {
    id: 'act_4',
    userId: 'usr_1',
    userName: 'María Delgado',
    action: 'Asignó el servicio "Preparación de Impuestos" al cliente Carlos Mendoza',
    timestamp: '2026-03-05T11:20:00Z',
    type: 'client'
  },
  {
    id: 'act_5',
    userId: 'usr_2',
    userName: 'Alejandro Ruiz',
    action: 'Modificó la tarifa del servicio "Notaría Pública"',
    timestamp: '2026-03-09T09:30:00Z',
    type: 'service'
  },
  {
    id: 'act_6',
    userId: 'usr_admin',
    userName: 'Admin Principal',
    action: 'Inició sesión en el panel administrativo',
    timestamp: '2026-06-17T19:40:00Z',
    type: 'auth'
  },
  {
    id: 'act_7',
    userId: 'usr_2',
    userName: 'Alejandro Ruiz',
    action: 'Creó una cotización de "Proyectos Inmobiliarios" para Ricardo Palacios',
    timestamp: '2026-03-08T09:15:00Z',
    type: 'client'
  }
];
