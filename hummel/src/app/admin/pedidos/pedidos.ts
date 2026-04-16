import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.css'],
})
export class PedidosComponent implements OnInit {
  apiUrl = 'https://raxnktjhjyfvqajgffkf.supabase.co/rest/v1';

  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];

  busqueda: string = '';

  estados = ['pendiente', 'aceptado', 'rechazado'];
  estadoSeleccionado = 'pendiente';

  paginaActual = 1;
  itemsPorPagina = 3;
  totalPaginas = 1;

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

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargarPedidos();
  }

  /* =========================
     🔥 CARGAR PEDIDOS
  ========================= */
  cargarPedidos() {
    this.http.get<any[]>(`${this.apiUrl}/pedidos/estado/${this.estadoSeleccionado}`).subscribe({
      next: (data) => {
        this.pedidos = data || [];
        this.pedidosFiltrados = [...this.pedidos];
        this.aplicarFiltro();
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los pedidos', 'error');
      },
    });
  }

  /* =========================
     🔥 FILTRO POR ESTADO
  ========================= */
  filtrarPorEstado(estado: string) {
    this.estadoSeleccionado = estado;
    this.busqueda = '';
    this.cargarPedidos();
  }

  /* =========================
     🔥 BUSCADOR EN VIVO
  ========================= */
  aplicarFiltro() {
    if (!this.busqueda.trim()) {
      this.pedidosFiltrados = [...this.pedidos];
    } else {
      const q = this.busqueda.toLowerCase();

      this.pedidosFiltrados = this.pedidos.filter(
        (p) => p.dni.includes(q) || p.id_pedido.toLowerCase().includes(q),
      );
    }

    this.paginaActual = 1;
    this.totalPaginas = Math.ceil(this.pedidosFiltrados.length / this.itemsPorPagina);

    this.cdr.detectChanges();
  }

  onBuscarChange() {
    this.aplicarFiltro();
  }

  /* =========================
     🔥 PAGINACIÓN
  ========================= */
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

  /* =========================
     🔥 ACEPTAR PEDIDO
  ========================= */
  aceptarPedido(pedido: any) {
    Swal.fire({
      title: '¿Aceptar pedido?',
      text: pedido.nombre,
      icon: 'question',
      showCancelButton: true,
    }).then((res) => {
      if (!res.isConfirmed) return;

      this.http.put(`${this.apiUrl}/pedidos/${pedido.id}/aceptar`, {}).subscribe({
        next: () => {
          this.pedidos = this.pedidos.filter((p) => p.id !== pedido.id);
          this.aplicarFiltro();
          pedido.estado = 'aceptado'; // 👈 update local inmediato
          const link = this.generarLinkWhatsappAceptado(pedido);

          Swal.fire({
            ...this.swalBase,
            icon: 'success',
            title: 'Pedido aceptado',
            html: `
              <p>El pedido fue aprobado correctamente.</p>
              <p>Ahora podés informar al cliente por WhatsApp.</p>
            `,
            confirmButtonText: 'Notificar cliente',
            allowOutsideClick: false,
          }).then(() => {
            setTimeout(() => {
              window.open(link, '_blank');
            }, 300);
          });

          this.cambios.emit();
        },
      });
    });
  }

  /* =========================
     🔥 RECHAZAR PEDIDO
  ========================= */
  rechazarPedido(pedido: any) {
    Swal.fire({
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
    }).then((inputResult) => {
      if (!inputResult.isConfirmed) return;

      const motivo = inputResult.value.trim();

      this.http
        .put(`${this.apiUrl}/pedidos/${pedido.id}/rechazar`, {
          mensaje: motivo,
        })
        .subscribe({
          next: () => {
            this.pedidos = this.pedidos.filter((p) => p.id !== pedido.id);
            this.aplicarFiltro();
            pedido.estado = 'rechazado';
            pedido.mensaje = motivo;

            const link = this.generarLinkWhatsappRechazado(pedido);

            Swal.fire({
              ...this.swalBase,
              icon: 'success',
              title: 'Pedido rechazado',
              html: `
              <p>El pedido fue rechazado correctamente.</p>
              <p>Ahora podés informar al cliente por WhatsApp.</p>
            `,
              confirmButtonText: 'Notificar cliente',
              allowOutsideClick: false,
            }).then(() => {
              setTimeout(() => {
                window.open(link, '_blank');
              }, 300);
            });

            this.cambios.emit();
          },
        });
    });
  }

  /* =========================
     🔥 DESCARGAR COMPROBANTE
  ========================= */
  descargarComprobante(path: string) {
    const url = path;

    const a = document.createElement('a');
    a.href = url;
    a.download = path.split('/').pop() || 'comprobante';
    a.target = '_blank';
    a.click();
  }

  marcarEntregado(pedido: any) {
    Swal.fire({
      title: '¿Marcar como entregado?',
      text: pedido.nombre,
      icon: 'question',
      showCancelButton: true,
    }).then((res) => {
      if (!res.isConfirmed) return;

      this.http.put(`${this.apiUrl}/pedidos/${pedido.id}/entregado`, {}).subscribe({
        next: () => {
          // 🔥 lo sacás de la lista actual (como aceptar)

          // 🔥 update local
          pedido.entregado = true;
          this.cdr.detectChanges();

          Swal.fire({
            ...this.swalBase,
            icon: 'success',
            title: 'Pedido entregado',
            text: 'El pedido fue marcado como completado',
            timer: 1500,
            showConfirmButton: false,
          });

          this.cambios.emit();
        },
      });
    });
  }

  marcarNoEntregado(pedido: any) {
    this.http.put(`${this.apiUrl}/pedidos/${pedido.id_pedido}/entregado`, {}).subscribe({
      next: () => {
        pedido.entregado = true;

        Swal.fire({
          ...this.swalBase,
          icon: 'info',
          title: 'Marcado como no entregado',
          timer: 1200,
          showConfirmButton: false,
        });

        this.cambios.emit();
      },
    });
  }

  generarLinkWhatsappAceptado(pedido: any) {
    const telefono = '549' + pedido.telefono; // 🔥 usamos el teléfono del cliente

    const detalleProductos = pedido.pedido_productos
      .map((p: any) => {
        return `• ${p.nombre}
  Cantidad: ${p.cantidad}
  Talle: ${p.talle || '-'}
  Color: ${p.color || '-'}
  Subtotal: $${p.precio * p.cantidad}`;
      })
      .join('\n\n');

    const esDomicilio = pedido.envio?.toLowerCase() === 'domicilio';

    const mensaje = `
    Hola ${pedido.nombre}, ¿cómo estás? 😊

    Queríamos confirmarte que tu pedido *${pedido.id_pedido}* fue *APROBADO correctamente* ✅

    🛍️ *Detalle del pedido:*
    ${detalleProductos}

    💰 *Total abonado:* $${pedido.total}

    🚚 *Entrega:*
    ${
      esDomicilio
        ? `Tu pedido será enviado a la dirección indicada y puede demorar hasta *72 horas*.`
        : `Podés retirar tu pedido en el local dentro de los próximos *10 días*.`
    }

    📩 Ante cualquier duda, podés responder este mensaje.

    ¡Muchas gracias por tu compra. Te esperamos pronto! 🙌
    `;

    return `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
  }

  generarLinkWhatsappRechazado(pedido: any) {
    const telefono = '549' + pedido.telefono;

    const detalleProductos = pedido.pedido_productos
      .map((p: any) => {
        return `• ${p.nombre}
  Cantidad: ${p.cantidad}
  Talle: ${p.talle || '-'}
  Color: ${p.color || '-'}
  Subtotal: $${p.precio * p.cantidad}`;
      })
      .join('\n\n');

    const mensaje = `
    Hola ${pedido.nombre}, ¿cómo estás?

    Lamentablemente tu pedido *${pedido.id_pedido}* fue *RECHAZADO* ❌

    📌 *Motivo:*
    ${pedido.mensaje || 'Sin especificar'}

    🛍️ *Detalle del pedido:*
    ${detalleProductos}

    💰 *Total:* $${pedido.total}

    👉 Si crees que es un error, podés responder este mensaje para ayudarte a solucionarlo o generar un nuevo pedido.

    Gracias por tu comprensión 🙏
    `;

    return `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
  }
}
