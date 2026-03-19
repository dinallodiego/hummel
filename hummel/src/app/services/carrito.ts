import { Injectable } from '@angular/core';

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

  agregarProducto(producto: any) {
    const existente = this.carrito.find(
      (item) =>
        item.id === producto.id && item.talle === producto.talle && item.color === producto.color,
    );

    if (existente) {
      existente.cantidad++;
    } else {
      this.carrito.push({
        ...producto,
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

  getTotal() {
    return this.carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  }
}
