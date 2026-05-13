import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'clientes' },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/clientes-list.component').then(m => m.ClientesListComponent),
        data: { breadcrumb: ['Cadastros', 'Clientes'] }
      },
      {
        path: 'clientes/novo',
        loadComponent: () =>
          import('./features/clientes/cliente-form.component').then(m => m.ClienteFormComponent),
        data: { breadcrumb: ['Cadastros', 'Clientes', 'Novo'] }
      },
      {
        path: 'clientes/:id',
        loadComponent: () =>
          import('./features/clientes/cliente-detail.component').then(m => m.ClienteDetailComponent),
        data: { breadcrumb: ['Cadastros', 'Clientes', 'Detalhe'] }
      },
      {
        path: 'clientes/:id/editar',
        loadComponent: () =>
          import('./features/clientes/cliente-form.component').then(m => m.ClienteFormComponent),
        data: { breadcrumb: ['Cadastros', 'Clientes', 'Editar'] }
      },
      {
        path: 'pedidos',
        loadComponent: () =>
          import('./features/pedidos/pedidos-list.component').then(m => m.PedidosListComponent),
        data: { breadcrumb: ['Vendas', 'Pedidos'] }
      },
      {
        path: 'pedidos/novo',
        loadComponent: () =>
          import('./features/pedidos/pedido-form.component').then(m => m.PedidoFormComponent),
        data: { breadcrumb: ['Vendas', 'Pedidos', 'Novo'] }
      },
      {
        path: 'pedidos/:id',
        loadComponent: () =>
          import('./features/pedidos/pedido-detail.component').then(m => m.PedidoDetailComponent),
        data: { breadcrumb: ['Vendas', 'Pedidos', 'Detalhe'] }
      },
      {
        path: 'pedidos/:id/editar',
        loadComponent: () =>
          import('./features/pedidos/pedido-form.component').then(m => m.PedidoFormComponent),
        data: { breadcrumb: ['Vendas', 'Pedidos', 'Editar'] }
      }
    ]
  },
  { path: '**', redirectTo: 'clientes' }
];
