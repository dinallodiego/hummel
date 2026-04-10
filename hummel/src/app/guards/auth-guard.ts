import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { CarritoService } from '../services/carrito';
import { catchError, map, of } from 'rxjs';
import Swal from 'sweetalert2';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isLogged().pipe(
    map((ok) => {
      if (!ok) router.navigate(['/login']);
      return ok;
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    }),
  );
};

export const carritoGuard: CanActivateFn = () => {
  const carritoService = inject(CarritoService);
  const router = inject(Router);

  if (carritoService.getCarrito().length === 0) {
    Swal.fire('Carrito vacío', 'No podés acceder', 'warning');
    router.navigate(['/productos']);
    return false;
  }

  return true;
};
