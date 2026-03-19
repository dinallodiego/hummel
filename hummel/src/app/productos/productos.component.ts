import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { ProductosService } from '../services/productos';
import { CarritoService } from '../services/carrito';
import { ActivatedRoute, Router } from '@angular/router';

declare var bootstrap: any;

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css'],
})
export class ProductosComponent implements OnInit {
  catalogoCompleto: any[] = [];

  filtroGenero: string = 'Todos';
  ordenActual: string = 'Relevancia';

  paginaActual = 1;
  itemsPorPagina = 9;

  productoSeleccionado: any = null;

  talleElegido: string = '';
  colorElegido: string = '';

  imagenIndex = 0;
  zoomActivo = false;

  constructor(
    private router: Router,
    private productosService: ProductosService,
    private cdr: ChangeDetectorRef,
    public carritoService: CarritoService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params: { genero?: string }) => {
      if (params['genero']) {
        this.filtroGenero = params['genero'];
      }
    });

    this.cargarProductos();
  }

  cargarProductos() {
    this.productosService.getProductosActivos().subscribe((productos: any[]) => {
      const nuevosProductos = productos.map((p: any) => {
        let imagenPrincipal = 'assets/no-image.png';

        if (p.imagen) {
          imagenPrincipal = 'http://localhost:3000' + p.imagen;
        }

        let imagenesArray: string[] = [];

        if (Array.isArray(p.imagenes) && p.imagenes.length > 0) {
          imagenesArray = p.imagenes.map((img: string) => {
            return img.startsWith('http') ? img : 'http://localhost:3000' + img;
          });
        } else {
          imagenesArray = [imagenPrincipal];
        }

        return {
          id: p.id,
          nombre: p.nombre,
          genero: p.genero,
          descripcion: p.descripcion,
          precio: Number(p.precio),
          imagen: imagenPrincipal,
          imagenes: imagenesArray,
          talles: Array.isArray(p.talles) ? p.talles : [],
          colores: Array.isArray(p.colores) ? p.colores : [],
        };
      });

      this.catalogoCompleto = nuevosProductos;

      this.catalogoCompleto = nuevosProductos;
      this.paginaActual = 1;

      this.cdr.detectChanges();
    });
  }

  get productosFiltrados() {
    let resultado = [...this.catalogoCompleto];

    if (this.filtroGenero !== 'Todos') {
      resultado = resultado.filter(
        (p) => p.genero?.toLowerCase() === this.filtroGenero.toLowerCase(),
      );
    }

    if (this.ordenActual === 'Menor Precio') resultado.sort((a, b) => a.precio - b.precio);
    if (this.ordenActual === 'Mayor Precio') resultado.sort((a, b) => b.precio - a.precio);

    return resultado;
  }

  get productosPaginados() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.productosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas() {
    return Math.ceil(this.productosFiltrados.length / this.itemsPorPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  setFiltro(genero: string) {
    this.filtroGenero = genero;
    this.paginaActual = 1;
  }

  cambiarPagina(p: number) {
    this.paginaActual = p;

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  abrirDetalle(item: any) {
    this.productoSeleccionado = item;

    this.talleElegido = '';
    this.colorElegido = '';

    this.imagenIndex = 0;
    this.zoomActivo = false;

    setTimeout(() => {
      const modalElement = document.getElementById('detailModal');

      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    });
  }

  siguienteImagen() {
    if (!this.productoSeleccionado?.imagenes) return;

    this.imagenIndex++;

    if (this.imagenIndex >= this.productoSeleccionado.imagenes.length) {
      this.imagenIndex = 0;
    }
  }

  anteriorImagen() {
    if (!this.productoSeleccionado?.imagenes) return;

    this.imagenIndex--;

    if (this.imagenIndex < 0) {
      this.imagenIndex = this.productoSeleccionado.imagenes.length - 1;
    }
  }

  seleccionarImagen(i: number) {
    this.imagenIndex = i;
  }

  toggleZoom() {
    this.zoomActivo = !this.zoomActivo;
  }

  agregarAlCarrito() {
    if (!this.talleElegido) {
      Swal.fire({
        title: 'Selecciona el talle',
        icon: 'warning',
        confirmButtonColor: '#000',
      });
      return;
    }

    if (!this.colorElegido) {
      Swal.fire({
        title: 'Selecciona el color',
        icon: 'warning',
        confirmButtonColor: '#000',
      });
      return;
    }

    // 👇 SOLO CAMBIAMOS ESTO
    this.carritoService.agregarProducto({
      ...this.productoSeleccionado,
      talle: this.talleElegido,
      color: this.colorElegido,
      cantidad: 1,
    });

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Producto añadido',
      showConfirmButton: false,
      timer: 1500,
    });
  }

  cambiarCantidad(uuid: string, operacion: 'sumar' | 'restar') {
    this.carritoService.cambiarCantidad(uuid, operacion);
  }

  eliminarDelCarrito(uuid: string) {
    this.carritoService.eliminarProducto(uuid);
  }

  get subtotal() {
    return this.carritoService.getTotal();
  }

  finalizarCompra() {
    if (this.carritoService.getCarrito().length === 0) {
      Swal.fire({
        title: 'Carrito vacío',
        text: 'Agrega productos antes de finalizar',
        icon: 'warning',
        confirmButtonColor: '#000',
      });
      return;
    }

    this.router.navigate(['/finalizar-compra']);
  }
}
