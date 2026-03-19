import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor, CurrencyPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PedidoService } from '../services/pedidos';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-pedido-detalle',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, NgClass, CurrencyPipe, TitleCasePipe],
  templateUrl: './mis-pedidos.html',
  styleUrls: ['./mis-pedidos.css'],
})
export class PedidoDetalleComponent implements OnInit {
  pedido: any = null;
  query: string = '';
  saludo: string = '';
  cargando: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private pedidoService: PedidoService,
  ) {}

  ngOnInit(): void {
    const dato = this.route.snapshot.paramMap.get('id'); // id_pedido o DNI
    if (dato) {
      this.query = dato;
      this.cargarPedido(dato);
    } else {
      this.cargando = false;
      this.saludo = 'No se proporcionó ningún pedido';
    }
  }

  cargarPedido(dato: string) {
    this.pedidoService.getPedidoPorCodigo(dato).subscribe(
      (pedido) => {
        this.pedido = pedido;
        this.saludo = pedido
          ? `¡Hola ${pedido.nombre}! Bienvenido/a.`
          : 'No se encontró ningún pedido.';
        this.cargando = false;
      },
      (err) => {
        console.error(err);
        this.pedido = null;
        this.saludo = 'Error al cargar el pedido.';
        this.cargando = false;
      },
    );
  }
}
