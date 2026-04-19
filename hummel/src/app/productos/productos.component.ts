import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CarritoService } from '../services/carrito';
import Swal from 'sweetalert2';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

declare var bootstrap: any;

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css'],
})
export class ProductosComponent implements OnInit {
  catalogoCompleto: any[] = [];
  todosLosTalles: any[] = [];
  todosLosColores: any[] = [];

  filtroGenero: string = 'Todos';
  filtroPrenda: string = 'Todos';
  filtroCategoria: string = 'Todos';
  precioMin: number = 0;
  precioMax: number = 200000;
  precioMaxGlobal: number = 200000;
  ordenActual: string = 'Relevancia';
  soloDestacados: boolean = false;

  paginaActual: number = 1;
  itemsPorPagina: number = 9;
  productoSeleccionado: any = null;
  talleElegido: string = '';
  colorElegido: string = '';
  imagenIndex: number = 0;
  zoomActivo: boolean = false;
  // CAMBIO: agregado verMas para descripcion en modal
  verMas: boolean = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private carritoService: CarritoService,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['genero']) this.filtroGenero = params['genero'];
    });
    this.cargarDatos();
  }

  async cargarDatos() {
    const [tallesRes, coloresRes] = await Promise.all([
      supabase.from('talles').select('*').eq('disponible', true),
      supabase.from('colores').select('*').eq('disponible', true),
    ]);

    this.todosLosTalles = tallesRes.data || [];
    this.todosLosColores = coloresRes.data || [];

    await this.cargarProductos();
  }

  async cargarProductos() {
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
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error cargando productos:', error);
      Swal.fire('Error', 'No se pudo conectar con la base de datos', 'error');
      return;
    }

    this.catalogoCompleto = (data || []).map((p: any) => {
      const precioBase = Number(p.precio);
      const valorDesc = Number(p.descuento_valor || 0);
      let precioFinal = precioBase;
      if (p.tiene_descuento && p.tipo_descuento === 'simple') {
        precioFinal = precioBase - (precioBase * valorDesc) / 100;
      }

      const catNombre = (p.categorias?.nombre || '').toLowerCase();
      const tallesDisponibles = (p.producto_talles || [])
        .map((pt: any) => pt.talles?.nombre)
        .filter(Boolean);
      const coloresDisponibles = (p.producto_colores || [])
        .map((pc: any) => pc.colores?.nombre)
        .filter(Boolean);

      const tipoRequerido = catNombre === 'calzado' ? 'calzado' : 'indumentaria';
      const tallesRender =
        catNombre === 'accesorio'
          ? []
          : this.todosLosTalles
              .filter((t) => t.tipo === tipoRequerido)
              .map((t) => ({ nombre: t.nombre, disponible: tallesDisponibles.includes(t.nombre) }));

      const coloresRender = this.todosLosColores.map((c) => ({
        nombre: c.nombre,
        disponible: coloresDisponibles.includes(c.nombre),
      }));

      const imagenes = (p.producto_imagenes || []).map((i: any) => i.url);

      return {
        ...p,
        precio_original: precioBase,
        precio_final: precioFinal,
        // CAMBIO: categoria_display y categoria en minúsculas para comparación correcta
        categoria_display: p.categorias?.nombre || 'General',
        categoria: p.categorias?.nombre || '',
        genero: p.generos?.nombre || '',
        talles_render: tallesRender,
        colores_render: coloresRender,
        imagen: imagenes[0] || 'assets/no-image.png',
        imagenes_list: imagenes.length ? imagenes : ['assets/no-image.png'],
      };
    });

    if (this.catalogoCompleto.length > 0) {
      this.precioMaxGlobal = Math.max(...this.catalogoCompleto.map((p) => p.precio_final));
      this.precioMax = this.precioMaxGlobal;
    }

    this.cdr.detectChanges();
  }

  // CAMBIO: filtroCategoria compara ahora en lowercase para que funcione correctamente
  get productosFiltrados() {
    return this.catalogoCompleto
      .filter((p) => {
        const matchGen = this.filtroGenero === 'Todos' || p.genero === this.filtroGenero;
        const matchCat =
          this.filtroCategoria === 'Todos' ||
          p.categoria_display.toLowerCase() === this.filtroCategoria.toLowerCase();
        const matchPre = p.precio_final >= this.precioMin && p.precio_final <= this.precioMax;
        const matchDest = !this.soloDestacados || p.destacado;
        return matchGen && matchCat && matchPre && matchDest;
      })
      .sort((a, b) => {
        if (this.ordenActual === 'Menor Precio') return a.precio_final - b.precio_final;
        if (this.ordenActual === 'Mayor Precio') return b.precio_final - a.precio_final;
        return 0;
      });
  }

  get productosPaginados() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.productosFiltrados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas() {
    return Math.ceil(this.productosFiltrados.length / this.itemsPorPagina) || 1;
  }

  abrirDetalle(item: any) {
    this.productoSeleccionado = item;
    this.talleElegido = '';
    this.colorElegido = '';
    this.imagenIndex = 0;
    this.zoomActivo = false;
    this.verMas = false;

    const modalElement = document.getElementById('detailModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
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
      imagen: this.productoSeleccionado.imagen,
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

  seleccionarTalle(talle: string) {
    this.talleElegido = talle;
  }
  seleccionarColor(color: string) {
    this.colorElegido = color;
  }

  // CAMBIO: flechas y zoom en modal productos igual que home
  siguienteImagen() {
    const imgs = this.productoSeleccionado?.imagenes_list;
    if (!imgs) return;
    this.imagenIndex = (this.imagenIndex + 1) % imgs.length;
  }

  anteriorImagen() {
    const imgs = this.productoSeleccionado?.imagenes_list;
    if (!imgs) return;
    this.imagenIndex = (this.imagenIndex - 1 + imgs.length) % imgs.length;
  }

  toggleZoom() {
    this.zoomActivo = !this.zoomActivo;
  }

  // CAMBIO: setFiltroGenero y setFiltroCategoria resetean pagina y cierran offcanvas mobile
  setFiltroGenero(g: string) {
    this.filtroGenero = g;
    this.paginaActual = 1;
  }

  setFiltroCategoria(c: string) {
    this.filtroCategoria = c;
    this.paginaActual = 1;
  }

  // CAMBIO: limpiarFiltros también cierra el offcanvas mobile si está abierto
  limpiarFiltros() {
    this.filtroGenero = 'Todos';
    this.filtroCategoria = 'Todos';
    this.precioMin = 0;
    this.precioMax = this.precioMaxGlobal;
    this.soloDestacados = false;
    this.paginaActual = 1;

    // Cerrar offcanvas mobile si está abierto
    const offcanvasEl = document.getElementById('filtrosMobile');
    if (offcanvasEl) {
      const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
      if (offcanvas) offcanvas.hide();
    }
  }

  // CAMBIO: limpiar solo el filtro de precio
  limpiarFiltroPrecio() {
    this.precioMin = 0;
    this.precioMax = this.precioMaxGlobal;
    this.paginaActual = 1;
  }

  // CAMBIO: método para abrir offcanvas mobile correctamente
  abrirFiltrosMobile() {
    const offcanvasEl = document.getElementById('filtrosMobile');
    if (offcanvasEl) {
      const offcanvas = new bootstrap.Offcanvas(offcanvasEl);
      offcanvas.show();
    }
  }
}
