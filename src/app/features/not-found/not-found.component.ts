import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.css']
})
export class NotFoundComponent {
  constructor(
    public authService: AuthService,
    private location: Location
  ) {}

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get homeRoute(): string {
    if (!this.isAuthenticated) {
      return '/login';
    }
    return this.isAdmin ? '/dashboard' : '/customers';
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    }
  }
}
