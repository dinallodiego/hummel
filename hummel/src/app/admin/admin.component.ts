import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { PedidosComponent } from './pedidos/pedidos';

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

  @ViewChild(PedidosComponent) pedidosComp!: PedidosComponent;

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.cargarProductos();
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
    return { id: null, nombre: '', precio: '', descripcion: '', genero_id: '', categoria_id: '' };
  }

  cargarProductos() {
    this.http.get<any[]>('http://localhost:3000/productos').subscribe((productos) => {
      this.productos = productos.map((p: any) => ({
        ...p,
        precio: Number(p.precio),
        imagen: p.imagen?.startsWith('/uploads')
          ? 'http://localhost:3000' + p.imagen
          : 'assets/no-image.png',
        disponible: p.disponible ?? true,
      }));
      this.cdr.detectChanges();
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/admin/login']);
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

  toggleTalle(id: number, event: any) {
    event.target.checked
      ? this.tallesSeleccionados.push(id)
      : (this.tallesSeleccionados = this.tallesSeleccionados.filter((t) => t !== id));
  }

  toggleColor(id: number, event: any) {
    event.target.checked
      ? this.coloresSeleccionados.push(id)
      : (this.coloresSeleccionados = this.coloresSeleccionados.filter((c) => c !== id));
  }

  editarProducto(p: any) {
    this.producto = { ...p };
    this.tallesSeleccionados = [...p.talles_ids];
    this.coloresSeleccionados = [...p.colores_ids];
    this.imagenes = [];
  }

  crearProducto() {
    const formData = new FormData();
    formData.append('nombre', this.producto.nombre);
    formData.append('descripcion', this.producto.descripcion);
    formData.append('precio', this.producto.precio);
    formData.append('categoria_id', this.producto.categoria_id);
    formData.append('genero_id', this.producto.genero_id);
    formData.append('talles', JSON.stringify(this.tallesSeleccionados));
    formData.append('colores', JSON.stringify(this.coloresSeleccionados));
    for (let i = 0; i < this.imagenes.length; i++) formData.append('imagenes', this.imagenes[i]);

    if (this.producto.id) {
      this.http
        .put(`http://localhost:3000/productos/${this.producto.id}`, formData)
        .subscribe(() => {
          Swal.fire({
            icon: 'success',
            title: 'Producto actualizado',
            showConfirmButton: false,
            timer: 1500,
          });
          this.cargarProductos();
        });
    } else {
      this.http.post('http://localhost:3000/productos', formData).subscribe(() => {
        Swal.fire({
          icon: 'success',
          title: 'Producto creado',
          showConfirmButton: false,
          timer: 1500,
        });
        this.cargarProductos();
      });
    }

    this.abrirCrearProducto();
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

      // Actualización instantánea en UI
      producto.destacado = !producto.destacado;
      this.cdr.detectChanges();

      // Backend
      this.http
        .put(`http://localhost:3000/productos/${producto.id}/destacar`, {
          destacado: producto.destacado,
        })
        .subscribe(() => {
          Swal.fire({
            icon: 'success',
            title: `Producto ${producto.destacado ? 'destacado' : 'quitado de destacados'}`,
            showConfirmButton: false,
            timer: 1200,
          });
        });
    });
  }
}
