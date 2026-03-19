import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RouterOutlet, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

declare var bootstrap: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class AppComponent implements AfterViewInit {
  apiUrl = 'http://localhost:3000';

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}
  ngAfterViewInit() {
    const toggler = document.querySelector('.navbar-toggler') as HTMLElement;
    const menu = document.querySelector('#menu') as HTMLElement;
    const links = document.querySelectorAll('.nav-link');

    const bsCollapse = new bootstrap.Collapse(menu, {
      toggle: false,
    });

    toggler.addEventListener('click', () => {
      toggler.classList.toggle('active');

      if (menu.classList.contains('show')) {
        document.body.classList.remove('menu-open');
      } else {
        document.body.classList.add('menu-open');
      }
    });

    links.forEach((link) => {
      link.addEventListener('click', () => {
        if (menu.classList.contains('show')) {
          bsCollapse.hide();
          toggler.classList.remove('active');
          document.body.classList.remove('menu-open');
        }
      });
    });
  }

  mostrarLocales() {
    Swal.fire({
      title: 'Nuestros Locales',

      html: `
        <div style="text-align:left;font-size:16px">

          <p><b>📍 Palermo</b><br>
          Av. Santa Fe 3253</p>

          <p><b>📍 Recoleta</b><br>
          Av. Callao 1234</p>

          <p><b>📍 Caballito</b><br>
          Av. Rivadavia 5400</p>

        </div>
      `,

      icon: 'info',
      confirmButtonText: 'Cerrar',

      showClass: {
        popup: `
          animate__animated
          animate__fadeInUp
          animate__faster
        `,
      },

      hideClass: {
        popup: `
          animate__animated
          animate__fadeOutDown
          animate__faster
        `,
      },
    });
  }

  misCompras() {
    Swal.fire({
      title: 'Buscar pedido',
      input: 'text',
      inputLabel: 'Ingresa tu DNI o número de pedido',
      inputPlaceholder: 'Ej: 12345678 o HUM-ABCDEFGH',
      showCancelButton: true,
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const dato = result.value.trim();

        // 🔥 SOLO NAVEGAR
        this.router.navigate(['/mis-pedidos', dato]);
      }
    });
  }
}

/* ACTUALIZADO */
