import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PedidosComponent } from './pedidos/pedidos';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, PedidosComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit {
  vista: string = 'dashboard';
  productos: any[] = [];
  producto: any = this.getProductoVacio();
  generos: any[] = [];
  categorias: any[] = [];
  talles: any[] = [];
  colores: any[] = [];
  tallesSeleccionados: number[] = [];
  coloresSeleccionados: number[] = [];
  imagenes: File[] = [];
  pedidosPendientes: number = 0;
  ventas: any[] = [];
  paginaActual: number = 1;
  itemsPorPagina: number = 5;
  fechaDesde: string = '';
  fechaHasta: string = '';
  ventasOriginal: any[] = [];
  mostrarTalles = true;
  tallesFiltrados: any[] = [];
  dropdownTalles = true;
  paginaProductos: number = 1;
  productosPorPagina: number = 10;

  @ViewChild(PedidosComponent) pedidosComp!: PedidosComponent;

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargarProductos();
    this.cargarVentas();
    this.http.get('http://localhost:3000/generos').subscribe((data: any) => (this.generos = data));
    this.http
      .get('http://localhost:3000/categorias')
      .subscribe((data: any) => (this.categorias = data));
    this.http.get('http://localhost:3000/talles').subscribe((data: any) => (this.talles = data));
    this.http.get('http://localhost:3000/colores').subscribe((data: any) => (this.colores = data));
    this.http
      .get<{ pendientes: number }>('http://localhost:3000/pedidos-pendientes/count')
      .subscribe((res) => (this.pedidosPendientes = res.pendientes));
  }

  getProductoVacio() {
    return {
      id: null,
      nombre: '',
      precio: null,
      descripcion: '',
      genero_id: '',
      categoria_id: '',
      tiene_descuento: false,

      // NUEVO 👇
      tipo_descuento: 'simple',
      descuento_valor: null,
      descuento_cantidad: null,
    };
  }

  get totalVentas(): number {
    return this.ventas.reduce((acc, v) => acc + Number(v.total), 0);
  }

  onCategoriaChange() {
    this.tallesSeleccionados = [];

    if (this.producto.categoria_id == 1) {
      // INDUMENTARIA: IDs del 1 al 7 según tu nueva DB
      this.mostrarTalles = true;
      this.tallesFiltrados = [
        { id: 1, nombre: 'XXS' },
        { id: 2, nombre: 'XS' },
        { id: 3, nombre: 'S' },
        { id: 4, nombre: 'M' },
        { id: 5, nombre: 'L' },
        { id: 6, nombre: 'XL' },
        { id: 7, nombre: 'XXL' },
      ];
    } else if (this.producto.categoria_id == 2) {
      // CALZADO: IDs del 35 al 45
      this.mostrarTalles = true;
      this.tallesFiltrados = Array.from({ length: 11 }, (_, i) => ({
        id: i + 35,
        nombre: (i + 35).toString(),
      }));
    } else {
      // ACCESORIOS (Gorras, muñequeras, etc.)
      this.mostrarTalles = false;
      this.tallesFiltrados = [];
    }
  }

  editarProducto(p: any) {
    this.producto = {
      ...p,
      tipo_descuento: p.tipo_descuento || 'simple',
      descuento_cantidad: p.descuento_cantidad || null,
    };
    this.onCategoriaChange();
    this.tallesSeleccionados = [...(p.talles_ids || [])];
    this.coloresSeleccionados = [...(p.colores_ids || [])];
    this.imagenes = [];
  }

  hayCambios(): boolean {
    return (
      this.producto.nombre ||
      this.producto.descripcion ||
      this.producto.precio ||
      this.tallesSeleccionados.length > 0 ||
      this.coloresSeleccionados.length > 0 ||
      this.imagenes.length > 0
    );
  }

  confirmarCerrarModal(event: any) {
    if (!this.hayCambios()) return true;

    event.preventDefault();

    Swal.fire({
      title: '¿Seguro que querés cerrar?',
      text: 'Se perderán los cambios no guardados',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (res.isConfirmed) {
        const btn = document.getElementById('cerrarModalProducto');
        btn?.click();
      }
    });

    return false;
  }

  cargarProductos() {
    this.http.get<any[]>('http://localhost:3000/productos').subscribe((productos) => {
      this.productos = productos.map((p: any) => ({
        ...p,
        precio: Number(p.precio),
        descuento_valor: Number(p.descuento_valor || 0),
        tiene_descuento: !!p.tiene_descuento,
        descuento_cantidad: Number(p.descuento_cantidad || 0),
        tipo_descuento: p.tipo_descuento || 'simple',
        imagen: p.imagen || 'assets/no-image.png',
      }));
      this.paginaProductos = 1;
      this.cdr.detectChanges();
    });
  }

  calcularPrecioAdmin(p: any): number {
    if (!p.tiene_descuento) return p.precio;

    if (p.tipo_descuento === 'simple') {
      return p.precio - (p.precio * p.descuento_valor) / 100;
    }

    // 👉 NO aplicar descuento por cantidad en admin
    return p.precio;
  }

  logout() {
    Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Vas a salir del panel de administración',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#000',
      cancelButtonColor: '#aaa',
    }).then((res) => {
      if (res.isConfirmed) {
        this.auth.logout().subscribe({
          next: () => {
            this.router.navigate(['/admin/login']);
          },
          error: () => {
            this.router.navigate(['/admin/login']);
          },
        });
      }
    });
  }

  abrirCrearProducto() {
    this.producto = this.getProductoVacio();
    this.tallesSeleccionados = [];
    this.coloresSeleccionados = [];
    this.imagenes = [];
  }

  onFilesSelected(event: any) {
    this.imagenes = event.target.files;
  }

  toggleTalle(id: any, event: any) {
    // Forzamos que el ID sea un número para que coincida 100% con la DB
    const idNum = Number(id);

    if (event.target.checked) {
      // Verificamos que no esté ya en el array (evita duplicados por clics rápidos)
      if (!this.tallesSeleccionados.includes(idNum)) {
        this.tallesSeleccionados.push(idNum);
      }
    } else {
      // Filtramos comparando números
      this.tallesSeleccionados = this.tallesSeleccionados.filter((t) => t !== idNum);
    }

    console.log('Talles seleccionados para enviar:', this.tallesSeleccionados);
  }

  toggleColor(id: number, event: any) {
    event.target.checked
      ? this.coloresSeleccionados.push(id)
      : (this.coloresSeleccionados = this.coloresSeleccionados.filter((c) => c !== id));
  }

  // 2. Función para formatear el precio mientras escribís y limpiar puntos para el modelo
  onPrecioInput(event: any) {
    let value = event.target.value.replace(/\D/g, ''); // Remueve todo lo que no sea número

    if (value) {
      this.producto.precio = parseInt(value, 10);
      // El pipe de Angular en el HTML se encarga de mostrar los puntos visualmente mediante el [ngModel]
    } else {
      this.producto.precio = null;
    }
  }
  // 👇 FUNCIÓN DE CONFIRMACIÓN CON SWEETALERT
  confirmarGuardado() {
    const textoAccion = this.producto.id ? 'actualizar' : 'crear';

    const camposIncompletos =
      !this.producto.nombre ||
      !this.producto.descripcion ||
      !this.producto.categoria_id ||
      !this.producto.genero_id;

    const faltanTalles = this.mostrarTalles && this.tallesSeleccionados.length === 0;
    const faltanColores = this.coloresSeleccionados.length === 0;
    const faltanImagenes = !this.producto.id && this.imagenes.length === 0;

    if (camposIncompletos) {
      Swal.fire('Campos incompletos', 'Completá nombre, descripción, categoría y género.', 'error');
      return;
    }

    if (faltanTalles) {
      Swal.fire('Faltan talles', 'Seleccioná al menos un talle.', 'error');
      return;
    }

    if (faltanColores) {
      Swal.fire('Faltan colores', 'Seleccioná al menos un color.', 'error');
      return;
    }

    if (faltanImagenes) {
      Swal.fire('Sin imágenes', 'Debes subir al menos una imagen.', 'error');
      return;
    }

    if (!this.producto.precio || this.producto.precio <= 0) {
      Swal.fire('Precio inválido', 'Debe ser mayor a 0.', 'error');
      return;
    }

    // ✅ VALIDACIÓN CORRECTA DE DESCUENTO
    if (this.producto.tiene_descuento) {
      if (
        this.producto.descuento_valor == null ||
        this.producto.descuento_valor <= 0 ||
        this.producto.descuento_valor > 100
      ) {
        Swal.fire('Error en descuento', 'Ingresá un % válido (1-100)', 'error');
        return;
      }

      if (
        this.producto.tipo_descuento === 'cantidad' &&
        (!this.producto.descuento_cantidad || this.producto.descuento_cantidad <= 0)
      ) {
        Swal.fire('Error', 'Ingresá una cantidad válida', 'error');
        return;
      }
    }

    Swal.fire({
      title: `¿Confirmás ${textoAccion} este producto?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.crearProducto();
      }
    });
  }

  crearProducto() {
    const formData = new FormData();
    formData.append('nombre', this.producto.nombre);
    formData.append('descripcion', this.producto.descripcion);
    formData.append('precio', this.producto.precio.toString());
    formData.append('categoria_id', this.producto.categoria_id);
    formData.append('genero_id', this.producto.genero_id);

    // Campos de descuento
    formData.append('tiene_descuento', this.producto.tiene_descuento ? '1' : '0');
    formData.append(
      'descuento_valor',
      this.producto.tiene_descuento ? this.producto.descuento_valor.toString() : '0',
    );
    formData.append('tipo_descuento', this.producto.tipo_descuento || 'simple');
    formData.append(
      'descuento_cantidad',
      this.producto.tipo_descuento === 'cantidad'
        ? this.producto.descuento_cantidad?.toString() || '0'
        : '0',
    );

    formData.append('talles', JSON.stringify(this.tallesSeleccionados));
    formData.append('colores', JSON.stringify(this.coloresSeleccionados));

    for (let i = 0; i < this.imagenes.length; i++) {
      formData.append('imagenes', this.imagenes[i]);
    }

    const url = 'http://localhost:3000/productos';

    if (this.producto.id) {
      this.http.put(`${url}/${this.producto.id}`, formData).subscribe(() => {
        this.finalizarProceso('Producto actualizado correctamente');
      });
    } else {
      this.http.post(url, formData).subscribe(() => {
        this.finalizarProceso('Producto creado exitosamente');
      });
    }
  }

  finalizarProceso(mensaje: string) {
    Swal.fire({
      icon: 'success',
      title: mensaje,
      showConfirmButton: false,
      timer: 1500,
    });
    this.cargarProductos();
    this.abrirCrearProducto();
    // Cerramos el modal usando el ID del botón de cerrar que definimos en el HTML
    document.getElementById('cerrarModalProducto')?.click();
  }

  eliminarProducto(p: any) {
    Swal.fire({
      title: '¿Eliminar producto?',
      text: 'Podrás volver a activarlo',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí eliminar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (res.isConfirmed) {
        this.http.put(`http://localhost:3000/productos/${p.id}/desactivar`, {}).subscribe(() => {
          Swal.fire('Producto desactivado', '', 'success');
          this.cargarProductos();
        });
      }
    });
  }

  activarProducto(p: any) {
    Swal.fire({
      title: '¿Activar producto?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Activar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (res.isConfirmed) {
        this.http.put(`http://localhost:3000/productos/${p.id}/activar`, {}).subscribe(() => {
          Swal.fire('Producto activado', '', 'success');
          this.cargarProductos();
        });
      }
    });
  }

  toggleDestacado(producto: any) {
    const accion = producto.destacado ? 'quitar de destacados' : 'destacar';
    Swal.fire({
      title: `¿Seguro que querés ${accion} este producto?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (!res.isConfirmed) return;
      producto.destacado = !producto.destacado;
      this.cdr.detectChanges();
      this.http
        .put(`http://localhost:3000/productos/${producto.id}/destacar`, {
          destacado: producto.destacado,
        })
        .subscribe(() => {
          Swal.fire({
            icon: 'success',
            title: `Producto ${producto.destacado ? 'destacado' : 'quitado'}`,
            showConfirmButton: false,
            timer: 1200,
          });
        });
    });
  }

  cargarVentas() {
    this.http.get<any[]>('http://localhost:3000/ventas').subscribe((data) => {
      this.ventas = data;
      console.log('VENTAS:', data); // 👈 CLAVE
      this.ventasOriginal = data;
    });
  }

  resetFiltros() {
    this.ventas = [...this.ventasOriginal];
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.paginaActual = 1;
  }

  descargarExcel() {
    let data: any[] = [];

    this.ventas.forEach((v) => {
      let detalle = '';

      if (v.productos_detalle && v.productos_detalle.length) {
        detalle = v.productos_detalle.map((p: any) => `• ${p.nombre} x${p.cantidad}`).join('\n');
      } else {
        detalle = 'Sin detalle';
      }

      data.push({
        Cliente: v.cliente_nombre,
        Telefono: v.cliente_telefono || '-',
        'Detalle del pedido': detalle,
        Total: v.total,
        Fecha: new Date(v.fecha).toLocaleDateString(),
      });
    });

    // TOTAL FINAL
    data.push({
      Cliente: 'TOTAL',
      Telefono: '',
      'Detalle del pedido': '',
      Total: this.totalVentas,
      Fecha: '',
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!rows'] = data.map(() => ({ hpt: 40 }));

    worksheet['!cols'] = [
      { wch: 25 }, // Cliente
      { wch: 20 }, // Teléfono
      { wch: 50 }, // Detalle
      { wch: 15 }, // Total
      { wch: 15 }, // Fecha
    ];

    const workbook = {
      Sheets: { Ventas: worksheet },
      SheetNames: ['Ventas'],
    };

    const buffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([buffer], {
      type: 'application/octet-stream',
    });

    saveAs(blob, `ventas-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  get ventasPaginadas() {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.ventas.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas() {
    return Math.ceil(this.ventas.length / this.itemsPorPagina) || 1;
  }

  get productosPaginados() {
    const inicio = (this.paginaProductos - 1) * this.productosPorPagina;
    return this.productos.slice(inicio, inicio + this.productosPorPagina);
  }

  get totalPaginasProductos() {
    return Math.ceil(this.productos.length / this.productosPorPagina);
  }

  filtrarVentas() {
    this.paginaActual = 1;

    this.ventas = this.ventasOriginal.filter((v) => {
      const fecha = new Date(v.fecha).getTime();

      const desde = this.fechaDesde ? new Date(this.fechaDesde + 'T00:00:00').getTime() : null;

      const hasta = this.fechaHasta ? new Date(this.fechaHasta + 'T23:59:59').getTime() : null;

      return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
    });
  }
}
