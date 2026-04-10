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

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'productos', component: ProductosComponent },
  { path: 'nosotros', component: NosotrosComponent },
  {
    path: 'mis-pedidos/:id',
    component: PedidoDetalleComponent,
    runGuardsAndResolvers: 'always',
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('../app/admin/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'finalizar-compra',
    component: FinalizarCompraComponent,
    canActivate: [carritoGuard],
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      onSameUrlNavigation: 'reload', // 🔥 ESTO ES LA CLAVE
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
