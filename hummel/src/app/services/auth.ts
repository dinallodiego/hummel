import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

const ADMIN_SESSION_KEY = 'hummel_admin_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Login: busca el admin por email y verifica la contraseña con bcrypt
  async login(email: string, password: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, password_hash, role, active')
      .eq('email', email.toLowerCase().trim())
      .eq('active', true)
      .single();

    if (error || !data) return false;

    // Verificamos el hash con bcryptjs (corre en el browser)
    const bcrypt = await import('bcryptjs');
    const ok = await bcrypt.compare(password, data.password_hash);

    if (ok) {
      // Guardamos sesión en localStorage
      localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({
          id: data.id,
          email: data.email,
          role: data.role,
          loggedAt: new Date().toISOString(),
        }),
      );
    }

    return ok;
  }

  logout(): void {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }

  isLogged(): boolean {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return false;
    try {
      const session = JSON.parse(raw);
      return !!session?.email;
    } catch {
      return false;
    }
  }

  getAdmin(): any {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
