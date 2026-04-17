import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgIf, NgFor, CurrencyPipe, TitleCasePipe, NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PedidoService } from '../services/pedidos';

@Component({
  selector: 'app-pedido-detalle',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, NgClass, CurrencyPipe, TitleCasePipe],
  templateUrl: './mis-pedidos.html',
  styleUrls: ['./mis-pedidos.css'],
})
export class PedidoDetalleComponent implements OnInit {
  pedidos: any[] = [];
  pedidoActual: any = null;
  paginaActual: number = 0;
  query: string = '';
  saludo: string = '';
  cargando: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private pedidoService: PedidoService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const dato = params.get('id');
      if (dato) {
        this.query = dato;
        this.pedidos = [];
        this.pedidoActual = null;
        this.cargando = true;
        this.cargarPedido(dato);
      } else {
        this.cargando = false;
        this.saludo = 'No se proporcionó ningún pedido';
      }
    });
  }

  async cargarPedido(dato: string) {
    this.cargando = true;

    try {
      const resp = await this.pedidoService.getPedidoPorCodigo(dato);

      if (resp?.pedidos && Array.isArray(resp.pedidos)) {
        this.pedidos = resp.encontrado ? resp.pedidos : [];
      } else {
        this.pedidos = [];
      }

      if (this.pedidos.length > 0) {
        this.paginaActual = 0;
        this.pedidoActual = this.pedidos[0];
        // Normalizamos productos para el template (pedido_productos → productos)
        if (!this.pedidoActual.productos && this.pedidoActual.pedido_productos) {
          this.pedidoActual.productos = this.pedidoActual.pedido_productos;
        }
        this.saludo = `¡Hola ${this.pedidoActual.nombre}! Bienvenido/a.`;
      } else {
        this.pedidoActual = null;
        this.saludo = 'No se encontraron pedidos.';
      }
    } catch (err) {
      console.error('Error al cargar pedido:', err);
      this.pedidos = [];
      this.pedidoActual = null;
      this.saludo = 'Error al cargar el pedido.';
    }

    this.cargando = false;
    this.cd.detectChanges();
  }

  siguiente() {
    if (this.paginaActual < this.pedidos.length - 1) {
      this.paginaActual++;
      this.pedidoActual = this.pedidos[this.paginaActual];
      if (!this.pedidoActual.productos && this.pedidoActual.pedido_productos) {
        this.pedidoActual.productos = this.pedidoActual.pedido_productos;
      }
    }
  }

  anterior() {
    if (this.paginaActual > 0) {
      this.paginaActual--;
      this.pedidoActual = this.pedidos[this.paginaActual];
      if (!this.pedidoActual.productos && this.pedidoActual.pedido_productos) {
        this.pedidoActual.productos = this.pedidoActual.pedido_productos;
      }
    }
  }

  hayMultiples(): boolean {
    return this.pedidos.length > 1;
  }
}
