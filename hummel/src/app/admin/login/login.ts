import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  imports: [CommonModule, FormsModule],
  styleUrl: './login.css',
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  login() {
    if (!this.email || !this.password) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Ingresá email y contraseña' });
      return;
    }

    this.loading = true;

    this.auth.login(this.email, this.password).subscribe({
      next: (ok) => {
        this.loading = false;

        if (ok) {
          Swal.fire({
            icon: 'success',
            title: 'Bienvenido al panel',
            text: 'Acceso concedido',
            showConfirmButton: false,
            timer: 1200,
          }).then(() => {
            this.router.navigate(['/admin']);
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Acceso denegado',
            text: 'Email o contraseña incorrectos',
          });
        }
      },
      error: () => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo iniciar sesión. Revisá el servidor.',
        });
      },
    });
  }
}
