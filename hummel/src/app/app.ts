import { Component, AfterViewInit, ChangeDetectorRef } from '@angular/core';
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
    private cdr: ChangeDetectorRef,
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

  ngOnInit() {
    this.verificarYMostrarBienvenida();
  }

  private verificarYMostrarBienvenida() {
    // sessionStorage persiste mientras la pestaña esté abierta.
    // Al cerrar el sitio y volver a entrar, se reinicia.
    const haVistoBienvenida = sessionStorage.getItem('bienvenida_visto');

    if (!haVistoBienvenida) {
      this.ejecutarModalBienvenida();
      sessionStorage.setItem('bienvenida_visto', 'true');
    }
  }
  private ejecutarModalBienvenida() {
    this.reproducirSonidoBienvenida();

    Swal.fire({
      ...this.swalBase,
      title: `
      <div style="display:flex; flex-direction:column; align-items:center; gap:8px; padding-top: 10px;">
        <span style="font-size: 13px; font-weight: 600; color: #aaa; letter-spacing: 5px; text-transform: uppercase;">Bienvenido a</span>
        <div style="display:flex; align-items:center; gap:15px;">
           <span style="font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 32px; color: #20c997; letter-spacing: -1px;">ROXBEL</span>
           <div style="width: 2px; height: 30px; background: #eee;"></div>
           <img src="../assets/iconos/logo.png" width="55px" style="filter: grayscale(1); opacity: 0.8;">
        </div>
      </div>
    `,
      html: `
      <div style="padding: 10px 0; text-align: center;">
        
        <div class="distribuidor-badge">
          <i class="bi bi-patch-check-fill"></i> DISTRIBUIDOR OFICIAL HUMMEL®
        </div>

        <div style="margin: 25px 0;">
          <h2 style="font-size: 24px; font-weight: 900; color: #111; margin-bottom: 12px; line-height: 1.1; text-transform: uppercase;">
            EQUIPAMIENTO <br> <span style="color: #20c997;">ALTO RENDIMIENTO</span>
          </h2>
          <p style="font-size: 16px; color: #555; line-height: 1.6; max-width: 300px; margin: 0 auto; font-weight: 500;">
            La indumentaria oficial de Handball que estabas buscando. Calidad profesional en cada prenda.
          </p>
        </div>

        <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 5px; color: #20c997;">
           <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
              <i class="bi bi-lightning-charge" style="font-size: 22px;"></i>
              <span style="font-size: 9px; font-weight: 800; color: #aaa; text-transform:uppercase;">Velocidad</span>
           </div>
           <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
              <i class="bi bi-shield-shaded" style="font-size: 22px;"></i>
              <span style="font-size: 9px; font-weight: 800; color: #aaa; text-transform:uppercase;">Resistencia</span>
           </div>
           <div style="display:flex; flex-direction:column; align-items:center; gap:5px;">
              <i class="bi bi-trophy" style="font-size: 22px;"></i>
              <span style="font-size: 9px; font-weight: 800; color: #aaa; text-transform:uppercase;">Victoria</span>
           </div>
        </div>
      </div>`,
      confirmButtonText: 'Cerrar',
    });
  }

  private reproducirSonidoBienvenida() {
    const audio = new Audio('../assets/sonidos/welcome.mp3');
    audio.volume = 0.4;

    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        // Auto-play fue preventido.
        // Podemos intentar sonar cuando el usuario haga su primer click en la pantalla
        console.log('Esperando interacción para sonido...');
        document.addEventListener(
          'click',
          () => {
            audio.play();
          },
          { once: true },
        ); // 'once' hace que se ejecute una sola vez
      });
    }
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
    document.body.classList.toggle('menu-open', this.menuAbierto);
  }

  cerrarMenu() {
    this.menuAbierto = false;
    document.body.classList.remove('menu-open');
  }

  async cambiarCantidad(uuid: string, operacion: 'sumar' | 'restar') {
    const carrito = this.carritoService.getCarrito();
    const item = carrito.find((i) => i.uuid === uuid);
    if (!item) return;

    // Si es restar y está en 1, eso implicaría eliminar
    if (operacion === 'restar' && Number(item.cantidad) === 1) {
      await this.confirmarQuitarItem(item);
      return;
    }

    this.carritoService.cambiarCantidad(uuid, operacion);
  }

  async eliminarDelCarrito(uuid: string) {
    const carrito = this.carritoService.getCarrito();
    const item = carrito.find((i) => i.uuid === uuid);
    if (!item) return;

    await this.confirmarQuitarItem(item);
  }

  /**
   * Confirma quitar un item. Si es el último, confirma vaciar carrito.
   */
  private async confirmarQuitarItem(item: any) {
    const carrito = this.carritoService.getCarrito();
    const esUltimo = carrito.length === 1;

    const result = await Swal.fire({
      title: esUltimo ? '¿Vaciar carrito?' : '¿Quitar producto?',
      html: esUltimo
        ? `
        <div style="text-align:left">
          <div style="font-weight:800; margin-bottom:6px;">Vas a vaciar el carrito por completo.</div>
          <div style="color:#555; font-size:14px;">
            Se eliminará: <b>${item.nombre}</b>
          </div>
        </div>
      `
        : `
        <div style="text-align:left">
          <div style="font-weight:800; margin-bottom:6px;">¿Seguro querés quitar este producto?</div>
          <div style="color:#555; font-size:14px;">
            Se eliminará: <b>${item.nombre}</b>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: esUltimo ? 'Sí, vaciar' : 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#000',
      cancelButtonColor: '#e9ecef',
    });

    if (!result.isConfirmed) return;

    if (esUltimo) {
      this.carritoService.limpiarCarrito();
    } else {
      this.carritoService.eliminarProducto(item.uuid);
    }

    this.cdr.detectChanges();

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: esUltimo ? 'Carrito vaciado' : 'Producto eliminado',
      showConfirmButton: false,
      timer: 1400,
    });
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
      width: '420px',
      padding: '1.5rem',
      title: `
      <div style="display:flex; align-items:center; justify-content:center; gap:15px; padding-top: 5px;">
        <div style="background: #20c997; width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 5px 15px rgba(32,201,151,0.3);">
          <i class="bi bi-geo-alt-fill" style="font-size: 22px; color: #000;"></i>
        </div>
        <h2 style="font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 20px; color: #111; text-transform: uppercase; letter-spacing: 1px; margin: 0;">Encontranos</h2>
      </div>
    `,
      html: `
      <div style="display:flex; flex-direction:column; gap:12px; margin-top: 15px; overflow: hidden;">
        
        <div style="background: #f8f9fa; border: 2px solid #20c997; border-radius: 15px; padding: 12px; text-align: center;">
          <p style="font-size: 15px; color: #000; font-weight: 900; margin-bottom: 2px; text-transform: uppercase;">Ramos Mejía</p>
          <p style="font-size: 13px; color: #444; margin: 0; font-weight: 600;">
            Belgrano 69, Local 26 <br> 
            <span style="color: #20c997; font-weight: 800; font-size: 11px;">GALERÍA GRAN RIVADAVIA</span>
          </p>
        </div>

        <div style="background: #111; border-radius: 15px; padding: 15px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #20c997; font-size: 11px; font-weight: 800; text-transform: uppercase;">Mar a Vie</span>
            <span style="color: #fff; font-size: 12px; font-weight: 700;">10:30 - 19:30 hs</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #333;">
            <span style="color: #20c997; font-size: 11px; font-weight: 800; text-transform: uppercase;">Sábados</span>
            <span style="color: #fff; font-size: 12px; font-weight: 700;">10:30 - 15:00 hs</span>
          </div>
        </div>

        <a href="https://maps.app.goo.gl/tkifYi3orEt9gP7f7" target="_blank" 
           style="text-decoration:none; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: 12px; background: #20c997; color: #000; font-size: 13px; font-weight: 900; text-transform: uppercase; transition: 0.3s; border: 2px solid #20c997;">
          <i class="bi bi-cursor-fill"></i> Ver Ubicación
        </a>

        <div style="font-size: 15px; color: #ff4d4d; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
           Lunes y feriados cerrado
        </div>
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
