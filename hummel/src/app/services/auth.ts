import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<boolean> {
    return this.http
      .post<{
        ok: boolean;
      }>(`${this.apiUrl}/admin/login`, { email, password }, { withCredentials: true })
      .pipe(map((r) => !!r.ok));
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/logout`, {}, { withCredentials: true });
  }

  isLogged(): Observable<boolean> {
    return this.http
      .get<{ ok: boolean }>(`${this.apiUrl}/admin/me`, { withCredentials: true })
      .pipe(map((r) => !!r.ok));
  }
}
