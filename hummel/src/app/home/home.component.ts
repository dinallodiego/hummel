import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CarritoService } from '../services/carrito';
import Swal from 'sweetalert2';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

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
    private carritoService: CarritoService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.startAutoPlay();
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  async cargarDatos() {
    // Traemos talles, colores y productos destacados en paralelo
    const [tallesRes, coloresRes] = await Promise.all([
      supabase.from('talles').select('*').eq('disponible', true),
      supabase.from('colores').select('*').eq('disponible', true),
    ]);

    this.todosLosTalles = tallesRes.data || [];
    this.todosLosColores = coloresRes.data || [];

    await this.cargarDestacados();
  }

  async cargarDestacados() {
    // Traemos productos activos y destacados con sus relaciones
    const { data, error } = await supabase
      .from('productos')
      .select(
        `
        *,
        categorias(nombre),
        generos(nombre),
        producto_imagenes(url),
        producto_talles(talle_id, talles(nombre)),
        producto_colores(color_id, colores(nombre))
      `,
      )
      .eq('disponible', true)
      .eq('destacado', true);

    if (error) {
      console.error('Error cargando destacados:', error);
      return;
    }

    this.destacados = (data || []).map((p) => {
      const precioBase = Number(p.precio);
      const valorDescuento = Number(p.descuento_valor || 0);
      let precioFinal = precioBase;
      if (p.tiene_descuento) {
        precioFinal = precioBase - (precioBase * valorDescuento) / 100;
      }

      const categoriaNombre = (p.categorias?.nombre || '').toLowerCase();
      const tallesDisponibles = (p.producto_talles || [])
        .map((pt: any) => pt.talles?.nombre)
        .filter(Boolean);
      const coloresDisponibles = (p.producto_colores || [])
        .map((pc: any) => pc.colores?.nombre)
        .filter(Boolean);

      // Talles según categoría
      let tallesFiltrados: any[] = [];
      if (categoriaNombre !== 'accesorio') {
        const tipoTalle = categoriaNombre === 'calzado' ? 'calzado' : 'indumentaria';
        tallesFiltrados = this.todosLosTalles
          .filter((t: any) => t.tipo === tipoTalle)
          .map((t: any) => ({
            nombre: t.nombre,
            disponible: tallesDisponibles.includes(t.nombre),
          }));
      }

      const coloresCompletos = this.todosLosColores.map((c: any) => ({
        nombre: c.nombre,
        disponible: coloresDisponibles.includes(c.nombre),
      }));

      const imagenes = (p.producto_imagenes || []).map((i: any) => i.url);
      const imagen = imagenes[0] || 'assets/no-image.png';

      return {
        ...p,
        imagen,
        imagenes: imagenes.length ? imagenes : [imagen],
        precio: precioBase,
        precio_final: precioFinal,
        categoria: p.categorias?.nombre || '',
        genero: p.generos?.nombre || '',
        talles: tallesFiltrados,
        colores: coloresCompletos,
      };
    });

    this.cdr.detectChanges();
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

  get destacadosPaginados() {
    const inicio = this.paginaActualDestacados * this.itemsPorPaginaDestacados;
    return this.destacados.slice(inicio, inicio + this.itemsPorPaginaDestacados);
  }

  get totalPaginasDestacados() {
    return Math.ceil(this.destacados.length / this.itemsPorPaginaDestacados) || 1;
  }

  get paginasDestacadosArr() {
    return Array.from({ length: this.totalPaginasDestacados });
  }

  setDestacadosPagina(index: number) {
    this.paginaActualDestacados = index;
  }

  nextDestacados() {
    this.paginaActualDestacados = (this.paginaActualDestacados + 1) % this.totalPaginasDestacados;
  }

  prevDestacados() {
    this.paginaActualDestacados = (this.paginaActualDestacados - 1 + this.totalPaginasDestacados) % this.totalPaginasDestacados;
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
      Swal.fire({ title: 'Seleccioná el talle', icon: 'warning', confirmButtonColor: '#000' });
      return;
    }
    if (!this.colorElegido) {
      Swal.fire({ title: 'Seleccioná el color', icon: 'warning', confirmButtonColor: '#000' });
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
    if (modalElement) bootstrap.Modal.getInstance(modalElement)?.hide();
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
