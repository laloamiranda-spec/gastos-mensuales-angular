import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { Expense, ExpenseOccurrence, Member, Category, PaymentMethod, PAYMENT_METHOD_TYPES, PaymentMethodType, MONTHS, EXPENSE_RECURRENCE_TYPES, WEEKDAY_OPTIONS } from '../../core/models/models';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="expenses-hero mb-6">
        <div>
          <div class="expenses-kicker">Centro de pagos</div>
          <div class="page-title">Pagos y gastos</div>
          <div class="page-subtitle">Consulta lo que toca cubrir, marca pagos y registra nuevos compromisos</div>
        </div>
        <div class="expenses-hero-actions">
          <div class="month-selector">
            <button (click)="prevMonth()">‹</button>
            <span class="month-label">{{ monthName }} {{ currentYear }}</span>
            <button (click)="nextMonth()">›</button>
          </div>
          <button class="btn btn-primary" (click)="openModal()">+ Nuevo gasto</button>
        </div>
      </div>

      <div class="filter-bar mb-4">
        <div class="tabs" style="margin:0;max-width:340px;">
          <button class="tab" [class.active]="activeTab==='all'" (click)="setTab('all')">Todos</button>
          <button class="tab" [class.active]="activeTab==='fixed'" (click)="setTab('fixed')">Fijos</button>
          <button class="tab" [class.active]="activeTab==='variable'" (click)="setTab('variable')">Variables</button>
        </div>
        <div class="tabs" style="margin:0;max-width:300px;">
          <button class="tab" [class.active]="paidFilter==='all'" (click)="setPaidFilter('all')">Todos</button>
          <button class="tab" [class.active]="paidFilter==='pending'" (click)="setPaidFilter('pending')">Pendientes <span class="tab-count">{{ pendingCount }}</span></button>
          <button class="tab" [class.active]="paidFilter==='paid'" (click)="setPaidFilter('paid')">Pagados <span class="tab-count">{{ paidCount }}</span></button>
        </div>
      </div>

      <div class="category-chips mb-6">
        <button class="chip" [class.active]="selectedCategory===''" (click)="selectedCategory=''; filterExpenses()">Todos</button>
        <button *ngFor="let cat of categories" class="chip" [class.active]="selectedCategory===cat.id" (click)="selectedCategory=cat.id||''; filterExpenses()">
          {{ cat.icon }} {{ cat.name }}
        </button>
      </div>

      <div class="grid-4 mb-6">
        <div class="card metric-card">
          <div class="stat-label">Total del periodo</div>
          <div class="stat-value mono text-danger">{{ totalFiltered | currency:'MXN':'symbol':'1.0-0' }}</div>
          <div class="stat-delta">{{ filteredExpenses.length }} partidas</div>
        </div>
        <div class="card metric-card">
          <div class="stat-label">Pagado</div>
          <div class="stat-value mono text-primary">{{ totalPaid | currency:'MXN':'symbol':'1.0-0' }}</div>
          <div class="stat-delta positive">{{ paidCount }} liquidado{{ paidCount!==1 ? 's' : '' }}</div>
        </div>
        <div class="card metric-card metric-card-warning">
          <div class="stat-label">Pendiente</div>
          <div class="stat-value mono text-warning">{{ totalPending | currency:'MXN':'symbol':'1.0-0' }}</div>
          <div class="stat-delta" style="color:var(--color-warning);">{{ pendingCount }} por pagar</div>
        </div>
        <div class="card metric-card">
          <div class="stat-label">Gastos fijos</div>
          <div class="stat-value mono">{{ totalFixed | currency:'MXN':'symbol':'1.0-0' }}</div>
          <div class="stat-delta">{{ fixedCount }} fijas</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Compromisos de {{ monthName }} {{ currentYear }}</span>
          <span class="badge badge-muted mono">{{ filteredExpenses.length }} registros</span>
        </div>

        <div *ngIf="loading" class="loading"><div class="spinner"></div></div>

        <div *ngIf="!loading && filteredExpenses.length===0" class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">Sin gastos para este periodo</div>
          <button class="btn btn-primary" style="margin-top:16px;" (click)="openModal()">+ Agregar gasto</button>
        </div>

        <div class="expense-mobile-list" *ngIf="!loading && filteredExpenses.length>0">
          <div class="expense-mobile-card" *ngFor="let exp of filteredExpenses">
            <div class="expense-mobile-top">
              <div>
                <div class="expense-mobile-title">{{ exp.description }}</div>
                <div class="expense-mobile-subtitle">{{ exp.category_icon || '📦' }} {{ exp.category_name || 'Otros' }} · {{ exp.member_name || 'Hogar' }}</div>
              </div>
              <div class="expense-mobile-amount mono">{{ getExpenseMonthAmount(exp) | currency:'MXN':'symbol':'1.2-2' }}</div>
            </div>
            <div class="expense-mobile-meta">
              <span class="badge" [class.badge-success]="exp.is_paid" [class.badge-warning]="!exp.is_paid">{{ exp.is_paid ? 'Pagado' : 'Pendiente' }}</span>
              <span class="badge" [class.badge-info]="exp.is_fixed" [class.badge-muted]="!exp.is_fixed">{{ exp.is_fixed ? 'Fijo' : 'Variable' }}</span>
            </div>
            <div class="expense-mobile-details">
              <div>{{ getRecurrenceSummary(exp) }}</div>
              <div *ngIf="exp.payment_method_name">Previsto: {{ exp.payment_method_name }}</div>
            </div>
            <div class="expense-mobile-actions">
              <button *ngIf="!exp.is_paid" class="btn btn-pay btn-sm" (click)="openPayModal(exp)">Pagar</button>
              <button *ngIf="exp.is_paid" class="btn btn-ghost btn-sm" (click)="unpay(exp)">Desmarcar</button>
              <button class="btn btn-secondary btn-sm" (click)="openModal(exp)">Editar</button>
              <button class="btn btn-danger btn-sm" (click)="deleteExpense(exp)">Eliminar</button>
            </div>
          </div>
        </div>

        <div class="table-wrapper desktop-expense-table" *ngIf="!loading && filteredExpenses.length>0">
          <table>
            <thead>
              <tr>
                <th>Estado</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Miembro</th>
                <th>Fecha</th>
                <th class="text-right">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let exp of filteredExpenses" [class.row-paid]="exp.is_paid" [class.row-pending]="!exp.is_paid">
                <td><span *ngIf="exp.is_paid" class="badge badge-success">Pagado</span><span *ngIf="!exp.is_paid" class="badge badge-warning">Pendiente</span></td>
                <td>{{ exp.category_icon || '📦' }} {{ exp.category_name || 'Otros' }}</td>
                <td>
                  <div style="font-weight:600;">{{ exp.description }}</div>
                  <div class="text-muted" style="font-size:11px;">{{ getRecurrenceSummary(exp) }}</div>
                </td>
                <td>{{ exp.member_name || 'Hogar' }}</td>
                <td class="mono">{{ exp.occurrence_date | date:'dd/MM/yyyy' }}</td>
                <td class="text-right mono text-danger" style="font-weight:700;">{{ getExpenseMonthAmount(exp) | currency:'MXN':'symbol':'1.2-2' }}</td>
                <td>
                  <div class="flex gap-1">
                    <button *ngIf="!exp.is_paid" class="btn btn-pay btn-sm" (click)="openPayModal(exp)">Pagar</button>
                    <button *ngIf="exp.is_paid" class="btn btn-ghost btn-sm" (click)="unpay(exp)">↩</button>
                    <button class="btn btn-ghost btn-sm btn-icon" (click)="openModal(exp)">✏️</button>
                    <button class="btn btn-danger btn-sm btn-icon" (click)="deleteExpense(exp)">🗑️</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showPayModal">
        <div class="modal" style="max-width:420px;" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">Registrar pago</span>
            <button class="btn btn-ghost btn-icon" (click)="closePayModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="pay-expense-summary">
              <span style="font-size:20px;">{{ payTarget?.category_icon || '📦' }}</span>
              <div>
                <div style="font-weight:700;font-size:15px;">{{ payTarget?.description }}</div>
                <div class="mono text-danger" style="font-size:18px;font-weight:600;">{{ getExpenseMonthAmount(payTarget) | currency:'MXN':'symbol':'1.2-2' }}</div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Fecha de pago *</label>
                <input class="form-control mono" type="date" [(ngModel)]="payForm.payment_date" />
              </div>
              <div class="form-group">
                <label class="form-label">Pagado con</label>
                <select class="form-control" [(ngModel)]="payForm.paid_payment_method_id">
                  <option value="">Sin especificar</option>
                  <option *ngFor="let pm of paymentMethods" [value]="pm.id">{{ getPaymentMethodIcon(pm.type) }} {{ pm.name }}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closePayModal()">Cancelar</button>
            <button class="btn btn-primary" (click)="confirmPay()" [disabled]="savingPay || !payForm.payment_date">{{ savingPay ? 'Guardando...' : 'Confirmar pago' }}</button>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showModal">
        <div class="modal" style="max-width:680px;" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">{{ editing ? 'Editar gasto' : 'Nuevo gasto' }}</span>
            <button class="btn btn-ghost btn-icon" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Categoría *</label>
                <select class="form-control" [(ngModel)]="form.category_id">
                  <option value="">Seleccionar...</option>
                  <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.icon }} {{ cat.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Miembro</label>
                <select class="form-control" [(ngModel)]="form.member_id">
                  <option value="">Sin asignar</option>
                  <option *ngFor="let m of members" [value]="m.id">{{ m.name }}</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Descripción *</label>
              <input class="form-control" [(ngModel)]="form.description" placeholder="Ej. Netflix, renta, seguro, limpieza..." />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ form.recurrence_type === 'semanal' ? 'Monto por ocurrencia *' : 'Monto mensual *' }}</label>
                <input class="form-control mono" type="number" [(ngModel)]="form.amount" placeholder="0.00" step="0.01" />
              </div>
              <div class="form-group">
                <label class="form-label">Meses a pagar</label>
                <input class="form-control mono" type="number" [(ngModel)]="form.months_duration" placeholder="0 = indefinido" min="0" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Periodicidad</label>
                <select class="form-control" [(ngModel)]="form.recurrence_type">
                  <option *ngFor="let option of recurrenceTypes" [value]="option.value">{{ option.label }}</option>
                </select>
              </div>
              <div class="form-group" *ngIf="form.recurrence_type === 'semanal'">
                <label class="form-label">Día de la semana</label>
                <select class="form-control" [(ngModel)]="form.weekly_day">
                  <option *ngFor="let day of weekdayOptions" [value]="day.value">{{ day.label }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Mes inicio *</label>
                <select class="form-control" [(ngModel)]="form.start_month">
                  <option *ngFor="let m of months; let i=index" [value]="i+1">{{ m }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Año inicio *</label>
                <input class="form-control mono" type="number" [(ngModel)]="form.start_year" min="2020" max="2035" />
              </div>
            </div>
            <div class="section-divider">Pago</div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Forma de pago prevista</label>
                <select class="form-control" [(ngModel)]="form.payment_method_id">
                  <option value="">Sin asignar</option>
                  <option *ngFor="let pm of paymentMethods" [value]="pm.id">{{ getPaymentMethodIcon(pm.type) }} {{ pm.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Fecha de pago</label>
                <input class="form-control mono" type="date" [(ngModel)]="form.payment_date" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Estado de pago</label>
                <div class="flex gap-2">
                  <button class="btn" style="flex:1;" [class.btn-primary]="!form.is_paid" [class.btn-secondary]="form.is_paid" (click)="form.is_paid=false">Pendiente</button>
                  <button class="btn" style="flex:1;" [class.btn-primary]="form.is_paid" [class.btn-secondary]="!form.is_paid" (click)="form.is_paid=true">Pagado</button>
                </div>
              </div>
              <div class="form-group" *ngIf="form.is_paid">
                <label class="form-label">Pagado con</label>
                <select class="form-control" [(ngModel)]="form.paid_payment_method_id">
                  <option value="">Sin especificar</option>
                  <option *ngFor="let pm of paymentMethods" [value]="pm.id">{{ getPaymentMethodIcon(pm.type) }} {{ pm.name }}</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving || !form.description || !form.amount">{{ saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Agregar gasto') }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .expenses-hero {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      flex-wrap: wrap;
      padding: 22px 24px;
      border-radius: 24px;
      border: 1px solid var(--color-border);
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,251,247,0.94));
      box-shadow: var(--shadow-card);
    }
    .expenses-kicker {
      display: inline-flex;
      margin-bottom: 10px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(5,150,105,0.10);
      color: var(--color-primary);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .expenses-hero-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }
    .filter-bar {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
    .category-chips {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .chip {
      padding: 5px 12px;
      background: var(--color-surface);
      border: 1.5px solid var(--color-border);
      border-radius: 100px;
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition);
      box-shadow: var(--shadow-card);
    }
    .chip.active {
      background: var(--color-primary-glow);
      border-color: var(--color-primary);
      color: var(--color-primary);
      font-weight: 600;
    }
    .tab-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 100px;
      font-size: 10px;
      font-weight: 700;
      background: rgba(0,0,0,0.12);
      margin-left: 2px;
    }
    .metric-card { min-height: 132px; }
    .metric-card-warning {
      border-color: rgba(217,119,6,0.3);
      background: rgba(217,119,6,0.04);
    }
    .row-paid td:first-child { border-left: 3px solid var(--color-primary); }
    .row-pending td:first-child { border-left: 3px solid var(--color-warning); }
    .btn-pay {
      background: rgba(5,150,105,0.1);
      color: var(--color-primary);
      border: 1.5px solid rgba(5,150,105,0.25);
      font-weight: 600;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: var(--radius-md);
    }
    .pay-expense-summary {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      margin-bottom: 20px;
    }
    .section-divider {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-text-muted);
      margin: 8px 0 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-divider::before,
    .section-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--color-border);
    }
    .expense-mobile-list {
      display: none;
      flex-direction: column;
      gap: 12px;
    }
    .expense-mobile-card {
      padding: 16px;
      border-radius: 20px;
      background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,251,247,0.94));
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-card);
    }
    .expense-mobile-top {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: flex-start;
    }
    .expense-mobile-title {
      font-weight: 700;
      color: var(--color-accent);
      font-size: 15px;
    }
    .expense-mobile-subtitle {
      color: var(--color-text-muted);
      font-size: 12px;
      margin-top: 4px;
      line-height: 1.4;
    }
    .expense-mobile-amount {
      color: var(--color-danger);
      font-size: 15px;
      font-weight: 700;
      text-align: right;
    }
    .expense-mobile-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .expense-mobile-details {
      display: grid;
      gap: 6px;
      margin-top: 12px;
      color: var(--color-text-muted);
      font-size: 12px;
    }
    .expense-mobile-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }
    .expense-mobile-actions .btn { width: 100%; }
    @media (max-width: 900px) {
      .expenses-hero-actions {
        width: 100%;
      }
      .expenses-hero-actions .month-selector,
      .expenses-hero-actions .btn {
        width: 100%;
      }
      .expense-mobile-list {
        display: flex;
      }
      .desktop-expense-table {
        display: none;
      }
    }
  `]
})
export class ExpensesComponent implements OnInit {
  currentMonth = new Date().getMonth() + 1;
  currentYear = new Date().getFullYear();

  allExpenses: ExpenseOccurrence[] = [];
  filteredExpenses: ExpenseOccurrence[] = [];
  members: Member[] = [];
  categories: Category[] = [];
  paymentMethods: PaymentMethod[] = [];

  loading = true;
  showModal = false;
  editing = false;
  saving = false;
  editId = '';

  activeTab = 'all';
  paidFilter = 'all';
  selectedCategory = '';
  months = MONTHS;
  recurrenceTypes = EXPENSE_RECURRENCE_TYPES;
  weekdayOptions = WEEKDAY_OPTIONS;

  showPayModal = false;
  savingPay = false;
  payTarget?: ExpenseOccurrence;
  payForm = { payment_date: this.today(), paid_payment_method_id: '' };

  form: Expense = this.emptyForm();

  get monthName() { return MONTHS[this.currentMonth - 1]; }
  get totalFiltered() { return this.filteredExpenses.reduce((sum, expense) => sum + this.getExpenseMonthAmount(expense), 0); }
  get totalFixed() { return this.filteredExpenses.filter(expense => expense.is_fixed).reduce((sum, expense) => sum + this.getExpenseMonthAmount(expense), 0); }
  get fixedCount() { return this.filteredExpenses.filter(expense => expense.is_fixed).length; }
  get paidCount() { return this.allExpenses.filter(expense => expense.is_paid).length; }
  get pendingCount() { return this.allExpenses.filter(expense => !expense.is_paid).length; }
  get totalPaid() { return this.allExpenses.filter(expense => expense.is_paid).reduce((sum, expense) => sum + this.getExpenseMonthAmount(expense), 0); }
  get totalPending() { return this.allExpenses.filter(expense => !expense.is_paid).reduce((sum, expense) => sum + this.getExpenseMonthAmount(expense), 0); }

  constructor(private supabase: SupabaseService) {}

  ngOnInit() {
    this.loadCategories();
    this.loadMembers();
    this.loadPaymentMethods();
    this.loadExpenses();
  }

  async loadCategories() { this.categories = await this.supabase.getCategories() || []; }
  async loadMembers() { this.members = await this.supabase.getMembers() || []; }
  async loadPaymentMethods() { this.paymentMethods = await this.supabase.getPaymentMethods() || []; }

  async loadExpenses() {
    this.loading = true;
    try {
      this.allExpenses = await this.supabase.getExpenseOccurrences(this.currentYear, this.currentMonth) || [];
    } catch (error) {
      console.error(error);
    }
    this.filterExpenses();
    this.loading = false;
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.filterExpenses();
  }

  setPaidFilter(filterValue: string) {
    this.paidFilter = filterValue;
    this.filterExpenses();
  }

  filterExpenses() {
    let rows = [...this.allExpenses];
    if (this.activeTab === 'fixed') rows = rows.filter(expense => expense.is_fixed);
    if (this.activeTab === 'variable') rows = rows.filter(expense => !expense.is_fixed);
    if (this.paidFilter === 'paid') rows = rows.filter(expense => expense.is_paid);
    if (this.paidFilter === 'pending') rows = rows.filter(expense => !expense.is_paid);
    if (this.selectedCategory) rows = rows.filter(expense => expense.category_id === this.selectedCategory);
    this.filteredExpenses = rows;
  }

  prevMonth() {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.loadExpenses();
  }

  nextMonth() {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.loadExpenses();
  }

  openModal(exp?: ExpenseOccurrence | Expense) {
    this.editing = !!exp;
    this.editId = (exp as ExpenseOccurrence)?.expense_id || exp?.id || '';
    this.form = exp
      ? {
          ...exp,
          description: exp.description || '',
          amount: Number(exp.amount || 0),
          months_duration: exp.months_duration ?? 0,
          start_month: exp.start_month || this.currentMonth,
          start_year: exp.start_year || this.currentYear,
          is_fixed: exp.is_fixed ?? true,
          recurrence_type: exp.recurrence_type || 'mensual',
          weekly_day: exp.weekly_day ?? 1,
          is_active: true,
        }
      : this.emptyForm();
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  async save() {
    if (!this.form.description || !this.form.amount) return;
    this.saving = true;
    try {
      const payload: any = {
        category_id: this.form.category_id || null,
        member_id: this.form.member_id || null,
        payment_method_id: this.form.payment_method_id || null,
        description: this.form.description,
        amount: this.form.amount,
        recurrence_type: this.form.recurrence_type || 'mensual',
        weekly_day: this.form.recurrence_type === 'semanal' ? this.form.weekly_day ?? 1 : null,
        months_duration: this.form.months_duration,
        start_month: this.form.start_month,
        start_year: this.form.start_year,
        is_fixed: this.form.is_fixed,
        is_active: true,
        is_paid: this.form.is_paid ?? false,
        payment_date: this.form.payment_date || null,
        paid_payment_method_id: this.form.paid_payment_method_id || null,
        notes: this.form.notes || null,
      };
      if (this.editing) await this.supabase.updateExpense(this.editId, payload);
      else await this.supabase.createExpense(payload);
      await this.loadExpenses();
      this.closeModal();
    } catch (error) {
      console.error(error);
    }
    this.saving = false;
  }

  async deleteExpense(exp: ExpenseOccurrence | Expense) {
    if (!confirm(`¿Eliminar "${exp.description}"?`)) return;
    const expenseId = (exp as ExpenseOccurrence).expense_id || exp.id!;
    try {
      await this.supabase.deleteExpense(expenseId);
      await this.loadExpenses();
    } catch (error) {
      console.error(error);
    }
  }

  openPayModal(exp: ExpenseOccurrence) {
    this.payTarget = exp;
    this.payForm = {
      payment_date: this.today(),
      paid_payment_method_id: exp.payment_method_id || '',
    };
    this.showPayModal = true;
  }

  closePayModal() {
    this.showPayModal = false;
    this.payTarget = undefined;
  }

  async confirmPay() {
    if (!this.payTarget || !this.payForm.payment_date) return;
    this.savingPay = true;
    try {
      await this.supabase.payExpenseOccurrence(this.payTarget.id!, this.payForm.payment_date, this.payForm.paid_payment_method_id || null);
      await this.loadExpenses();
      this.closePayModal();
    } catch (error) {
      console.error(error);
    }
    this.savingPay = false;
  }

  async unpay(exp: ExpenseOccurrence) {
    if (!confirm(`¿Desmarcar el pago de "${exp.description}"?`)) return;
    try {
      await this.supabase.unpayExpenseOccurrence(exp.id!);
      await this.loadExpenses();
    } catch (error) {
      console.error(error);
    }
  }

  getExpenseMonthAmount(exp?: Expense | ExpenseOccurrence) {
    if (!exp) return 0;
    if ((exp as ExpenseOccurrence).occurrence_date) return Number(exp.amount || 0);
    return this.supabase.getExpenseAmountForMonth(exp, this.currentMonth, this.currentYear);
  }

  getRecurrenceSummary(exp?: Expense | ExpenseOccurrence) {
    if (!exp) return 'Mensual';
    if ((exp as ExpenseOccurrence).occurrence_date) {
      return `Programado: ${this.formatDate((exp as ExpenseOccurrence).occurrence_date!)}`;
    }
    if (exp.recurrence_type === 'semanal') {
      const label = this.weekdayOptions.find(day => day.value === (exp.weekly_day ?? 1))?.label || 'Día no definido';
      const occurrences = this.supabase.countWeekdayOccurrencesInMonth(this.currentYear, this.currentMonth, exp.weekly_day ?? 1);
      return `${label} · ${occurrences} ${occurrences === 1 ? 'vez' : 'veces'} este mes`;
    }
    return 'Mensual';
  }

  getPaymentMethodIcon(type?: PaymentMethodType): string {
    return PAYMENT_METHOD_TYPES.find(item => item.value === type)?.icon || '💳';
  }

  private emptyForm(): Expense {
    return {
      description: '',
      amount: 0,
      recurrence_type: 'mensual',
      weekly_day: 1,
      months_duration: 0,
      start_month: this.currentMonth,
      start_year: this.currentYear,
      is_fixed: true,
      is_active: true,
      is_paid: false,
      category_id: '',
      member_id: '',
      payment_method_id: '',
      payment_date: '',
      paid_payment_method_id: '',
    };
  }

  private formatDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  private today(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
