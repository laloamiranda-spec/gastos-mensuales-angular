import { Routes } from '@angular/router';
import { authGuard } from './core/services/auth.guard';
import { platformAdminGuard } from './core/services/platform-admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/welcome/welcome.component').then(m => m.WelcomeComponent),
  },
  {
    path: 'acceso',
    loadComponent: () => import('./features/welcome/welcome.component').then(m => m.WelcomeComponent),
  },
  {
    path: 'crear-cuenta',
    loadComponent: () => import('./features/welcome/welcome.component').then(m => m.WelcomeComponent),
  },
  {
    path: 'inicio',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'pagos-y-gastos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/expenses/expenses.component').then(m => m.ExpensesComponent),
  },
  {
    path: 'tu-dinero',
    canActivate: [authGuard],
    loadComponent: () => import('./features/money-hub/money-hub.component').then(m => m.MoneyHubComponent),
    children: [
      { path: '', redirectTo: 'movimientos', pathMatch: 'full' },
      {
        path: 'movimientos',
        loadComponent: () => import('./features/bank/bank.component').then(m => m.BankComponent),
      },
      {
        path: 'tarjetas',
        loadComponent: () => import('./features/payment-methods/payment-methods.component').then(m => m.PaymentMethodsComponent),
      },
    ],
  },
  {
    path: 'plan-mensual',
    canActivate: [authGuard],
    loadComponent: () => import('./features/budget/budget.component').then(m => m.BudgetComponent),
  },
  {
    path: 'personas',
    canActivate: [authGuard],
    loadComponent: () => import('./features/members/members.component').then(m => m.MembersComponent),
  },
  {
    path: 'hogar-y-accesos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/households/households.component').then(m => m.HouseholdsComponent),
  },
  {
    path: 'gastos-compartidos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/expense-sharing/expense-sharing.component').then(m => m.ExpenseSharingComponent),
  },
  {
    path: 'resumenes',
    canActivate: [authGuard],
    loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
  },
  {
    path: 'administracion',
    canActivate: [authGuard, platformAdminGuard],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'seguridad',
    canActivate: [authGuard],
    loadComponent: () => import('./features/security/security.component').then(m => m.SecurityComponent),
  },

  // Compatibilidad con rutas anteriores
  { path: 'dashboard', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'gastos', redirectTo: 'pagos-y-gastos', pathMatch: 'full' },
  { path: 'bancos', redirectTo: 'tu-dinero/movimientos', pathMatch: 'full' },
  { path: 'ingresos', redirectTo: 'tu-dinero/movimientos', pathMatch: 'full' },
  { path: 'tu-dinero/cuentas', redirectTo: 'tu-dinero/movimientos', pathMatch: 'full' },
  { path: 'tu-dinero/entradas', redirectTo: 'tu-dinero/movimientos', pathMatch: 'full' },
  { path: 'formas-pago', redirectTo: 'tu-dinero/tarjetas', pathMatch: 'full' },
  { path: 'presupuesto', redirectTo: 'plan-mensual', pathMatch: 'full' },
  { path: 'miembros', redirectTo: 'personas', pathMatch: 'full' },
  { path: 'hogares', redirectTo: 'hogar-y-accesos', pathMatch: 'full' },
  { path: 'reparto-gastos', redirectTo: 'gastos-compartidos', pathMatch: 'full' },
  { path: 'reportes', redirectTo: 'resumenes', pathMatch: 'full' },
  { path: 'admin', redirectTo: 'administracion', pathMatch: 'full' },

  { path: '**', redirectTo: 'inicio' },
];
