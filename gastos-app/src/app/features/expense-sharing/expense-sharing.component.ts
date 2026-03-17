import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase.service';
import { Expense, ExpenseSplitRule } from '../../core/models/models';

@Component({
  selector: 'app-expense-sharing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Reparto de gastos</div>
          <div class="page-subtitle">Base para dividir gastos por porcentaje y liquidarlos a cuentas separadas</div>
        </div>
      </div>

      <div *ngIf="loading" class="loading"><div class="spinner"></div></div>

      <ng-container *ngIf="!loading">
        <div class="grid-3 mb-6">
          <div class="card">
            <div class="stat-label">Gastos activos</div>
            <div class="stat-value mono">{{ expenses.length }}</div>
          </div>
          <div class="card">
            <div class="stat-label">Con reparto configurado</div>
            <div class="stat-value mono text-primary">{{ configuredExpenses }}</div>
          </div>
          <div class="card">
            <div class="stat-label">Pendientes de modelar</div>
            <div class="stat-value mono text-warning">{{ expenses.length - configuredExpenses }}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Estado actual del reparto</span>
          </div>
          <div *ngIf="expenses.length === 0" class="empty-state">
            <div class="empty-state-title">Sin gastos registrados</div>
          </div>
          <div class="table-wrapper" *ngIf="expenses.length > 0">
            <table>
              <thead>
                <tr>
                  <th>Gasto</th>
                  <th>Miembro actual</th>
                  <th>Reglas de reparto</th>
                  <th class="text-right">Monto base</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let expense of expenses">
                  <td>{{ expense.description }}</td>
                  <td>{{ expense.member_name || 'Sin asignar' }}</td>
                  <td>{{ splitSummary[expense.id || ''] || 'Sin reglas aun' }}</td>
                  <td class="text-right mono">{{ expense.amount | currency:'MXN':'symbol':'1.0-0' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class ExpenseSharingComponent implements OnInit {
  expenses: Expense[] = [];
  splitSummary: Record<string, string> = {};
  loading = true;

  get configuredExpenses() {
    return this.expenses.filter(expense => !!this.splitSummary[expense.id || '']).length;
  }

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    this.loading = true;
    try {
      const expenses = await this.supabase.getExpenses();
      this.expenses = expenses || [];

      await Promise.all(this.expenses.map(async (expense) => {
        if (!expense.id) return;
        const rules = await this.supabase.getExpenseSplitRules(expense.id);
        this.splitSummary[expense.id] = this.formatRules(rules || []);
      }));
    } catch (e) {
      console.error(e);
    }
    this.loading = false;
  }

  private formatRules(rules: ExpenseSplitRule[]) {
    if (!rules.length) return '';
    return rules.map(rule => `${rule.member_name || rule.user_name || 'Sin nombre'} ${rule.percentage}%`).join(' · ');
  }
}
