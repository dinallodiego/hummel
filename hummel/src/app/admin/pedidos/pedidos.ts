import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.css'],
})
export class PedidosComponent implements OnInit {
  apiUrl = 'http://localhost:3000';

  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];

  estados = ['pendiente', 'aceptado', 'rechazado'];
  estadoSeleccionado = 'pendiente';

  paginaActual = 1;
  itemsPorPagina = 5;
  totalPaginas = 1;

  @Output() cambios = new EventEmitter<void>(); // Para avisar al AdminComponent

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargarPedidos();
  }

  cargarPedidos() {
    this.http.get<any[]>(`${this.apiUrl}/pedidos/${this.estadoSeleccionado}`).subscribe({
      next: (data) => {
        this.pedidos = data.sort((a, b) => b.id - a.id);
        this.pedidosFiltrados = [...this.pedidos];
        this.paginaActual = 1;
        this.totalPaginas = Math.ceil(this.pedidosFiltrados.length / this.itemsPorPagina);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error cargando pedidos:', err),
    });
  }

  filtrarPorEstado(estado: string) {
    this.estadoSeleccionado = estado;
    this.cargarPedidos();
  }

  pedidosPaginados(): any[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.pedidosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  cambiarPagina(delta: number) {
    const nueva = this.paginaActual + delta;
    if (nueva >= 1 && nueva <= this.totalPaginas) this.paginaActual = nueva;
  }

  aceptarPedido(pedido: any) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Vas a aceptar el pedido de ${pedido.nombre}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aceptar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.http.put(`${this.apiUrl}/pedidos/${pedido.id}/aceptar`, {}).subscribe({
        next: () => {
          Swal.fire('Pedido aceptado', '', 'success');
          this.cargarPedidos();
          this.cambios.emit();
        },
        error: (err) => console.error(err),
      });
    });
  }

  rechazarPedido(pedido: any) {
    Swal.fire({
      title: 'Motivo de rechazo',
      input: 'text',
      inputPlaceholder: 'Ingrese el motivo',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
    }).then((inputResult) => {
      if (!inputResult.isConfirmed || !inputResult.value) return;

      Swal.fire({
        title: '¿Estás seguro?',
        text: `Vas a rechazar el pedido de ${pedido.nombre}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, rechazar',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (!result.isConfirmed) return;

        this.http
          .put(`${this.apiUrl}/pedidos/${pedido.id}/rechazar`, { mensaje: inputResult.value })
          .subscribe({
            next: () => {
              Swal.fire('Pedido rechazado', '', 'success');
              this.cargarPedidos();
              this.cambios.emit();
            },
            error: (err) => console.error(err),
          });
      });
    });
  }
}
