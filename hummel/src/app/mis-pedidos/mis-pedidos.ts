import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor, CurrencyPipe, TitleCasePipe, NgClass } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PedidoService } from '../services/pedidos';
import { ChangeDetectorRef } from '@angular/core';

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

  cargarPedido(dato: string) {
    this.cargando = true;

    console.log('Buscando en backend:', dato);

    this.pedidoService.getPedidoPorCodigo(dato).subscribe({
      next: (resp: any) => {
        console.log('RESPUESTA BACKEND:', resp);

        // 🔥 NORMALIZACIÓN COMPLETA (TODOS LOS CASOS)
        if (resp?.pedidos && Array.isArray(resp.pedidos)) {
          // ✅ TU CASO ACTUAL
          this.pedidos = resp.encontrado ? resp.pedidos : [];
        } else if (Array.isArray(resp)) {
          // array directo
          this.pedidos = resp;
        } else if (resp?.pedido) {
          // formato viejo
          this.pedidos = resp.encontrado ? [resp.pedido] : [];
        } else if (resp?.id_pedido) {
          // objeto directo
          this.pedidos = [resp];
        } else {
          this.pedidos = [];
        }

        // 🔥 SETEO ACTUAL
        if (this.pedidos.length > 0) {
          this.paginaActual = 0;
          this.pedidoActual = this.pedidos[0];

          this.saludo = `¡Hola ${this.pedidoActual.nombre}! Bienvenido/a.`;
        } else {
          this.pedidoActual = null;
          this.saludo = 'No se encontraron pedidos.';
        }

        this.cargando = false;
        this.cd.detectChanges();
      },

      error: (err) => {
        console.error('ERROR BACKEND:', err);

        this.pedidos = [];
        this.pedidoActual = null;
        this.saludo = 'Error al cargar el pedido.';
        this.cargando = false;

        this.cd.detectChanges();
      },
    });
  }

  // 🔥 PAGINACIÓN
  siguiente() {
    if (this.paginaActual < this.pedidos.length - 1) {
      this.paginaActual++;
      this.pedidoActual = this.pedidos[this.paginaActual];
    }
  }

  anterior() {
    if (this.paginaActual > 0) {
      this.paginaActual--;
      this.pedidoActual = this.pedidos[this.paginaActual];
    }
  }

  hayMultiples(): boolean {
    return this.pedidos.length > 1;
  }
}
