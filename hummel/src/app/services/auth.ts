import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private email = 'admin@hummel.com';
  private password = '123456';

  login(email: string, password: string): boolean {

    if (email === this.email && password === this.password) {
      localStorage.setItem('adminLogged', 'true');
      return true;
    }

    return false;
  }

  isLogged(): boolean {
    return localStorage.getItem('adminLogged') === 'true';
  }

  logout() {
    localStorage.removeItem('adminLogged');
  }

}