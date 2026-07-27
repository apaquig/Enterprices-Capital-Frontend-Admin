import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="auth-layout-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .auth-layout-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--color-primary);
      background-image: radial-gradient(circle at 50% 50%, #16223F 0%, #050914 100%);
      padding: 20px;
    }
  `]
})
export class AuthLayoutComponent {}
