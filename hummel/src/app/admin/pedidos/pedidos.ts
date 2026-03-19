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
  apiUrl = 'http://localhost:3000';

  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];

  busqueda: string = '';

  estados = ['pendiente', 'aceptado', 'rechazado'];
  estadoSeleccionado = 'pendiente';

  paginaActual = 1;
  itemsPorPagina = 5;
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
    this.http.get<any[]>(`${this.apiUrl}/pedidos/${this.estadoSeleccionado}`).subscribe({
      next: (data) => {
        this.pedidos = data.sort((a, b) => b.id - a.id);
        this.aplicarFiltro();
      },
      error: () => {
        Swal.fire({
          ...this.swalBase,
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los pedidos',
        });
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
      ...this.swalBase,
      title: '¿Aceptar pedido?',
      text: `Cliente: ${pedido.nombre}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.http.put(`${this.apiUrl}/pedidos/${pedido.id}/aceptar`, {}).subscribe({
        next: () => {
          Swal.fire({
            ...this.swalBase,
            icon: 'success',
            title: 'Pedido aceptado',
            text: 'Se actualizó correctamente',
            timer: 1500,
            showConfirmButton: false,
          });

          this.cargarPedidos();
          this.cambios.emit();
        },
        error: () => {
          Swal.fire({
            ...this.swalBase,
            icon: 'error',
            title: 'Error',
            text: 'No se pudo aceptar el pedido',
          });
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
      cancelButtonText: 'Cancelar',

      inputValidator: (value) => {
        if (!value) return 'El motivo es obligatorio';
        if (value.trim().length < 5) return 'Mínimo 5 caracteres';
        return null;
      },
    }).then((inputResult) => {
      if (!inputResult.isConfirmed) return;

      const motivo = inputResult.value.trim();

      Swal.fire({
        ...this.swalBase,
        title: '¿Confirmar rechazo?',
        text: `Cliente: ${pedido.nombre}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Rechazar',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (!result.isConfirmed) return;

        this.http
          .put(`${this.apiUrl}/pedidos/${pedido.id}/rechazar`, { mensaje: motivo })
          .subscribe({
            next: () => {
              Swal.fire({
                ...this.swalBase,
                icon: 'success',
                title: 'Pedido rechazado',
                text: 'Se guardó el motivo correctamente',
                timer: 1500,
                showConfirmButton: false,
              });

              this.cargarPedidos();
              this.cambios.emit();
            },
            error: () => {
              Swal.fire({
                ...this.swalBase,
                icon: 'error',
                title: 'Error',
                text: 'No se pudo rechazar el pedido',
              });
            },
          });
      });
    });
  }

  /* =========================
     🔥 DESCARGAR COMPROBANTE
  ========================= */
  descargarComprobante(path: string) {
    const url = this.apiUrl + path;

    this.http.get(url, { responseType: 'blob' }).subscribe((blob) => {
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = path.split('/').pop() || 'comprobante';
      a.click();

      window.URL.revokeObjectURL(blobUrl);
    });
  }
}
