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
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

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
  ventasOriginal: any[] = [];
  paginaActual: number = 1;
  itemsPorPagina: number = 5;
  fechaDesde: string = '';
  fechaHasta: string = '';
  mostrarTalles = true;
  tallesFiltrados: any[] = [];
  dropdownTalles = true;
  paginaProductos: number = 1;
  productosPorPagina: number = 10;
  guardando = false;

  @ViewChild(PedidosComponent) pedidosComp!: PedidosComponent;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargarTodo();
  }

  async cargarTodo() {
    await Promise.all([
      this.cargarProductos(),
      this.cargarGeneros(),
      this.cargarCategorias(),
      this.cargarTalles(),
      this.cargarColores(),
      this.cargarVentas(),
      this.cargarPedidosPendientes(),
    ]);
  }

  // CAMBIO: método centralizado para cambiar vista y refrescar datos
  async cambiarVista(nueva: string) {
    this.vista = nueva;
    // Refrescar datos relevantes según la sección seleccionada
    if (nueva === 'productos') {
      await this.cargarProductos();
    } else if (nueva === 'ventas') {
      await this.cargarVentas();
    } else if (nueva === 'pedidos') {
      await this.cargarPedidosPendientes();
    } else if (nueva === 'dashboard') {
      await Promise.all([this.cargarProductos(), this.cargarVentas(), this.cargarPedidosPendientes()]);
    }
    this.cdr.detectChanges();
  }

  // CAMBIO: cuando pedidos emite cambios, refrescar ventas y contadores
  async onCambiosPedidos() {
    await Promise.all([this.cargarVentas(), this.cargarPedidosPendientes()]);
    this.cdr.detectChanges();
  }


  async cargarGeneros() {
    const { data } = await supabase.from('generos').select('*').eq('disponible', true);
    this.generos = data || [];
  }

  async cargarCategorias() {
    const { data } = await supabase.from('categorias').select('*').eq('disponible', true);
    this.categorias = data || [];
  }

  async cargarTalles() {
    const { data } = await supabase.from('talles').select('*').eq('disponible', true);
    this.talles = data || [];
  }

  async cargarColores() {
    const { data } = await supabase.from('colores').select('*').eq('disponible', true);
    this.colores = data || [];
  }

  async cargarPedidosPendientes() {
    const { count } = await supabase
      .from('pedidos')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    this.pedidosPendientes = count || 0;
  }

  async cargarProductos() {
    const { data, error } = await supabase
      .from('productos')
      .select(
        `
        *,
        producto_imagenes(url),
        producto_talles(talle_id),
        producto_colores(color_id)
      `,
      )
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('Error cargando productos:', error);
      return;
    }

    this.productos = (data || []).map((p) => ({
      ...p,
      precio: Number(p.precio),
      imagen: p.producto_imagenes?.[0]?.url || 'assets/no-image.png',
      imagenes_urls: (p.producto_imagenes || []).map((i: any) => i.url),
      talles_ids: (p.producto_talles || []).map((t: any) => t.talle_id),
      colores_ids: (p.producto_colores || []).map((c: any) => c.color_id),
    }));

    this.cdr.detectChanges();
  }

  async cargarVentas() {
    // Traemos pedidos aceptados con sus productos para la vista de ventas
    const { data, error } = await supabase
      .from('pedidos')
      .select(`*, pedido_productos(*)`)
      .eq('estado', 'aceptado')
      .order('fecha', { ascending: false });

    if (error) return;

    this.ventas = (data || []).map((v) => ({
      ...v,
      cliente_nombre: v.nombre,
      cliente_telefono: v.telefono,
      productos_detalle: v.pedido_productos || [],
    }));
    this.ventasOriginal = [...this.ventas];
    this.cdr.detectChanges();
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
      this.mostrarTalles = true;
      this.tallesFiltrados = Array.from({ length: 11 }, (_, i) => ({
        id: i + 35,
        nombre: (i + 35).toString(),
      }));
    } else {
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

  abrirCrearProducto() {
    this.producto = this.getProductoVacio();
    this.tallesSeleccionados = [];
    this.coloresSeleccionados = [];
    this.imagenes = [];
  }

  onFilesSelected(event: any) {
    this.imagenes = Array.from(event.target.files);
  }

  toggleTalle(id: any, event: any) {
    const idNum = Number(id);
    if (event.target.checked) {
      if (!this.tallesSeleccionados.includes(idNum)) this.tallesSeleccionados.push(idNum);
    } else {
      this.tallesSeleccionados = this.tallesSeleccionados.filter((t) => t !== idNum);
    }
  }

  toggleColor(id: number, event: any) {
    event.target.checked
      ? this.coloresSeleccionados.push(id)
      : (this.coloresSeleccionados = this.coloresSeleccionados.filter((c) => c !== id));
  }

  onPrecioInput(event: any) {
    const value = event.target.value.replace(/\D/g, '');
    this.producto.precio = value ? parseInt(value, 10) : null;
  }

  calcularPrecioAdmin(p: any): number {
    if (!p.tiene_descuento) return p.precio;
    if (p.tipo_descuento === 'simple') {
      return p.precio - (p.precio * p.descuento_valor) / 100;
    }
    return p.precio;
  }

  hayCambios(): boolean {
    return !!(
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
      if (res.isConfirmed) document.getElementById('cerrarModalProducto')?.click();
    });
    return false;
  }

  confirmarGuardado() {
    const textoAccion = this.producto.id ? 'actualizar' : 'crear';

    if (
      !this.producto.nombre ||
      !this.producto.descripcion ||
      !this.producto.categoria_id ||
      !this.producto.genero_id
    ) {
      Swal.fire('Campos incompletos', 'Completá nombre, descripción, categoría y género.', 'error');
      return;
    }
    if (this.mostrarTalles && this.tallesSeleccionados.length === 0) {
      Swal.fire('Faltan talles', 'Seleccioná al menos un talle.', 'error');
      return;
    }
    if (this.coloresSeleccionados.length === 0) {
      Swal.fire('Faltan colores', 'Seleccioná al menos un color.', 'error');
      return;
    }
    if (!this.producto.id && this.imagenes.length === 0) {
      Swal.fire('Sin imágenes', 'Debés subir al menos una imagen.', 'error');
      return;
    }
    if (!this.producto.precio || this.producto.precio <= 0) {
      Swal.fire('Precio inválido', 'Debe ser mayor a 0.', 'error');
      return;
    }
    if (this.producto.tiene_descuento) {
      if (
        !this.producto.descuento_valor ||
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
      if (result.isConfirmed) this.guardarProducto();
    });
  }

  async guardarProducto() {
    this.guardando = true;

    try {
      // 1. Subir imágenes nuevas al Storage
      const urlsNuevas: string[] = [];
      for (const file of this.imagenes) {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('productos')
          .upload(fileName, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('productos').getPublicUrl(fileName);
        urlsNuevas.push(urlData.publicUrl);
      }

      // 2. Datos del producto
      const datosProducto = {
        nombre: this.producto.nombre,
        descripcion: this.producto.descripcion,
        precio: this.producto.precio,
        categoria_id: Number(this.producto.categoria_id),
        genero_id: Number(this.producto.genero_id),
        tiene_descuento: this.producto.tiene_descuento,
        descuento_valor: this.producto.tiene_descuento ? this.producto.descuento_valor : 0,
        tipo_descuento: this.producto.tipo_descuento || 'simple',
        descuento_cantidad:
          this.producto.tipo_descuento === 'cantidad' ? this.producto.descuento_cantidad : 0,
        disponible: true,
      };

      let productoId = this.producto.id;

      if (productoId) {
        // EDITAR
        const { error } = await supabase
          .from('productos')
          .update(datosProducto)
          .eq('id', productoId);
        if (error) throw error;
      } else {
        // CREAR
        const { data, error } = await supabase
          .from('productos')
          .insert(datosProducto)
          .select('id')
          .single();
        if (error) throw error;
        productoId = data.id;
      }

      // 3. Talles: borrar los viejos y reinsertar
      await supabase.from('producto_talles').delete().eq('producto_id', productoId);
      if (this.tallesSeleccionados.length > 0) {
        await supabase
          .from('producto_talles')
          .insert(
            this.tallesSeleccionados.map((t) => ({
              producto_id: productoId,
              talle_id: t,
              disponible: true,
            })),
          );
      }

      // 4. Colores: borrar los viejos y reinsertar
      await supabase.from('producto_colores').delete().eq('producto_id', productoId);
      if (this.coloresSeleccionados.length > 0) {
        await supabase
          .from('producto_colores')
          .insert(
            this.coloresSeleccionados.map((c) => ({
              producto_id: productoId,
              color_id: c,
              disponible: true,
            })),
          );
      }

      // 5. Imágenes nuevas
      if (urlsNuevas.length > 0) {
        await supabase
          .from('producto_imagenes')
          .insert(urlsNuevas.map((url) => ({ producto_id: productoId, url })));
      }

      Swal.fire({
        icon: 'success',
        title: this.producto.id ? 'Producto actualizado' : 'Producto creado',
        showConfirmButton: false,
        timer: 1500,
      });

      await this.cargarProductos();
      this.abrirCrearProducto();
      document.getElementById('cerrarModalProducto')?.click();
    } catch (err: any) {
      console.error('Error guardando producto:', err);
      Swal.fire('Error', err.message || 'No se pudo guardar el producto', 'error');
    } finally {
      this.guardando = false;
    }
  }

  async eliminarProducto(p: any) {
    const res = await Swal.fire({
      title: '¿Eliminar producto?',
      text: 'Podrás volver a activarlo',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!res.isConfirmed) return;

    const { error } = await supabase.from('productos').update({ disponible: false }).eq('id', p.id);
    if (error) {
      Swal.fire('Error', 'No se pudo desactivar', 'error');
      return;
    }

    Swal.fire('Producto desactivado', '', 'success');
    await this.cargarProductos();
  }

  async activarProducto(p: any) {
    const res = await Swal.fire({
      title: '¿Activar producto?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Activar',
      cancelButtonText: 'Cancelar',
    });

    if (!res.isConfirmed) return;

    const { error } = await supabase.from('productos').update({ disponible: true }).eq('id', p.id);
    if (error) {
      Swal.fire('Error', 'No se pudo activar', 'error');
      return;
    }

    Swal.fire('Producto activado', '', 'success');
    await this.cargarProductos();
  }

  async toggleDestacado(producto: any) {
    const accion = producto.destacado ? 'quitar de destacados' : 'destacar';
    const res = await Swal.fire({
      title: `¿Seguro que querés ${accion} este producto?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'Cancelar',
    });

    if (!res.isConfirmed) return;

    const nuevoValor = !producto.destacado;
    const { error } = await supabase
      .from('productos')
      .update({ destacado: nuevoValor })
      .eq('id', producto.id);
    if (error) {
      Swal.fire('Error', 'No se pudo actualizar', 'error');
      return;
    }

    producto.destacado = nuevoValor;
    this.cdr.detectChanges();

    Swal.fire({
      icon: 'success',
      title: nuevoValor ? 'Producto destacado' : 'Quitado de destacados',
      showConfirmButton: false,
      timer: 1200,
    });
  }

  logout() {
    Swal.fire({
      title: '¿Cerrar sesión?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#000',
      cancelButtonColor: '#aaa',
    }).then((res) => {
      if (res.isConfirmed) {
        this.auth.logout();
        this.router.navigate(['/login']);
      }
    });
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
    return Math.ceil(this.productos.length / this.productosPorPagina) || 1;
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

  resetFiltros() {
    this.ventas = [...this.ventasOriginal];
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.paginaActual = 1;
  }

  descargarExcel() {
    const data = this.ventas.map((v) => ({
      Cliente: v.cliente_nombre,
      Telefono: v.cliente_telefono || '-',
      'Detalle del pedido':
        (v.productos_detalle || []).map((p: any) => `• ${p.nombre} x${p.cantidad}`).join('\n') ||
        'Sin detalle',
      Total: v.total,
      Fecha: new Date(v.fecha).toLocaleDateString(),
    }));

    data.push({
      Cliente: 'TOTAL',
      Telefono: '',
      'Detalle del pedido': '',
      Total: this.totalVentas,
      Fecha: '',
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 50 }, { wch: 15 }, { wch: 15 }];
    const workbook = { Sheets: { Ventas: worksheet }, SheetNames: ['Ventas'] };
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([buffer], { type: 'application/octet-stream' }),
      `ventas-${new Date().toISOString().split('T')[0]}.xlsx`,
    );
  }
}
