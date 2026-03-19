import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PedidoService {
  private baseUrl = 'http://localhost:3000/pedidos'; // cambia según tu backend

  constructor(private http: HttpClient) {}

  getPedidoPorCodigo(dato: string): Observable<any> {
    return this.http
      .get<{ encontrado: boolean; pedido?: any }>(`${this.baseUrl}/buscar/${dato}`)
      .pipe(
        map((res) => (res.encontrado ? res.pedido : null)), // devolvemos directamente el pedido o null
      );
  }
}
