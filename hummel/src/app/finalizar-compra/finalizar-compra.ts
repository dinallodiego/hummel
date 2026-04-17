import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarritoService } from '../services/carrito';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

@Component({
  selector: 'app-finalizar-compra',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finalizar-compra.html',
  styleUrls: ['./finalizar-compra.css'],
})
export class FinalizarCompraComponent implements OnInit {
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

    if (this.carrito.length === 0) {
      Swal.fire('Carrito vacío', 'Agregá productos antes de continuar', 'warning');
      this.router.navigate(['/productos']);
    }
  }

  onEnvioChange() {
    if (this.formData.envio === 'local') this.formData.direccion = '';
  }

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

  async confirmarCompra() {
    // Validaciones
    if (!this.formData.nombre.trim()) {
      Swal.fire('Falta el nombre', 'Ingresá tu nombre completo', 'error');
      return;
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(this.formData.nombre)) {
      Swal.fire('Nombre inválido', 'Solo letras y espacios', 'error');
      return;
    }
    if (!/^\d{8}$/.test(this.formData.dni)) {
      Swal.fire('DNI inválido', 'Debe tener 8 números', 'error');
      return;
    }
    if (!/^11\d{8}$/.test(this.formData.telefono)) {
      Swal.fire('Teléfono inválido', 'Debe ser formato: 11XXXXXXXX', 'error');
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

    const result = await Swal.fire({
      title: '¿Confirmar compra?',
      text: 'Verificá que todos los datos sean correctos',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Revisar',
    });

    if (!result.isConfirmed) return;

    try {
      // 1. Subir comprobante al Storage
      const ext = this.comprobante.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, this.comprobante, { contentType: this.comprobante.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(fileName);
      const comprobanteUrl = urlData.publicUrl;

      // 2. Generar ID de pedido único
      const idPedido = this.generarIdPedido();

      // 3. Insertar pedido
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          id_pedido: idPedido,
          nombre: this.formData.nombre,
          dni: this.formData.dni,
          telefono: this.formData.telefono,
          correo: this.formData.correo,
          envio: this.formData.envio,
          direccion: this.formData.direccion || null,
          total: this.total,
          estado: 'pendiente',
          entregado: false,
          comprobante: comprobanteUrl,
        })
        .select('id, id_pedido')
        .single();

      if (pedidoError) throw pedidoError;

      // 4. Insertar productos del pedido
      const productosParaInsertar = this.carrito.map((p) => ({
        pedido_id: pedidoData.id,
        producto_id: p.id || null,
        nombre: p.nombre,
        precio: p.precio,
        cantidad: p.cantidad,
        talle: p.talle || null,
        color: p.color || null,
      }));

      const { error: prodError } = await supabase
        .from('pedido_productos')
        .insert(productosParaInsertar);
      if (prodError) throw prodError;

      // 5. Éxito
      await Swal.fire({
        title: '✅ Compra confirmada',
        html: `
          <p>Tu pedido fue registrado correctamente.</p>
          <p><strong>ID de pedido: ${pedidoData.id_pedido}</strong></p>
          <p style="color:#d4af37; font-weight:600;">
            Serás redirigido a WhatsApp para notificar el pedido 📲
          </p>
        `,
        icon: 'success',
        confirmButtonText: 'Continuar',
        allowOutsideClick: false,
      });

      const link = this.generarLinkWhatsapp(pedidoData.id_pedido);
      window.open(link, '_blank');

      this.carritoService.limpiarCarrito();
      this.carrito = [];
      this.total = 0;
      this.router.navigate(['/productos']);
    } catch (err: any) {
      console.error('Error al confirmar compra:', err);
      Swal.fire('Error', err.message || 'No se pudo completar la compra', 'error');
    }
  }

  generarIdPedido(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'HUM-';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  }

  sumarCantidad(i: number) {
    this.carrito[i].cantidad++;
    this.actualizarTotal();
  }

  restarCantidad(i: number) {
    if (this.carrito[i].cantidad > 1) this.carrito[i].cantidad--;
    this.actualizarTotal();
  }

  eliminarProducto(i: number) {
    this.carrito.splice(i, 1);
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

    const detalleProductos = this.carrito
      .map(
        (p) =>
          `• ${p.nombre}\n  Cantidad: ${p.cantidad}\n  Talle: ${p.talle || '-'}\n  Color: ${p.color || '-'}\n  Subtotal: $${(p.precio * p.cantidad).toLocaleString()}`,
      )
      .join('\n\n');

    const direccionTexto =
      this.formData.envio === 'domicilio' ? this.formData.direccion : 'Retiro en local';

    const mensaje = `🛍️ *Nuevo pedido desde la web*\n\nHola! ¿Cómo estás? 😊\nAcabo de realizar un pedido a través del sitio web.\n\n🧾 *ID del pedido:* ${idPedido}\n\n━━━━━━━━━━━━━━━━━━━\n\n👤 *Mis datos*\n• Nombre: ${this.formData.nombre}\n• DNI: ${this.formData.dni}\n• Teléfono: ${this.formData.telefono}\n• Email: ${this.formData.correo}\n\n━━━━━━━━━━━━━━━━━━━\n\n🚚 *Entrega*\n• Tipo: ${this.formData.envio}\n• Dirección: ${direccionTexto}\n\n━━━━━━━━━━━━━━━━━━━\n\n📦 *Mi pedido:*\n${detalleProductos}\n\n━━━━━━━━━━━━━━━━━━━\n\n💰 *TOTAL: $${this.total.toLocaleString()}*\n\nQuedo atento a la confirmación. Muchas gracias 🙌`;

    return `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
  }
}
