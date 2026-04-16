import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CarritoService } from '../services/carrito';
import Swal from 'sweetalert2';

declare var bootstrap: any;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  currentIndex = 0;
  private intervalId: any;

  paginaActualDestacados = 0;
  itemsPorPaginaDestacados = 3;

  productoSeleccionado: any = null;
  talleElegido = '';
  colorElegido = '';

  imagenIndex = 0;
  zoomActivo = false;
  verMas = false;
  todosLosTalles: any[] = [];
  todosLosColores: any[] = [];

  images = ['/assets/slider1.png', '/assets/slider2.png', '/assets/slider3.png'];
  destacados: any[] = [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private carritoService: CarritoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.startAutoPlay();

    this.http.get<any[]>('https://raxnktjhjyfvqajgffkf.supabase.co/talles').subscribe((t) => {
      this.todosLosTalles = t;

      this.http.get<any[]>('https://raxnktjhjyfvqajgffkf.supabase.co/colores').subscribe((c) => {
        this.todosLosColores = c;

        // 🔥 recién ahora cargamos destacados
        this.cargarDestacados();
      });
    });
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  startAutoPlay() {
    this.intervalId = setInterval(() => this.next(), 5000);
  }

  stopAutoPlay() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
  }

  setSlide(index: number) {
    this.currentIndex = index;
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  irCategoria(genero: string) {
    const generoNormalizado = genero === 'Niños' ? 'Niño' : genero;
    this.router.navigate(['/productos'], { queryParams: { genero: generoNormalizado } });
  }

  cargarDestacados() {
    this.http
      .get<any[]>('https://raxnktjhjyfvqajgffkf.supabase.co/productos-activos-destacados')
      .subscribe((productos) => {
        this.destacados = productos.map((p) => {
          const imagen = p.imagen || 'assets/no-image.png';
          const imagenes = Array.isArray(p.imagenes) && p.imagenes.length ? p.imagenes : [imagen];

          // 🔥 DESCUENTO
          const precioBase = Number(p.precio);
          const tieneDescuento = !!p.tiene_descuento;
          const valorDescuento = Number(p.descuento_valor || 0);
          const tipoDescuento = p.tipo_descuento || 'simple';
          const descuentoCantidad = Number(p.descuento_cantidad || 0);

          let precioFinal = precioBase;
          if (tieneDescuento) {
            precioFinal = precioBase - (precioBase * valorDescuento) / 100;
          }

          // 🔥 NORMALIZAR DISPONIBLES
          const tallesDisponibles = (p.talles || []).map((t: any) =>
            typeof t === 'string' ? t : t.nombre,
          );

          const coloresDisponibles = (p.colores || []).map((c: any) =>
            typeof c === 'string' ? c : c.nombre,
          );

          // 🔥 FILTRAR TALLES SEGÚN CATEGORÍA
          let tallesFiltrados: any[] = [];

          if (p.categoria?.toLowerCase() === 'accesorio') {
            tallesFiltrados = [];
          } else {
            const tipoTalle = p.categoria?.toLowerCase() === 'calzado' ? 'calzado' : 'indumentaria';

            tallesFiltrados = this.todosLosTalles
              .filter((t: any) => t.tipo === tipoTalle)
              .map((t: any) => ({
                nombre: t.nombre,
                disponible: tallesDisponibles.includes(t.nombre),
              }));
          }

          // 🔥 ARMAR TALLES CON DISPONIBLE
          const tallesCompletos = tallesFiltrados.map((t: any) => ({
            nombre: t.nombre,
            disponible: tallesDisponibles.includes(t.nombre),
          }));

          // 🔥 COLORES
          const coloresCompletos = this.todosLosColores.map((c: any) => ({
            nombre: c.nombre,
            disponible: coloresDisponibles.includes(c.nombre),
          }));

          return {
            ...p,
            imagen,
            imagenes,
            precio: precioBase,
            precio_final: precioFinal,

            tiene_descuento: tieneDescuento,
            descuento_valor: valorDescuento,
            tipo_descuento: tipoDescuento,
            descuento_cantidad: descuentoCantidad,

            // 🔥 CLAVE
            talles: tallesCompletos,
            colores: coloresCompletos,
          };
        });

        this.cdr.detectChanges();
      });
  }

  get destacadosPaginados() {
    const inicio = this.paginaActualDestacados * this.itemsPorPaginaDestacados;
    return this.destacados.slice(inicio, inicio + this.itemsPorPaginaDestacados);
  }

  nextDestacados() {
    const total = Math.ceil(this.destacados.length / this.itemsPorPaginaDestacados);
    this.paginaActualDestacados = (this.paginaActualDestacados + 1) % total;
  }

  prevDestacados() {
    const total = Math.ceil(this.destacados.length / this.itemsPorPaginaDestacados);
    this.paginaActualDestacados = (this.paginaActualDestacados - 1 + total) % total;
  }

  abrirDetalle(prod: any) {
    this.productoSeleccionado = prod;
    this.talleElegido = '';
    this.colorElegido = '';
    this.imagenIndex = 0;
    this.zoomActivo = false;
    this.verMas = false;

    this.cdr.detectChanges();

    setTimeout(() => {
      const el = document.getElementById('detailModal');
      if (!el) return;
      const modal = new bootstrap.Modal(el);
      modal.show();
    });
  }

  agregarAlCarrito() {
    const categoria = String(this.productoSeleccionado?.categoria || '')
      .trim()
      .toLowerCase();
    const esAccesorio = categoria === 'accesorio';

    if (!esAccesorio && !this.talleElegido) {
      Swal.fire({ title: 'Selecciona el talle', icon: 'warning', confirmButtonColor: '#000' });
      return;
    }

    if (!this.colorElegido) {
      Swal.fire({ title: 'Selecciona el color', icon: 'warning', confirmButtonColor: '#000' });
      return;
    }

    this.carritoService.agregarProducto({
      ...this.productoSeleccionado,
      talle: esAccesorio ? '' : this.talleElegido,
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

    const modalElement = document.getElementById('detailModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal?.hide();
    }
  }

  siguienteImagen() {
    const imgs = this.productoSeleccionado?.imagenes;
    if (!imgs) return;
    this.imagenIndex = (this.imagenIndex + 1) % imgs.length;
  }

  anteriorImagen() {
    const imgs = this.productoSeleccionado?.imagenes;
    if (!imgs) return;
    this.imagenIndex = (this.imagenIndex - 1 + imgs.length) % imgs.length;
  }

  seleccionarImagen(i: number) {
    this.imagenIndex = i;
  }

  toggleZoom() {
    this.zoomActivo = !this.zoomActivo;
  }
}
