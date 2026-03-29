import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { CarritoService } from '../app/services/carrito';

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
  menuAbierto = false;
  swalBase = {
    customClass: {
      popup: 'swal-popup',
      title: 'swal-title',
      confirmButton: 'swal-confirm',
      cancelButton: 'swal-cancel',
      input: 'swal-input',
    },
    buttonsStyling: false,
    width: '100%',
    padding: '1.2rem',
    backdrop: 'rgba(0,0,0,0.5)',
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    public carritoService: CarritoService,
  ) {}

  ngAfterViewInit() {
    document.addEventListener('click', (e: any) => {
      const menu = document.getElementById('menu');
      const toggler = document.querySelector('.navbar-toggler');
      if (this.menuAbierto && !menu?.contains(e.target) && !toggler?.contains(e.target)) {
        this.cerrarMenu();
      }

      if (
        menu?.classList.contains('show') &&
        !menu.contains(e.target) &&
        !toggler?.contains(e.target)
      ) {
        this.toggleMenu();
      }
    });
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
    document.body.classList.toggle('menu-open', this.menuAbierto);
  }

  cerrarMenu() {
    this.menuAbierto = false;
    document.body.classList.remove('menu-open');
  }

  cambiarCantidad(uuid: string, operacion: 'sumar' | 'restar') {
    this.carritoService.cambiarCantidad(uuid, operacion);
  }

  eliminarDelCarrito(uuid: string) {
    this.carritoService.eliminarProducto(uuid);
  }

  finalizarCompra() {
    if (this.carritoService.getCarrito().length === 0) {
      Swal.fire({
        title: 'Carrito vacío',
        text: 'Agrega productos antes de finalizar',
        icon: 'warning',
        confirmButtonColor: '#000',
      });
      return;
    }

    const cartElement = document.getElementById('cartSide');
    if (cartElement) {
      const bsOffcanvas =
        bootstrap.Offcanvas.getInstance(cartElement) || new bootstrap.Offcanvas(cartElement);
      bsOffcanvas.hide();
    }

    this.router.navigate(['/finalizar-compra']);
  }

  mostrarLocales() {
    Swal.fire({
      ...this.swalBase,
      title: 'Nuestros Locales',
      html: `
      <div style="display:flex; flex-direction:column; gap:12px">
        <div style="border:1px solid #eee; border-radius:12px; padding:14px; background:#fafafa;">
          <div style="font-weight:600; font-size:15px; margin-bottom:4px;">📍 Ramos Mejía</div>
          <div style="font-size:13px; color:#555; line-height:1.5;">
            Belgrano 69<br>Local 26<br>Galería Gran Rivadavia<br>
            <strong>Horarios:</strong><br><br> 
            <strong>Martes a Viernes</strong> de 10:30 hs a 19:30 hs <br> <br> 
            <strong>Sabados</strong> de 10:30 hs a 15 hs <br><br> 
            <strong>Lunes y feriados cerrado</strong>
          </div>
        </div>
        <a href="https://www.google.com/maps/search/?api=1&query=Belgrano+69+Ramos+Mejia" target="_blank" style="text-decoration:none; text-align:center; padding:10px; border-radius:999px; background:#111; color:white; font-size:14px;">
          Ver en Google Maps
        </a>
      </div>`,
      confirmButtonText: 'Cerrar',
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
        this.router.navigate(['/mis-pedidos', dato]);
      }
    });
  }

  mostrarPoliticasDeCompra() {
    Swal.fire({
      ...this.swalBase,
      title: '¿Como comprar en nuestro sitio?',
      html: `
      <div style="display:flex; flex-direction:column; gap:12px">
        <div style="border:1px solid #eee; border-radius:12px; padding:14px; background:#fafafa;">
          <div style="font-size:13px; color:#555; line-height:1.5;">
            1. Explora nuestro catálogo y elige tus productos favoritos.<br>
            2. Agrega los productos a tu carrito de compras.<br>
            3. Continua en finalizar compra donde mediante una transferencia inmediata pagas tu pedido.<br>
            4. Completas nuestro formulario con algunos datos. <strong>Aqui deberas sumar el comprobante de la transferencia para validarlo.</strong>.<br><br>
            5. Confirma el pago y tu pedido pasara a estar pendiente de compra.<br>
            6. Podras acceder a tus compras mediante tu DNI o numero de pedido que se te proporcionará para ver el estado de tu compra.<br>
            7. Una vez validada la transferencia, preparamos tu pedido para su envío o retiro en local.<br>
            8. Recibe tu pedido en la comodidad de tu hogar o retíralo en nuestro local.<br><br>
            Si tienes alguna pregunta, no dudes en contactarnos. ¡Gracias por elegirnos para tus compras!
          </div>
        </div>
      </div>`,
      confirmButtonText: 'Cerrar',
    });
  }
}
