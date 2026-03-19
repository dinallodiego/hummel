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

    if (!/^\d{8,15}$/.test(this.formData.telefono)) {
      Swal.fire('Teléfono inválido', 'Solo números (8 a 15 dígitos)', 'error');
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
        formDataToSend.append('total', this.total.toString());
        formDataToSend.append('productos', JSON.stringify(this.carrito));
        if (this.comprobante) {
          formDataToSend.append('comprobante', this.comprobante);
        }

        fetch('http://localhost:3000/pedidos', {
          method: 'POST',
          body: formDataToSend,
        })
          .then((res) => res.json())
          .then((data) => {
            // Mostramos el ID de pedido con alerta importante
            Swal.fire({
              title: '✅ Compra confirmada',
              html: `
              <p>Tu pedido fue registrado correctamente.</p>
              <p><strong>ID de pedido: ${data.id_pedido}</strong></p>
              <p>Es <strong>muy importante que lo guardes</strong> para cualquier consulta o seguimiento.</p>
            `,
              icon: 'success',
              confirmButtonText: 'Lo guardé',
              allowOutsideClick: false,
              allowEscapeKey: false,
            }).then(() => {
              this.carritoService.limpiarCarrito();
              this.carrito = [];
              this.total = 0;
              this.router.navigate(['/productos']);
            });
          })
          .catch((err) => {
            console.error(err);
            Swal.fire('Error', 'No se pudo completar la compra', 'error');
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
}
