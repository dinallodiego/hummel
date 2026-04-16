import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PedidoService {
  private baseUrl = 'https://raxnktjhjyfvqajgffkf.supabase.co/pedidos';

  constructor(private http: HttpClient) {}

  getPedidoPorCodigo(dato: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/buscar/${dato}`);
  }
}
