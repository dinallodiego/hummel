import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

const supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

@Injectable({ providedIn: 'root' })
export class PedidoService {
  // Busca pedidos por id_pedido (ej: HUM-XXXXXXXX) o por DNI
  async getPedidoPorCodigo(dato: string): Promise<any> {
    const query = dato.toUpperCase().trim();

    // Intentamos por id_pedido primero
    const { data: porId } = await supabase
      .from('pedidos')
      .select(`*, pedido_productos(*)`)
      .eq('id_pedido', query);

    if (porId && porId.length > 0) {
      return { encontrado: true, pedidos: porId };
    }

    // Si no, buscamos por DNI
    const { data: porDni } = await supabase
      .from('pedidos')
      .select(`*, pedido_productos(*)`)
      .eq('dni', dato.trim())
      .order('fecha', { ascending: false });

    if (porDni && porDni.length > 0) {
      return { encontrado: true, pedidos: porDni };
    }

    return { encontrado: false, pedidos: [] };
  }
}
