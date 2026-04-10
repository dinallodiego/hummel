import { Injectable } from '@angular/core';

type TipoDescuento = 'simple' | 'cantidad';

@Injectable({
  providedIn: 'root',
})
export class CarritoService {
  private carrito: any[] = [];

  constructor() {
    this.cargarStorage();
  }

  private guardarStorage() {
    localStorage.setItem('carrito', JSON.stringify(this.carrito));
  }

  private cargarStorage() {
    const data = localStorage.getItem('carrito');
    if (data) this.carrito = JSON.parse(data);
  }

  getCarrito() {
    return this.carrito;
  }

  /**
   * Precio unitario a cobrar/mostrar en el carrito, aplicando descuentos:
   * - simple: siempre aplica precio_final
   * - cantidad: aplica precio_final solo si cantidad >= descuento_cantidad
   */
  getPrecioUnitario(item: any): number {
    const precio = Number(item?.precio || 0);

    // Si precio_final no viene, lo calculamos con descuento_valor
    const descuentoValor = Number(item?.descuento_valor || 0);
    const precioFinalCalculado = precio - (precio * descuentoValor) / 100;
    const precioFinal = Number(
      item?.precio_final ?? (descuentoValor ? precioFinalCalculado : precio),
    );

    const tieneDescuento = !!item?.tiene_descuento;
    const tipo: TipoDescuento = (item?.tipo_descuento || 'simple') as TipoDescuento;
    const cant = Number(item?.cantidad || 0);
    const minCant = Number(item?.descuento_cantidad || 0);

    if (!tieneDescuento) return precio;

    if (tipo === 'simple') return precioFinal;

    if (tipo === 'cantidad') {
      if (minCant > 0 && cant >= minCant) return precioFinal;
      return precio;
    }

    return precio;
  }

  /** Subtotal del item (precio unitario efectivo * cantidad) */
  getSubtotalItem(item: any): number {
    return this.getPrecioUnitario(item) * Number(item?.cantidad || 0);
  }

  agregarProducto(producto: any) {
    // Normalizar para evitar duplicados por null/''
    const talleKey = producto?.talle ?? '';
    const colorKey = producto?.color ?? '';

    const existente = this.carrito.find(
      (item) =>
        item.id === producto.id &&
        (item.talle ?? '') === talleKey &&
        (item.color ?? '') === colorKey,
    );

    if (existente) {
      existente.cantidad++;
    } else {
      this.carrito.push({
        ...producto,

        // asegurar llaves consistentes
        talle: talleKey,
        color: colorKey,

        // default cantidad
        cantidad: producto?.cantidad ? Number(producto.cantidad) : 1,

        uuid: Math.random().toString(36).substring(2),
      });
    }

    this.guardarStorage();
  }

  cambiarCantidad(uuid: string, operacion: 'sumar' | 'restar') {
    const item = this.carrito.find((i) => i.uuid === uuid);
    if (!item) return;

    if (operacion === 'sumar') item.cantidad++;
    else {
      item.cantidad--;
      if (item.cantidad <= 0) {
        this.eliminarProducto(uuid);
        return;
      }
    }

    this.guardarStorage();
  }

  eliminarProducto(uuid: string) {
    this.carrito = this.carrito.filter((i) => i.uuid !== uuid);
    this.guardarStorage();
  }

  limpiarCarrito() {
    this.carrito = [];
    this.guardarStorage();
  }

  /** Total del carrito aplicando descuentos */
  getTotal() {
    return this.carrito.reduce((acc, item) => acc + this.getSubtotalItem(item), 0);
  }
}
