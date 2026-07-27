import { Injectable } from '@angular/core';
import { Client } from '../../models/client.model';
import { Service } from '../../models/service.model';
import { Property } from '../../models/property.model';
import { ActivityLog } from '../../models/activity.model';
import { MOCK_CLIENTS } from '../../mock-data/clients.mock';
import { MOCK_SERVICES } from '../../mock-data/services.mock';
import { MOCK_PROPERTIES } from '../../mock-data/properties.mock';
import { MOCK_ACTIVITIES } from '../../mock-data/activities.mock';

@Injectable({
  providedIn: 'root'
})
export class MockDbService {
  private readonly CLIENTS_KEY = 'ec_clients';
  private readonly SERVICES_KEY = 'ec_services';
  private readonly PROPERTIES_KEY = 'ec_properties';
  private readonly ACTIVITIES_KEY = 'ec_activities';

  constructor() {
    this.initDatabase();
  }

  private initDatabase(): void {
    if (!localStorage.getItem(this.CLIENTS_KEY)) {
      localStorage.setItem(this.CLIENTS_KEY, JSON.stringify(MOCK_CLIENTS));
    }
    if (!localStorage.getItem(this.SERVICES_KEY)) {
      localStorage.setItem(this.SERVICES_KEY, JSON.stringify(MOCK_SERVICES));
    }
    if (!localStorage.getItem(this.PROPERTIES_KEY)) {
      localStorage.setItem(this.PROPERTIES_KEY, JSON.stringify(MOCK_PROPERTIES));
    }
    if (!localStorage.getItem(this.ACTIVITIES_KEY)) {
      localStorage.setItem(this.ACTIVITIES_KEY, JSON.stringify(MOCK_ACTIVITIES));
    }
  }

  // Clients
  getClients(): Client[] {
    const data = localStorage.getItem(this.CLIENTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveClients(clients: Client[]): void {
    localStorage.setItem(this.CLIENTS_KEY, JSON.stringify(clients));
  }

  // Services
  getServices(): Service[] {
    const data = localStorage.getItem(this.SERVICES_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveServices(services: Service[]): void {
    localStorage.setItem(this.SERVICES_KEY, JSON.stringify(services));
  }

  // Properties
  getProperties(): Property[] {
    const data = localStorage.getItem(this.PROPERTIES_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveProperties(properties: Property[]): void {
    localStorage.setItem(this.PROPERTIES_KEY, JSON.stringify(properties));
  }

  // Activities
  getActivities(): ActivityLog[] {
    const data = localStorage.getItem(this.ACTIVITIES_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveActivities(activities: ActivityLog[]): void {
    localStorage.setItem(this.ACTIVITIES_KEY, JSON.stringify(activities));
  }

  addActivity(userName: string, action: string, type: 'client' | 'service' | 'property' | 'auth' | 'system'): void {
    const activities = this.getActivities();
    const newActivity: ActivityLog = {
      id: 'act_' + Math.random().toString(36).substr(2, 9),
      userId: 'usr_current',
      userName,
      action,
      timestamp: new Date().toISOString(),
      type
    };
    activities.unshift(newActivity); // Add to the beginning
    this.saveActivities(activities);
  }
}
