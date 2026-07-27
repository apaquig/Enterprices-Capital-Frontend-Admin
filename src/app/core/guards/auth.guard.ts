import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Support future roles validation if defined in routing configuration
    const expectedRoles = route.data?.['roles'] as Array<string>;
    if (expectedRoles && expectedRoles.length > 0) {
      const userRole = authService.getUserRole();
      if (!userRole || !expectedRoles.includes(userRole.toLowerCase())) {
        const redirectPath = userRole && userRole.toLowerCase() === 'manager' ? '/clients' : '/dashboard';
        router.navigate([redirectPath]);
        return false;
      }
    }
    return true;
  }

  // Redirect to login if not authenticated
  router.navigate(['/login']);
  return false;
};
