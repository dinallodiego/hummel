import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FinalizarCompraComponent } from './finalizar-compra/finalizar-compra';
import { HomeComponent } from './home/home.component';
import { ProductosComponent } from './productos/productos.component';
import { NosotrosComponent } from './nosotros/nosotros.component';
import { AdminComponent } from './admin/admin.component';
import { LoginComponent } from './admin/login/login';
import { authGuard } from './guards/auth-guard';
import { carritoGuard } from './guards/auth-guard';
import { PedidoDetalleComponent } from './mis-pedidos/mis-pedidos';

// **Exportamos la constante para que otros archivos puedan usarla**
export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'productos', component: ProductosComponent },
  { path: 'nosotros', component: NosotrosComponent },
  { path: 'pedido/:id', component: PedidoDetalleComponent },
  { path: 'admin/login', component: LoginComponent },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [authGuard],
  },
  {
    path: 'finalizar-compra',
    component: FinalizarCompraComponent,
    canActivate: [carritoGuard],
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];

// Opcional: si querés que este mismo archivo pueda ser usado como módulo de rutas
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
