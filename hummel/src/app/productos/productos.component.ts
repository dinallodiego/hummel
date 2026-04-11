import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ProductosService } from '../services/productos';
import { CarritoService } from '../services/carrito';
import { ActivatedRoute, Router } from '@angular/router';

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

  filtroGenero: string = 'Todos';
  filtroPrenda: string = 'Todos';
  filtroPrecio: string = 'Todos';
  ordenActual: string = 'Relevancia';

  paginaActual = 1;
  itemsPorPagina = 9;

  productoSeleccionado: any = null;

  talleElegido: string = '';
  colorElegido: string = '';

  imagenIndex = 0;
  zoomActivo = false;
  filtroCategoria: string = 'Todos';
  precioMin = 0;
  precioMax = 100000;
  precioMaxGlobal = 100000;
  verMas = false;
  soloDestacados = false;

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
    this.productosService.getProductosActivos().subscribe({
      next: (productos: any[]) => {
        if (!productos || productos.length === 0) {
          this.cargarMock();
          return;
        }

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

          // ✅ Normalización de descuento (simple + cantidad)
          const precioBase = Number(p.precio);
          const tieneDescuento = !!p.tiene_descuento;
          const valorDescuento = Number(p.descuento_valor || 0);
          const tipoDescuento = p.tipo_descuento || 'simple';
          const descuentoCantidad = Number(p.descuento_cantidad || 0);

          let precioFinal = precioBase;
          if (tieneDescuento && (tipoDescuento === 'simple' || tipoDescuento === 'cantidad')) {
            precioFinal = precioBase - (precioBase * valorDescuento) / 100;
          }

          return {
            ...p,
            precio: precioBase,
            precio_final: precioFinal,
            imagen: imagenPrincipal,
            imagenes: imagenesArray,
            destacado: !!p.destacado,

            // ✅ Campos necesarios para que el carrito aplique descuento
            tiene_descuento: tieneDescuento,
            descuento_valor: valorDescuento,
            tipo_descuento: tipoDescuento,
            descuento_cantidad: descuentoCantidad,
          };
        });

        this.catalogoCompleto = nuevosProductos;
        this.paginaActual = 1;
        this.cdr.detectChanges();
      },

      error: () => {
        console.log('🔥 Backend caído → usando MOCK');
        this.cargarMock();
      },
    });
  }

  cargarMock() {
    // MOCK con ejemplo cantidad incluido
    this.catalogoCompleto = [
      {
        id: 1,
        nombre: 'Remera Oversize',
        genero: 'Hombre',
        tipo: 'Remera',
        categoria: 'Indumentaria',
        descripcion: 'Remera urbana premium',
        precio: 25000,
        precio_final: 25000,
        tiene_descuento: false,
        imagen: '../../assets/remera.webp',
        imagenes: ['../../assets/remera.webp'],
        talles: [
          { nombre: 'M', disponible: true },
          { nombre: 'L', disponible: true },
        ],
        colores: [{ nombre: 'Negro', disponible: true }],
        destacado: true,
      },
      {
        id: 2,
        nombre: 'Zapatillas Urban',
        genero: 'Mujer',
        tipo: 'Zapatillas',
        categoria: 'Calzado',
        descripcion: 'Zapas facheras',
        precio: 80000,
        precio_final: 72000,
        tiene_descuento: true,
        descuento_valor: 10,
        tipo_descuento: 'simple',
        imagen: '../../assets/zapatillas.jpg',
        imagenes: ['../../assets/zapatillas.jpg'],
        talles: [{ nombre: '38', disponible: true }],
        colores: [{ nombre: 'Blanco', disponible: true }],
        destacado: false,
      },
      {
        id: 3,
        nombre: 'Medias de juego 3/4',
        genero: 'Mujer',
        tipo: 'Accesorio',
        categoria: 'Accesorio',
        descripcion: 'Promo por cantidad',
        precio: 5300,
        precio_final: 4770,
        tiene_descuento: true,
        descuento_valor: 10,
        tipo_descuento: 'cantidad',
        descuento_cantidad: 3,
        imagen: '../../assets/gorra.jpg',
        imagenes: ['../../assets/gorra.jpg'],
        talles: [],
        colores: [{ nombre: 'Negro', disponible: true }],
        destacado: true,
      },
    ];

    this.paginaActual = 1;
    this.cdr.detectChanges();
  }

  tiposDePrendaDisponibles(): string[] {
    const filtradoPorGenero = this.catalogoCompleto.filter((p) =>
      this.filtroGenero === 'Todos'
        ? true
        : p.genero?.toLowerCase() === this.filtroGenero.toLowerCase(),
    );

    return Array.from(new Set(filtradoPorGenero.map((p) => p.tipo))).sort();
  }

  setFiltro(genero: string) {
    this.filtroGenero = genero;
    this.filtroPrenda = 'Todos';
    this.paginaActual = 1;
  }

  setFiltroPrenda(tipo: string) {
    this.filtroPrenda = tipo;
    this.paginaActual = 1;
  }

  limpiarTodosLosFiltros() {
    // 1. Reset de variables
    this.filtroGenero = 'Todos';
    this.filtroCategoria = 'Todos';
    this.filtroPrenda = 'Todos';
    this.precioMin = 0;
    this.precioMax = 100000;
    this.soloDestacados = false;
    this.ordenActual = 'Relevancia';
    this.paginaActual = 1;

    // 2. Cerrar los accordions de Bootstrap manualmente
    const accordionElements = document.querySelectorAll('.accordion-collapse.show');
    accordionElements.forEach((el) => {
      // Usamos la instancia global de bootstrap que ya tenés declarada arriba
      const bsCollapse = bootstrap.Collapse.getInstance(el);
      if (bsCollapse) {
        bsCollapse.hide();
      } else {
        // Si no existe instancia iniciada, creamos una nueva para ocultar
        new bootstrap.Collapse(el).hide();
      }
    });

    // 3. Feedback visual y scroll
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  hayFiltrosActivos(): boolean {
    return (
      this.filtroGenero !== 'Todos' ||
      this.filtroCategoria !== 'Todos' ||
      this.filtroPrenda !== 'Todos' ||
      this.soloDestacados === true ||
      this.precioMin > 0 ||
      this.precioMax !== 100000 ||
      this.ordenActual !== 'Relevancia'
    );
  }

  get productosFiltrados() {
    let resultado = [...this.catalogoCompleto];

    if (this.filtroGenero !== 'Todos') {
      resultado = resultado.filter(
        (p) => p.genero?.toLowerCase() === this.filtroGenero.toLowerCase(),
      );
    }

    if (this.filtroCategoria !== 'Todos') {
      resultado = resultado.filter(
        (p) => (p.categoria || '').toLowerCase() === this.filtroCategoria.toLowerCase(),
      );
    }

    if (this.filtroPrenda !== 'Todos') {
      resultado = resultado.filter((p) => p.tipo === this.filtroPrenda);
    }

    if (this.filtroPrecio === 'Menor') resultado = resultado.filter((p) => p.precio < 50000);
    if (this.filtroPrecio === 'Mayor') resultado = resultado.filter((p) => p.precio >= 50000);

    if (this.soloDestacados) resultado = resultado.filter((p) => p.destacado);

    if (this.ordenActual === 'Menor Precio') resultado.sort((a, b) => a.precio - b.precio);
    if (this.ordenActual === 'Mayor Precio') resultado.sort((a, b) => b.precio - a.precio);

    resultado = resultado.filter((p) => p.precio >= this.precioMin && p.precio <= this.precioMax);

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

  cambiarPagina(p: number) {
    this.paginaActual = p;
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (this.imagenIndex >= this.productoSeleccionado.imagenes.length) this.imagenIndex = 0;
  }

  anteriorImagen() {
    if (!this.productoSeleccionado?.imagenes) return;
    this.imagenIndex--;
    if (this.imagenIndex < 0) this.imagenIndex = this.productoSeleccionado.imagenes.length - 1;
  }

  seleccionarImagen(i: number) {
    this.imagenIndex = i;
  }

  toggleZoom() {
    this.zoomActivo = !this.zoomActivo;
  }

  validarPrecio() {
    if (this.precioMin < 0) this.precioMin = 0;
    if (this.precioMax < this.precioMin) this.precioMax = this.precioMin;
  }

  resetPrecio() {
    this.precioMin = 0;
    this.precioMax = this.precioMaxGlobal;
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

  // Estos métodos los usás en el offcanvas (si lo tenés en esta página)
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
