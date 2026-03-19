import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ProductosService {
  api = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  getProductos() {
    return this.http.get<any[]>(`${this.api}/productos`);
  }

  getProductosActivos() {
    return this.http.get<any[]>(`${this.api}/productos-activos`);
  }
}
