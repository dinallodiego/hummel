import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarritoService } from '../services/carrito';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-finalizar-compra',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finalizar-compra.html',
  styleUrls: ['./finalizar-compra.css'],
})
export class FinalizarCompraComponent {
  carrito: any[] = [];
  total = 0;

  mostrarCheckout = false;

  formData = {
    nombre: '',
    dni: '',
    telefono: '',
    correo: '',
    envio: '',
    direccion: '',
  };

  comprobante: File | null = null;

  constructor(
    private carritoService: CarritoService,
    private router: Router,
  ) {}

  ngOnInit() {
    document.body.style.overflow = 'auto';

    this.carrito = this.carritoService.getCarrito();
    this.total = this.carritoService.getTotal();

    // 🔥 BLOQUEO SI NO HAY PRODUCTOS
    if (this.carrito.length === 0) {
      Swal.fire('Carrito vacío', 'Agregá productos antes de continuar', 'warning');
      this.router.navigate(['/productos']);
    }
  }

  onEnvioChange() {
    if (this.formData.envio === 'local') {
      this.formData.direccion = '';
    }
  }

  // ✅ VALIDAR SOLO IMÁGENES
  onFileSelected(e: any) {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Error', 'Solo se permiten imágenes', 'error');
      e.target.value = '';
      return;
    }

    this.comprobante = file;
  }

  confirmarCompra() {
    // VALIDACIONES
    if (!this.formData.nombre.trim()) {
      Swal.fire('Falta el nombre', 'Ingresá tu nombre completo', 'error');
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(this.formData.nombre)) {
      Swal.fire('Nombre inválido', 'Solo letras y espacios', 'error');
      return;
    }

    if (!/^\d{8}$/.test(this.formData.dni)) {
      Swal.fire('DNI inválido', 'Debe tener 8 números', 'error');
      return;
    }

    if (!/^11\d{8}$/.test(this.formData.telefono)) {
      Swal.fire('Teléfono inválido', 'Debe ser formato: 11XXXXXXXX (sin 54 ni 9)', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.correo)) {
      Swal.fire('Email inválido', 'Ingresá un correo válido', 'error');
      return;
    }

    if (!this.formData.envio) {
      Swal.fire('Falta envío', 'Seleccioná tipo de entrega', 'error');
      return;
    }

    if (this.formData.envio === 'domicilio' && !this.formData.direccion.trim()) {
      Swal.fire('Falta dirección', 'Ingresá la dirección de entrega', 'error');
      return;
    }

    if (!this.comprobante) {
      Swal.fire('Falta comprobante', 'Subí el comprobante de pago', 'error');
      return;
    }

    // CONFIRMACIÓN ANTES DE COMPRAR
    Swal.fire({
      title: '¿Confirmar compra?',
      text: 'Verificá que todos los datos sean correctos',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Revisar',
    }).then((result) => {
      if (result.isConfirmed) {
        const formDataToSend = new FormData();
        formDataToSend.append('nombre', this.formData.nombre);
        formDataToSend.append('dni', this.formData.dni);
        formDataToSend.append('telefono', this.formData.telefono);
        formDataToSend.append('correo', this.formData.correo);
        formDataToSend.append('envio', this.formData.envio);
        formDataToSend.append('direccion', this.formData.direccion || '');
        formDataToSend.append('total', this.total.toString());
        formDataToSend.append('productos', JSON.stringify(this.carrito));
        if (this.comprobante) {
          formDataToSend.append('comprobante', this.comprobante);
        }

        fetch('http://localhost:3000/pedidos', {
          method: 'POST',
          body: formDataToSend,
        })
          .then(async (res) => {
            const data = await res.json();

            // 🔥 SI EL BACKEND FALLA → ENTRA ACÁ
            if (!res.ok) {
              console.error('ERROR BACKEND:', data);
              throw new Error(data.error || 'Error al crear pedido');
            }

            return data;
          })
          .then((data) => {
            Swal.fire({
              title: '✅ Compra confirmada',
              html: `
        <p>Tu pedido fue registrado correctamente.</p>
        <p><strong>ID de pedido: ${data.id_pedido}</strong></p>
        <p style="color:#d4af37; font-weight:600;">
          Serás redirigido a WhatsApp para notificar el pedido 📲
        </p>
      `,
              icon: 'success',
              confirmButtonText: 'Continuar',
              allowOutsideClick: false,
            }).then(() => {
              const link = this.generarLinkWhatsapp(data.id_pedido);

              window.open(link, '_blank');

              this.carritoService.limpiarCarrito();
              this.carrito = [];
              this.total = 0;

              this.router.navigate(['/productos']);
            });
          })
          .catch((err) => {
            console.error('ERROR FRONT:', err);

            Swal.fire('Error', err.message || 'No se pudo completar la compra', 'error');
          });
      }
    });
  }

  sumarCantidad(i: number) {
    this.carrito[i].cantidad++;
    this.actualizarTotal();
  }

  restarCantidad(i: number) {
    if (this.carrito[i].cantidad > 1) {
      this.carrito[i].cantidad--;
    }
    this.actualizarTotal();
  }

  eliminarProducto(i: number) {
    this.carrito.splice(i, 1);

    // 🔥 si elimina todo → lo saco del checkout
    if (this.carrito.length === 0) {
      Swal.fire('Carrito vacío', '', 'info');
      this.router.navigate(['/productos']);
    }

    this.actualizarTotal();
  }

  actualizarTotal() {
    this.total = this.carrito.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
  }

  cancelarCompra() {
    Swal.fire({
      title: '¿Cancelar compra?',
      text: 'Se eliminarán todos los productos del carrito',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
    }).then((result) => {
      if (result.isConfirmed) {
        this.carritoService.limpiarCarrito();
        this.carrito = [];
        this.total = 0;

        Swal.fire('Compra cancelada', '', 'success');
        this.router.navigate(['/productos']);
      }
    });
  }

  generarLinkWhatsapp(idPedido: string) {
    const telefono = '5491122474072';

    // 🛍️ DETALLE PRODUCTOS
    const detalleProductos = this.carrito
      .map((p) => {
        return `• ${p.nombre}
  Cantidad: ${p.cantidad}
  Talle: ${p.talle}
  Color: ${p.color}
  Subtotal: $${(p.precio * p.cantidad).toLocaleString()}`;
      })
      .join('\n\n');

    const direccionTexto =
      this.formData.envio === 'domicilio' ? this.formData.direccion : 'Retiro en local';

    const mensaje = `
    🛍️ *Nuevo pedido desde la web*

    Hola! ¿Cómo estás? 😊  
    Acabo de realizar un pedido a través del sitio web.

    🧾 *ID del pedido:* ${idPedido}

    ━━━━━━━━━━━━━━━━━━━

    👤 *Mis datos*
    • Nombre: ${this.formData.nombre}
    • DNI: ${this.formData.dni}
    • Teléfono: ${this.formData.telefono}
    • Email: ${this.formData.correo}

    ━━━━━━━━━━━━━━━━━━━

    🚚 *Entrega*
    • Tipo: ${this.formData.envio}
    • Dirección: ${direccionTexto}

    ━━━━━━━━━━━━━━━━━━━

    📦 *Mi pedido: *
    ${detalleProductos}

    ━━━━━━━━━━━━━━━━━━━

    💰 *TOTAL: $${this.total.toLocaleString()}*

    Quedo atento a la confirmación. Muchas gracias 🙌
    `;

    const mensajeEncoded = encodeURIComponent(mensaje);

    return `https://api.whatsapp.com/send?phone=${telefono}&text=${mensajeEncoded}`;
  }
}
