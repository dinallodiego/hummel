import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ProductosService {
  api = 'https://raxnktjhjyfvqajgffkf.supabase.co/rest/v1';

  constructor(private http: HttpClient) {}

  getProductos() {
    return this.http.get<any[]>(`${this.api}/productos`);
  }

  getProductosActivos() {
    return this.http.get<any[]>(
      'https://raxnktjhjyfvqajgffkf.supabase.co/rest/v1/productos-activos',
    );
  }

  getTalles() {
    return this.http.get<any[]>(`${this.api}/talles`);
  }

  getColores() {
    return this.http.get<any[]>(`${this.api}/colores`);
  }
}
