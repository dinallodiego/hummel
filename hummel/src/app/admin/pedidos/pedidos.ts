import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.css'],
})
export class PedidosComponent implements OnInit {
  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];
  busqueda: string = '';
  estados = ['pendiente', 'aceptado', 'rechazado'];
  estadoSeleccionado = 'pendiente';
  paginaActual = 1;
  itemsPorPagina = 3;
  totalPaginas = 1;

  procesando = false; // CAMBIO: bloquea botones mientras se procesa
  @Output() cambios = new EventEmitter<void>();

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
  };

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.cargarPedidos();
  }

  async cargarPedidos() {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`*, pedido_productos(*)`)
      .eq('estado', this.estadoSeleccionado)
      .order('fecha', { ascending: false });

    if (error) {
      Swal.fire('Error', 'No se pudieron cargar los pedidos', 'error');
      return;
    }

    this.pedidos = data || [];
    this.pedidosFiltrados = [...this.pedidos];
    this.aplicarFiltro();
  }

  filtrarPorEstado(estado: string) {
    this.estadoSeleccionado = estado;
    this.busqueda = '';
    this.cargarPedidos();
  }

  aplicarFiltro() {
    if (!this.busqueda.trim()) {
      this.pedidosFiltrados = [...this.pedidos];
    } else {
      const q = this.busqueda.toLowerCase();
      this.pedidosFiltrados = this.pedidos.filter(
        (p) => p.dni?.includes(q) || p.id_pedido?.toLowerCase().includes(q),
      );
    }

    this.paginaActual = 1;
    this.totalPaginas = Math.ceil(this.pedidosFiltrados.length / this.itemsPorPagina) || 1;
    this.cdr.detectChanges();
  }

  onBuscarChange() {
    this.aplicarFiltro();
  }

  pedidosPaginados(): any[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.pedidosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  cambiarPagina(delta: number) {
    const nueva = this.paginaActual + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas) {
      this.paginaActual = nueva;
    }
  }

  async aceptarPedido(pedido: any) {
    const res = await Swal.fire({
      title: '¿Aceptar pedido?',
      text: pedido.nombre,
      icon: 'question',
      showCancelButton: true,
    });

    if (!res.isConfirmed) return;

    // CAMBIO: activar indicador de carga
    this.procesando = true;
    this.cdr.detectChanges();

    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'aceptado' })
      .eq('id', pedido.id);

    if (error) {
      Swal.fire('Error', 'No se pudo actualizar el pedido', 'error');
      return;
    }

    this.pedidos = this.pedidos.filter((p) => p.id !== pedido.id);
    this.aplicarFiltro();
    pedido.estado = 'aceptado';

    const link = this.generarLinkWhatsappAceptado(pedido);

    await Swal.fire({
      ...this.swalBase,
      icon: 'success',
      title: 'Pedido aceptado',
      html: `<p>El pedido fue aprobado correctamente.</p><p>Ahora podés informar al cliente por WhatsApp.</p>`,
      confirmButtonText: 'Notificar cliente',
      allowOutsideClick: false,
    });

    setTimeout(() => window.open(link, '_blank'), 300);
    this.procesando = false;
    this.cambios.emit();
  }

  async rechazarPedido(pedido: any) {
    const inputResult = await Swal.fire({
      ...this.swalBase,
      title: 'Motivo de rechazo',
      input: 'text',
      inputPlaceholder: 'Ej: comprobante inválido...',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      inputValidator: (value) => {
        if (!value) return 'El motivo es obligatorio';
        if (value.trim().length < 5) return 'Mínimo 5 caracteres';
        return null;
      },
    });

    if (!inputResult.isConfirmed) return;

    const motivo = inputResult.value.trim();

    // CAMBIO: activar indicador de carga
    this.procesando = true;
    this.cdr.detectChanges();

    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'rechazado', mensaje: motivo })
      .eq('id', pedido.id);

    if (error) {
      Swal.fire('Error', 'No se pudo rechazar el pedido', 'error');
      return;
    }

    this.pedidos = this.pedidos.filter((p) => p.id !== pedido.id);
    this.aplicarFiltro();
    pedido.estado = 'rechazado';
    pedido.mensaje = motivo;

    const link = this.generarLinkWhatsappRechazado(pedido);

    await Swal.fire({
      ...this.swalBase,
      icon: 'success',
      title: 'Pedido rechazado',
      html: `<p>El pedido fue rechazado correctamente.</p><p>Ahora podés informar al cliente por WhatsApp.</p>`,
      confirmButtonText: 'Notificar cliente',
      allowOutsideClick: false,
    });

    setTimeout(() => window.open(link, '_blank'), 300);
    this.procesando = false;
    this.cambios.emit();
  }

  async marcarEntregado(pedido: any) {
    const res = await Swal.fire({
      title: '¿Marcar como entregado?',
      text: pedido.nombre,
      icon: 'question',
      showCancelButton: true,
    });

    if (!res.isConfirmed) return;

    // CAMBIO: activar indicador de carga
    this.procesando = true;
    this.cdr.detectChanges();

    const { error } = await supabase
      .from('pedidos')
      .update({ entregado: true })
      .eq('id', pedido.id);

    if (error) {
      Swal.fire('Error', 'No se pudo actualizar', 'error');
      return;
    }

    pedido.entregado = true;
    this.procesando = false;
    this.cdr.detectChanges();

    Swal.fire({
      ...this.swalBase,
      icon: 'success',
      title: 'Pedido entregado',
      timer: 1500,
      showConfirmButton: false,
    });

    this.cambios.emit();
  }

  descargarComprobante(path: string) {
    if (!path) return;
    const a = document.createElement('a');
    a.href = path;
    a.download = path.split('/').pop() || 'comprobante';
    a.target = '_blank';
    a.click();
  }

  generarLinkWhatsappAceptado(pedido: any) {
    const telefono = '549' + pedido.telefono;
    const productos = pedido.pedido_productos || [];

    const detalleProductos = productos
      .map(
        (p: any) =>
          `• ${p.nombre}\n  Cantidad: ${p.cantidad}\n  Talle: ${p.talle || '-'}\n  Color: ${p.color || '-'}\n  Subtotal: $${p.precio * p.cantidad}`,
      )
      .join('\n\n');

    const esDomicilio = pedido.envio?.toLowerCase() === 'domicilio';

    const mensaje = `Hola ${pedido.nombre}, ¿cómo estás? 😊\n\nQueríamos confirmarte que tu pedido *${pedido.id_pedido}* fue *APROBADO correctamente* ✅\n\n🛍️ *Detalle del pedido:*\n${detalleProductos}\n\n💰 *Total abonado:* $${pedido.total}\n\n🚚 *Entrega:*\n${esDomicilio ? 'Tu pedido será enviado a la dirección indicada y puede demorar hasta *72 horas*.' : 'Podés retirar tu pedido en el local dentro de los próximos *10 días*.'}\n\n📩 Ante cualquier duda, podés responder este mensaje.\n\n¡Muchas gracias por tu compra. Te esperamos pronto! 🙌`;

    return `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
  }

  generarLinkWhatsappRechazado(pedido: any) {
    const telefono = '549' + pedido.telefono;
    const productos = pedido.pedido_productos || [];

    const detalleProductos = productos
      .map(
        (p: any) =>
          `• ${p.nombre}\n  Cantidad: ${p.cantidad}\n  Talle: ${p.talle || '-'}\n  Color: ${p.color || '-'}\n  Subtotal: $${p.precio * p.cantidad}`,
      )
      .join('\n\n');

    const mensaje = `Hola ${pedido.nombre}, ¿cómo estás?\n\nLamentablemente tu pedido *${pedido.id_pedido}* fue *RECHAZADO* ❌\n\n📌 *Motivo:*\n${pedido.mensaje || 'Sin especificar'}\n\n🛍️ *Detalle del pedido:*\n${detalleProductos}\n\n💰 *Total:* $${pedido.total}\n\n👉 Si crees que es un error, podés responder este mensaje.\n\nGracias por tu comprensión 🙏`;

    return `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
  }
}
