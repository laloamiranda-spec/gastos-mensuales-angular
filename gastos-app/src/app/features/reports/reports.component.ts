import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { SupabaseService } from '../../core/services/supabase.service';
import { Expense, ExpenseOccurrence, Member, MONTHS, PAYMENT_METHOD_TYPES, PaymentMethod, PaymentMethodType } from '../../core/models/models';

Chart.register(...registerables);

interface MonthRow {
  month: number;
  year: number;
  label: string;
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
  topCategory: string;
}

interface PaymentSummaryRow {
  month: number;
  year: number;
  dueDate: string | null;
  methodId: string;
  methodName: string;
  methodType?: PaymentMethodType;
  methodLastFour?: string;
  methodBank?: string;
  methodColor?: string;
  total: number;
  count: number;
  pendingTotal: number;
  pendingCount: number;
  creditTotal: number;
  creditCount: number;
}

interface PaymentObligation {
  dueDate: string | null;
  methodId: string;
  methodName: string;
  methodType?: PaymentMethodType;
  methodLastFour?: string;
  methodBank?: string;
  methodColor?: string;
  amount: number;
  source: 'pending' | 'credit';
}

type ReportView = 'payments' | 'annual' | 'categories';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Resumenes</div>
          <div class="page-subtitle">Tendencias, pagos pendientes y vista anual de tu dinero</div>
        </div>
        <div class="flex gap-2" style="flex-wrap:wrap;">
          <select class="form-control" [(ngModel)]="selectedMemberId" (change)="loadData()" style="width:160px;">
            <option value="">Todos los miembros</option>
            <option *ngFor="let m of members" [value]="m.id">{{ m.name }}</option>
          </select>
          <select class="form-control" [(ngModel)]="selectedYear" (change)="loadData()" style="width:120px;">
            <option *ngFor="let y of years" [value]="y">{{ y }}</option>
          </select>
          <button class="btn btn-secondary" (click)="exportExcel()">Excel</button>
          <button class="btn btn-secondary" (click)="exportPDF()">PDF</button>
        </div>
      </div>

      <div *ngIf="loading" class="loading"><div class="spinner"></div> Generando reporte...</div>

      <ng-container *ngIf="!loading">
        <div class="tabs mb-6" style="max-width:720px;">
          <button class="tab" [class.active]="reportView==='payments'" (click)="setReportView('payments')">Pagos por tarjeta</button>
          <button class="tab" [class.active]="reportView==='annual'" (click)="setReportView('annual')">Proyeccion anual</button>
          <button class="tab" [class.active]="reportView==='categories'" (click)="setReportView('categories')">Categorias</button>
        </div>

        <div class="grid-4 mb-6" *ngIf="reportView === 'annual'">
          <div class="card">
            <div class="stat-label">Ingresos anuales</div>
            <div class="stat-value mono text-primary">{{ annualIncome | currency:'MXN':'symbol':'1.0-0' }}</div>
            <div class="stat-delta">{{ selectedMemberId ? selectedMemberName : 'Todos' }} · {{ selectedYear }}</div>
          </div>
          <div class="card">
            <div class="stat-label">Gastos anuales</div>
            <div class="stat-value mono text-danger">{{ annualExpenses | currency:'MXN':'symbol':'1.0-0' }}</div>
            <div class="stat-delta negative">{{ annualExpenseRatio | number:'1.0-0' }}% del ingreso</div>
          </div>
          <div class="card">
            <div class="stat-label">Ahorro proyectado</div>
            <div class="stat-value mono" [class.text-primary]="annualBalance >= 0" [class.text-danger]="annualBalance < 0">
              {{ annualBalance | currency:'MXN':'symbol':'1.0-0' }}
            </div>
            <div class="stat-delta" [class.positive]="annualBalance >= 0" [class.negative]="annualBalance < 0">
              {{ annualBalance >= 0 ? 'Superavit anual' : 'Deficit anual' }}
            </div>
          </div>
          <div class="card">
            <div class="stat-label">Tasa de ahorro</div>
            <div class="stat-value mono"
                 [class.text-primary]="annualSavingsRate >= 20"
                 [class.text-warning]="annualSavingsRate > 0 && annualSavingsRate < 20"
                 [class.text-danger]="annualSavingsRate <= 0">
              {{ annualSavingsRate | number:'1.1-1' }}%
            </div>
            <div class="stat-delta">Promedio anual</div>
          </div>
        </div>

        <div class="grid-3 mb-6" *ngIf="reportView === 'payments'">
          <div class="card">
            <div class="stat-label">Tarjetas por liquidar</div>
            <div class="stat-value mono text-danger">{{ annualCreditDebt | currency:'MXN':'symbol':'1.0-0' }}</div>
            <div class="stat-delta">{{ annualCreditDebtCount }} compra{{ annualCreditDebtCount !== 1 ? 's' : '' }} en tarjeta</div>
          </div>
          <div class="card">
            <div class="stat-label">Pendientes por pagar</div>
            <div class="stat-value mono text-warning">{{ annualPendingPaymentTotal | currency:'MXN':'symbol':'1.0-0' }}</div>
            <div class="stat-delta">{{ annualPendingPaymentCount }} gasto{{ annualPendingPaymentCount !== 1 ? 's' : '' }} pendiente{{ annualPendingPaymentCount !== 1 ? 's' : '' }}</div>
          </div>
          <div class="card">
            <div class="stat-label">Proximo pago</div>
            <div class="stat-value mono" [class.text-primary]="!!nextUpcomingPayment" [class.text-muted]="!nextUpcomingPayment">
              {{ nextUpcomingPayment ? (nextUpcomingPayment.total | currency:'MXN':'symbol':'1.0-0') : '—' }}
            </div>
            <div class="stat-delta" *ngIf="nextUpcomingPayment">
              {{ nextUpcomingPayment.methodName }} · {{ formatDueDateLabel(nextUpcomingPayment) }}
            </div>
            <div class="stat-delta" *ngIf="!nextUpcomingPayment">Sin pagos programados</div>
          </div>
        </div>

        <div class="grid-2 mb-6" *ngIf="reportView === 'annual'">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Ingresos vs gastos por mes</span>
            </div>
            <canvas #barChart style="max-height:280px;"></canvas>
          </div>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Balance mensual</span>
            </div>
            <canvas #balanceChart style="max-height:280px;"></canvas>
          </div>
        </div>

        <div class="card mb-6" *ngIf="reportView === 'annual'">
          <div class="card-header">
            <span class="card-title">Proyeccion mensual {{ selectedYear }}{{ selectedMemberId ? ' - ' + selectedMemberName : '' }}</span>
            <span class="badge badge-muted mono">12 meses</span>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th class="text-right">Ingresos</th>
                  <th class="text-right">Gastos</th>
                  <th class="text-right">Balance</th>
                  <th class="text-right">Ahorro %</th>
                  <th>Mayor gasto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of monthRows" [class.current-month]="isCurrentMonth(row)">
                  <td style="font-weight:600;">{{ row.label }}</td>
                  <td class="text-right mono text-primary">{{ row.income | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono text-danger">{{ row.expenses | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono" [class.text-primary]="row.balance >= 0" [class.text-danger]="row.balance < 0">
                    {{ row.balance | currency:'MXN':'symbol':'1.0-0' }}
                  </td>
                  <td class="text-right mono">
                    <span [class.text-primary]="row.savingsRate >= 20"
                          [class.text-warning]="row.savingsRate > 0 && row.savingsRate < 20"
                          [class.text-danger]="row.savingsRate <= 0">
                      {{ row.savingsRate | number:'1.1-1' }}%
                    </span>
                  </td>
                  <td style="font-size:12px;" class="text-muted">{{ row.topCategory || '—' }}</td>
                  <td>
                    <span class="badge"
                          [class.badge-success]="row.balance >= 0 && row.savingsRate >= 20"
                          [class.badge-warning]="row.balance >= 0 && row.savingsRate < 20 && row.savingsRate >= 0"
                          [class.badge-danger]="row.balance < 0">
                      {{ row.balance < 0 ? 'Deficit' : row.savingsRate >= 20 ? 'Optimo' : 'Ajustado' }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="background:var(--color-surface-2);font-weight:700;">
                  <td style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-text-muted);">TOTAL</td>
                  <td class="text-right mono text-primary" style="padding:12px 16px;">{{ annualIncome | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono text-danger" style="padding:12px 16px;">{{ annualExpenses | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono" style="padding:12px 16px;" [class.text-primary]="annualBalance >= 0" [class.text-danger]="annualBalance < 0">
                    {{ annualBalance | currency:'MXN':'symbol':'1.0-0' }}
                  </td>
                  <td class="text-right mono" style="padding:12px 16px;">{{ annualSavingsRate | number:'1.1-1' }}%</td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="card mb-6" *ngIf="reportView === 'payments'">
          <div class="card-header">
            <span class="card-title">Resumen de pagos por forma de pago</span>
            <div class="flex gap-2" style="flex-wrap:wrap;align-items:center;">
              <select class="form-control" [(ngModel)]="selectedPaymentMonth" (ngModelChange)="updatePaymentFilters()" style="width:160px;">
                <option *ngFor="let month of paymentMonthOptions" [ngValue]="month.value">{{ month.label }}</option>
              </select>
              <select class="form-control" [(ngModel)]="selectedPaymentMethodId" (ngModelChange)="updatePaymentFilters()" style="width:220px;">
                <option value="">Todas las formas de pago</option>
                <option *ngFor="let pm of paymentMethods" [value]="pm.id">{{ pm.name }}</option>
              </select>
              <span class="badge badge-muted mono">{{ filteredPaymentSummaryRows.length }} fechas</span>
            </div>
          </div>
          <div class="grid-3 mb-4" *ngIf="paymentSummaryRows.length > 0">
            <div class="card">
              <div class="stat-label">Liquidar en {{ selectedPaymentMonthName }}</div>
              <div class="stat-value mono text-danger">{{ filteredPaymentTotal | currency:'MXN':'symbol':'1.0-0' }}</div>
              <div class="stat-delta">{{ filteredPaymentCount }} fecha{{ filteredPaymentCount !== 1 ? 's' : '' }} programada{{ filteredPaymentCount !== 1 ? 's' : '' }}</div>
            </div>
            <div class="card">
              <div class="stat-label">Compras en tarjeta</div>
              <div class="stat-value mono text-danger">{{ filteredCreditDebt | currency:'MXN':'symbol':'1.0-0' }}</div>
              <div class="stat-delta">{{ filteredCreditDebtCount }} compra{{ filteredCreditDebtCount !== 1 ? 's' : '' }} por liquidar</div>
            </div>
            <div class="card">
              <div class="stat-label">Pendiente normal</div>
              <div class="stat-value mono text-warning">{{ filteredPendingPaymentTotal | currency:'MXN':'symbol':'1.0-0' }}</div>
              <div class="stat-delta" *ngIf="nextFilteredPayment">
                Siguiente: {{ nextFilteredPayment.methodName }} · {{ formatDueDateLabel(nextFilteredPayment) }}
              </div>
              <div class="stat-delta" *ngIf="!nextFilteredPayment">Sin pagos dentro del filtro</div>
            </div>
          </div>
          <div *ngIf="filteredPaymentSummaryRows.length === 0" class="empty-state">
            <div class="empty-state-icon">💳</div>
            <div class="empty-state-title">Sin pagos para ese filtro</div>
            <div class="empty-state-sub">Prueba con otro mes o selecciona otra tarjeta para revisar lo que toca liquidar.</div>
          </div>
          <div class="table-wrapper" *ngIf="filteredPaymentSummaryRows.length > 0">
            <table>
              <thead>
                <tr>
                  <th>Fecha objetivo</th>
                  <th>Forma de pago</th>
                  <th>Detalle</th>
                  <th class="text-right">Pendiente</th>
                  <th class="text-right">Tarjeta</th>
                  <th class="text-right">Total</th>
                  <th class="text-right">Gastos</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of filteredPaymentSummaryRows">
                  <td class="mono" style="white-space:nowrap;">{{ formatDueDateLabel(row) }}</td>
                  <td>
                    <div class="flex items-center gap-2">
                      <span style="font-size:16px;">{{ getPaymentMethodIcon(row.methodType) }}</span>
                      <div>
                        <div style="font-weight:600;">{{ row.methodName }}</div>
                        <div class="text-muted" style="font-size:12px;">
                          {{ getPaymentMethodTypeLabel(row.methodType) }}
                          <span *ngIf="row.methodLastFour" class="mono"> ···· {{ row.methodLastFour }}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="text-muted" style="font-size:12px;">{{ describePaymentRow(row) }}</td>
                  <td class="text-right mono text-warning">{{ row.pendingTotal | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono text-danger">{{ row.creditTotal | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono" [class.text-danger]="row.creditTotal > 0" [class.text-warning]="row.creditTotal === 0 && row.pendingTotal > 0">
                    {{ row.total | currency:'MXN':'symbol':'1.0-0' }}
                  </td>
                  <td class="text-right mono">{{ row.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card" *ngIf="reportView === 'categories'">
          <div class="card-header">
            <span class="card-title">Analisis anual por categoria</span>
          </div>
          <div *ngIf="annualCategoryTotals.length === 0" class="empty-state">
            <div class="empty-state-icon">📂</div>
            <div class="empty-state-title">Sin datos de categorias</div>
          </div>
          <div class="table-wrapper" *ngIf="annualCategoryTotals.length > 0">
            <table>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th class="text-right">Total anual</th>
                  <th class="text-right">Promedio mes</th>
                  <th class="text-right">% del gasto</th>
                  <th style="width:200px;">Distribucion</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let cat of annualCategoryTotals">
                  <td>
                    <div class="flex items-center gap-2">
                      <span style="font-size:16px;">{{ cat.icon }}</span>
                      <span>{{ cat.name }}</span>
                    </div>
                  </td>
                  <td class="text-right mono">{{ cat.total | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono text-muted">{{ cat.monthly | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono">{{ cat.pct | number:'1.1-1' }}%</td>
                  <td>
                    <div class="progress-bar" style="margin-top:0;">
                      <div class="progress-fill" [style.background]="cat.color" [style.width.%]="cat.pct"></div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .current-month td { background: rgba(16,185,129,0.05); }
    .current-month td:first-child { border-left: 2px solid var(--color-primary); }
  `]
})
export class ReportsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('barChart') barChartRef!: ElementRef;
  @ViewChild('balanceChart') balanceChartRef!: ElementRef;

  selectedYear = new Date().getFullYear();
  selectedMemberId = '';
  selectedPaymentMonth = new Date().getMonth() + 1;
  selectedPaymentMethodId = '';
  reportView: ReportView = 'payments';
  years = [2023, 2024, 2025, 2026, 2027];
  loading = true;
  members: Member[] = [];
  paymentMethods: PaymentMethod[] = [];
  monthRows: MonthRow[] = [];
  annualCategoryTotals: any[] = [];
  paymentSummaryRows: PaymentSummaryRow[] = [];
  filteredPaymentSummaryRows: PaymentSummaryRow[] = [];
  filteredPaymentTotal = 0;
  filteredPaymentCount = 0;
  filteredCreditDebt = 0;
  filteredCreditDebtCount = 0;
  filteredPendingPaymentTotal = 0;
  nextFilteredPayment?: PaymentSummaryRow;

  private barChartInst?: Chart;
  private balanceChartInst?: Chart;

  constructor(private supabase: SupabaseService) {}

  get selectedMemberName() {
    return this.members.find(m => m.id === this.selectedMemberId)?.name || '';
  }

  get paymentMonthOptions() {
    return MONTHS.map((label, idx) => ({ label, value: idx + 1 }));
  }

  get selectedPaymentMonthName() {
    return MONTHS[this.selectedPaymentMonth - 1] || 'Mes';
  }

  get annualIncome() {
    return this.monthRows.reduce((sum, row) => sum + row.income, 0);
  }

  get annualExpenses() {
    return this.monthRows.reduce((sum, row) => sum + row.expenses, 0);
  }

  get annualBalance() {
    return this.annualIncome - this.annualExpenses;
  }

  get annualExpenseRatio() {
    return this.annualIncome > 0 ? this.annualExpenses / this.annualIncome * 100 : 0;
  }

  get annualSavingsRate() {
    return this.annualIncome > 0 ? this.annualBalance / this.annualIncome * 100 : 0;
  }

  get annualCreditDebt() {
    return this.paymentSummaryRows.reduce((sum, row) => sum + row.creditTotal, 0);
  }

  get annualCreditDebtCount() {
    return this.paymentSummaryRows.reduce((sum, row) => sum + row.creditCount, 0);
  }

  get annualPendingPaymentTotal() {
    return this.paymentSummaryRows.reduce((sum, row) => sum + row.pendingTotal, 0);
  }

  get annualPendingPaymentCount() {
    return this.paymentSummaryRows.reduce((sum, row) => sum + row.pendingCount, 0);
  }

  get nextUpcomingPayment(): PaymentSummaryRow | undefined {
    const today = this.todayIso();
    return this.paymentSummaryRows.find(row => row.dueDate !== null && row.dueDate >= today)
      || this.paymentSummaryRows.find(row => row.dueDate === null)
      || this.paymentSummaryRows[0];
  }

  ngOnInit() {
    this.supabase.getMembers().then(members => this.members = members || []);
    this.supabase.getPaymentMethods().then(methods => this.paymentMethods = methods || []);
    this.loadData();
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.barChartInst?.destroy();
    this.balanceChartInst?.destroy();
  }

  isCurrentMonth(row: MonthRow) {
    const now = new Date();
    return row.month === now.getMonth() + 1 && row.year === now.getFullYear();
  }

  setReportView(view: ReportView) {
    if (this.reportView === view) return;
    this.reportView = view;
    this.loadData();
  }

  async loadData() {
    this.loading = true;

    try {
      const memberId = this.selectedMemberId || undefined;
      this.barChartInst?.destroy();
      this.balanceChartInst?.destroy();

      if (this.reportView === 'annual') {
        const [yearIncome, yearOccurrences] = await Promise.all([
          this.supabase.getIncomingMovementsForYear(this.selectedYear),
          this.supabase.getExpenseOccurrencesForYear(this.selectedYear, memberId),
        ]);
        const incomeByMonth = Array.from({ length: 12 }, (_, idx) =>
          (yearIncome || []).filter((item: any) => item.year === this.selectedYear && item.month === idx + 1)
        );
        const expensesByMonth = this.buildExpensesByMonth(yearOccurrences || []);

        this.monthRows = Array.from({ length: 12 }, (_, idx) => {
          const income = incomeByMonth[idx].reduce((sum: number, item: any) => sum + item.amount, 0);
          const expenses = expensesByMonth[idx].reduce((sum: number, item: any) => sum + item.amount, 0);
          const balance = income - expenses;
          const savingsRate = income > 0 ? balance / income * 100 : 0;

          const categoryTotals = new Map<string, number>();
          for (const expense of expensesByMonth[idx]) {
            const key = `${expense.category_icon || ''} ${expense.category_name || 'Otros'}`;
            categoryTotals.set(key, (categoryTotals.get(key) || 0) + expense.amount);
          }
          const topCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0];

          return {
            month: idx + 1,
            year: this.selectedYear,
            label: MONTHS[idx],
            income,
            expenses,
            balance,
            savingsRate,
            topCategory: topCategory ? topCategory[0] : '',
          };
        });

        this.loading = false;
        setTimeout(() => this.initCharts(), 100);
        return;
      }

      if (this.reportView === 'categories') {
        const yearOccurrences = await this.supabase.getExpenseOccurrencesForYear(this.selectedYear, memberId);
        const expensesByMonth = this.buildExpensesByMonth(yearOccurrences || []);
        this.annualCategoryTotals = this.buildAnnualCategoryTotals(expensesByMonth);
        this.loading = false;
        return;
      }

      if (this.paymentMethods.length === 0) {
        this.paymentMethods = await this.supabase.getPaymentMethods() || [];
      }

      const yearOccurrences = await this.supabase.getExpenseOccurrencesForYear(this.selectedYear, memberId);
      const expensesByMonth = this.buildExpensesByMonth(yearOccurrences || []);
      this.paymentSummaryRows = this.buildPaymentSummaryRows(expensesByMonth);
      this.updatePaymentFilters();

      this.loading = false;
    } catch (error) {
      console.error(error);
      this.loading = false;
    }
  }

  initCharts() {
    this.initBarChart();
    this.initBalanceChart();
  }

  initBarChart() {
    if (!this.barChartRef) return;

    this.barChartInst?.destroy();
    this.barChartInst = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: MONTHS.map(month => month.slice(0, 3)),
        datasets: [
          { label: 'Ingresos', data: this.monthRows.map(row => row.income), backgroundColor: 'rgba(5,150,105,0.75)', borderRadius: 4 },
          { label: 'Gastos', data: this.monthRows.map(row => row.expenses), backgroundColor: 'rgba(225,29,72,0.65)', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: { color: '#4d7a63', font: { family: 'DM Mono', size: 11 } },
          },
        },
        scales: {
          x: { grid: { color: '#cde8d8' }, ticks: { color: '#4d7a63', font: { family: 'DM Mono', size: 10 } } },
          y: { grid: { color: '#cde8d8' }, ticks: { color: '#4d7a63', font: { family: 'DM Mono', size: 10 }, callback: value => `$${Number(value) / 1000}k` } },
        },
      },
    });
  }

  initBalanceChart() {
    if (!this.balanceChartRef) return;

    this.balanceChartInst?.destroy();
    this.balanceChartInst = new Chart(this.balanceChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: MONTHS.map(month => month.slice(0, 3)),
        datasets: [{
          label: 'Balance',
          data: this.monthRows.map(row => row.balance),
          backgroundColor: this.monthRows.map(row => row.balance >= 0 ? 'rgba(5,150,105,0.75)' : 'rgba(225,29,72,0.65)'),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: { color: '#4d7a63', font: { family: 'DM Mono', size: 11 } },
          },
        },
        scales: {
          x: { grid: { color: '#cde8d8' }, ticks: { color: '#4d7a63', font: { family: 'DM Mono', size: 10 } } },
          y: { grid: { color: '#cde8d8' }, ticks: { color: '#4d7a63', font: { family: 'DM Mono', size: 10 }, callback: value => `$${Number(value) / 1000}k` } },
        },
      },
    });
  }

  async exportExcel() {
    try {
      const XLSX = await import('xlsx');

      const annualData = this.monthRows.map(row => ({
        Mes: row.label,
        Anio: row.year,
        Ingresos: row.income,
        Gastos: row.expenses,
        Balance: row.balance,
        'Tasa de Ahorro (%)': parseFloat(row.savingsRate.toFixed(2)),
        'Mayor Gasto': row.topCategory,
      }));
      const annualSheet = XLSX.utils.json_to_sheet(annualData);
      annualSheet['!cols'] = [14, 8, 14, 14, 14, 18, 22].map(width => ({ wch: width }));

      const categoryData = this.annualCategoryTotals.map(category => ({
        Categoria: category.name,
        'Total Anual': category.total,
        'Promedio Mensual': parseFloat(category.monthly.toFixed(2)),
        '% del Gasto': parseFloat(category.pct.toFixed(2)),
      }));
      const categorySheet = XLSX.utils.json_to_sheet(categoryData);

      const paymentData = this.paymentSummaryRows.map(row => ({
        'Fecha Objetivo': this.formatDueDateLabel(row),
        'Forma de Pago': row.methodName,
        Tipo: this.getPaymentMethodTypeLabel(row.methodType),
        Pendiente: row.pendingTotal,
        Tarjeta: row.creditTotal,
        Total: row.total,
        Gastos: row.count,
        Detalle: this.describePaymentRow(row),
      }));
      const paymentSheet = XLSX.utils.json_to_sheet(paymentData);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, annualSheet, 'Proyeccion Anual');
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'Por Categoria');
      XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Pagos Programados');
      XLSX.writeFile(workbook, `FinanzasCasa_${this.selectedYear}.xlsx`);
    } catch (error) {
      console.error('Error exportando Excel:', error);
    }
  }

  async exportPDF() {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFillColor(10, 15, 13);
      doc.rect(0, 0, 297, 30, 'F');
      doc.setTextColor(16, 185, 129);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('FinanzasCasa', 14, 18);
      doc.setFontSize(12);
      doc.setTextColor(107, 127, 114);
      doc.text(`Reporte Anual ${this.selectedYear}`, 14, 26);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      const summaryY = 38;
      const summaries = [
        { label: 'Ingresos Anuales', value: this.formatCurrency(this.annualIncome) },
        { label: 'Gastos Anuales', value: this.formatCurrency(this.annualExpenses) },
        { label: 'Balance', value: this.formatCurrency(this.annualBalance) },
        { label: 'Tasa de Ahorro', value: `${this.annualSavingsRate.toFixed(1)}%` },
      ];

      summaries.forEach((summary, idx) => {
        const x = 14 + idx * 70;
        doc.setFont('helvetica', 'bold');
        doc.text(summary.value, x, summaryY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(summary.label, x, summaryY + 5);
        doc.setTextColor(0);
      });

      autoTable(doc, {
        startY: summaryY + 16,
        head: [['Mes', 'Ingresos', 'Gastos', 'Balance', 'Ahorro %', 'Mayor gasto', 'Estado']],
        body: this.monthRows.map(row => [
          row.label,
          this.formatCurrency(row.income),
          this.formatCurrency(row.expenses),
          this.formatCurrency(row.balance),
          `${row.savingsRate.toFixed(1)}%`,
          row.topCategory || '—',
          row.balance < 0 ? 'Deficit' : row.savingsRate >= 20 ? 'Optimo' : 'Ajustado',
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [16, 185, 129], textColor: [5, 26, 14], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 250, 247] },
      });

      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Gastos por Categoria - ${this.selectedYear}`, 14, 20);

      autoTable(doc, {
        startY: 28,
        head: [['Categoria', 'Total Anual', 'Promedio Mensual', '% del Gasto']],
        body: this.annualCategoryTotals.map(category => [
          category.name,
          this.formatCurrency(category.total),
          this.formatCurrency(category.monthly),
          `${category.pct.toFixed(1)}%`,
        ]),
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [16, 185, 129], textColor: [5, 26, 14], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 250, 247] },
      });

      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Pagos por Forma de Pago - ${this.selectedYear}`, 14, 20);

      autoTable(doc, {
        startY: 28,
        head: [['Fecha objetivo', 'Forma de pago', 'Pendiente', 'Tarjeta', 'Total', 'Gastos', 'Detalle']],
        body: this.paymentSummaryRows.map(row => [
          this.formatDueDateLabel(row),
          row.methodName,
          this.formatCurrency(row.pendingTotal),
          this.formatCurrency(row.creditTotal),
          this.formatCurrency(row.total),
          String(row.count),
          this.describePaymentRow(row),
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [16, 185, 129], textColor: [5, 26, 14], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 250, 247] },
      });

      doc.save(`FinanzasCasa_Reporte_${this.selectedYear}.pdf`);
    } catch (error) {
      console.error('Error exportando PDF:', error);
    }
  }

  getPaymentMethodIcon(type?: PaymentMethodType) {
    return PAYMENT_METHOD_TYPES.find(item => item.value === type)?.icon || '💳';
  }

  getPaymentMethodTypeLabel(type?: PaymentMethodType) {
    return PAYMENT_METHOD_TYPES.find(item => item.value === type)?.label || 'Sin tipo';
  }

  formatDueDateLabel(row: PaymentSummaryRow) {
    if (!row.dueDate) return `${MONTHS[row.month - 1]} ${row.year} · Sin fecha`;

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(`${row.dueDate}T00:00:00`));
  }

  describePaymentRow(row: PaymentSummaryRow) {
    if (row.creditCount > 0 && row.pendingCount > 0) {
      return `${row.creditCount} compra(s) ya hecha(s) en tarjeta y ${row.pendingCount} gasto(s) pendiente(s).`;
    }
    if (row.creditCount > 0) {
      return `${row.creditCount} compra(s) ya registrada(s) en tarjeta de credito.`;
    }
    return `${row.pendingCount} gasto(s) pendiente(s) por pagar con esta forma.`;
  }

  formatCurrency(value: number) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  }

  updatePaymentFilters() {
    this.selectedPaymentMonth = Number(this.selectedPaymentMonth);
    this.filteredPaymentSummaryRows = this.paymentSummaryRows.filter(row =>
      row.month === this.selectedPaymentMonth &&
      (!this.selectedPaymentMethodId || row.methodId === this.selectedPaymentMethodId)
    );

    this.filteredPaymentTotal = this.filteredPaymentSummaryRows.reduce((sum, row) => sum + row.total, 0);
    this.filteredPaymentCount = this.filteredPaymentSummaryRows.length;
    this.filteredCreditDebt = this.filteredPaymentSummaryRows.reduce((sum, row) => sum + row.creditTotal, 0);
    this.filteredCreditDebtCount = this.filteredPaymentSummaryRows.reduce((sum, row) => sum + row.creditCount, 0);
    this.filteredPendingPaymentTotal = this.filteredPaymentSummaryRows.reduce((sum, row) => sum + row.pendingTotal, 0);

    const today = this.todayIso();
    this.nextFilteredPayment = this.filteredPaymentSummaryRows.find(row => row.dueDate !== null && row.dueDate >= today)
      || this.filteredPaymentSummaryRows[0];
  }

  private buildExpensesByMonth(allOccurrences: ExpenseOccurrence[]) {
    return Array.from({ length: 12 }, (_, idx) =>
      allOccurrences.filter((expense: ExpenseOccurrence) => {
        const parts = expense.occurrence_date?.split('-').map(Number) || [];
        return parts[0] === this.selectedYear && parts[1] === idx + 1;
      })
    );
  }

  private buildAnnualCategoryTotals(expensesByMonth: Array<Array<Expense | ExpenseOccurrence>>) {
    const annualCategories = new Map<string, any>();

    for (const monthData of expensesByMonth) {
      for (const expense of (monthData || [])) {
        const key = expense.category_name || 'Otros';
        if (!annualCategories.has(key)) {
          annualCategories.set(key, {
            name: key,
            icon: expense.category_icon || '📦',
            color: expense.category_color || '#94a3b8',
            total: 0,
          });
        }
        annualCategories.get(key).total += expense.amount;
      }
    }

    const annualTotal = Array.from(annualCategories.values()).reduce((sum, category) => sum + category.total, 0);
    return Array.from(annualCategories.values())
      .sort((a, b) => b.total - a.total)
      .map(category => ({
        ...category,
        monthly: category.total / 12,
        pct: annualTotal > 0 ? category.total / annualTotal * 100 : 0,
      }));
  }

  private buildPaymentSummaryRows(allExpenses: Array<Array<Expense | ExpenseOccurrence>>) {
    const summaryMap = new Map<string, PaymentSummaryRow>();

    allExpenses.forEach((monthData, idx) => {
      const month = idx + 1;
      for (const expense of (monthData || [])) {
        const obligations = this.resolvePaymentObligations(expense, month, this.selectedYear);
        for (const obligation of obligations) {
          const key = `${obligation.methodId}__${obligation.dueDate || 'sin-fecha'}`;
          if (!summaryMap.has(key)) {
            summaryMap.set(key, {
              month,
              year: this.selectedYear,
              dueDate: obligation.dueDate,
              methodId: obligation.methodId,
              methodName: obligation.methodName,
              methodType: obligation.methodType,
              methodLastFour: obligation.methodLastFour,
              methodBank: obligation.methodBank,
              methodColor: obligation.methodColor,
              total: 0,
              count: 0,
              pendingTotal: 0,
              pendingCount: 0,
              creditTotal: 0,
              creditCount: 0,
            });
          }

          const row = summaryMap.get(key)!;
          row.total += obligation.amount;
          row.count += 1;

          if (obligation.source === 'credit') {
            row.creditTotal += obligation.amount;
            row.creditCount += 1;
          } else {
            row.pendingTotal += obligation.amount;
            row.pendingCount += 1;
          }
        }
      }
    });

    return Array.from(summaryMap.values()).sort((a, b) => {
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return b.total - a.total;
    });
  }

  private resolvePaymentObligations(expense: ExpenseOccurrence | Expense, month: number, year: number): PaymentObligation[] {
    const obligationAmount = Number(expense.amount ?? 0);
    if (!obligationAmount) return [];

    const occurrenceDates = this.resolveOccurrenceDates(expense, month, year);
    if (occurrenceDates.length === 0) return [];

    if (!expense.is_paid) {
      if (!expense.payment_method_id && !expense.payment_method_name) return [];
      const paymentMethod = this.findPaymentMethod(expense.payment_method_id);
      return occurrenceDates.map(baseDateIso => ({
        dueDate: this.resolveExpenseDueDate(baseDateIso, paymentMethod, false),
        methodId: expense.payment_method_id || expense.payment_method_name || `pending-${month}-${year}`,
        methodName: expense.payment_method_name || 'Forma de pago asignada',
        methodType: expense.payment_method_type,
        methodLastFour: expense.payment_method_last_four,
        methodBank: expense.payment_method_bank,
        methodColor: expense.payment_method_color,
        amount: obligationAmount,
        source: 'pending',
      }));
    }

    const paidWithCreditCard = expense.paid_payment_method_type === 'tarjeta_credito'
      && (!!expense.paid_payment_method_id || !!expense.paid_payment_method_name);
    const plannedCreditCard = expense.payment_method_type === 'tarjeta_credito'
      && (!!expense.payment_method_id || !!expense.payment_method_name);

    if (paidWithCreditCard) {
      const paymentMethod = this.findPaymentMethod(expense.paid_payment_method_id);
      return occurrenceDates.map(baseDateIso => ({
        dueDate: this.resolveExpenseDueDate(baseDateIso, paymentMethod, true),
        methodId: expense.paid_payment_method_id || expense.paid_payment_method_name || `credit-paid-${month}-${year}`,
        methodName: expense.paid_payment_method_name || 'Tarjeta de credito',
        methodType: expense.paid_payment_method_type,
        methodLastFour: expense.paid_payment_method_last_four,
        methodBank: paymentMethod?.bank,
        methodColor: paymentMethod?.color,
        amount: obligationAmount,
        source: 'credit',
      }));
    }

    if (plannedCreditCard && !expense.paid_payment_method_id) {
      const paymentMethod = this.findPaymentMethod(expense.payment_method_id);
      return occurrenceDates.map(baseDateIso => ({
        dueDate: this.resolveExpenseDueDate(baseDateIso, paymentMethod, true),
        methodId: expense.payment_method_id || expense.payment_method_name || `credit-planned-${month}-${year}`,
        methodName: expense.payment_method_name || 'Tarjeta de credito',
        methodType: expense.payment_method_type,
        methodLastFour: expense.payment_method_last_four,
        methodBank: expense.payment_method_bank,
        methodColor: expense.payment_method_color,
        amount: obligationAmount,
        source: 'credit',
      }));
    }

    return [];
  }

  private resolveExpenseDueDate(baseDateIso: string | null, paymentMethod: PaymentMethod | undefined, treatAsCreditCard: boolean) {
    const baseDate = this.resolveBaseDate(baseDateIso);
    if (!baseDate) return null;

    if (treatAsCreditCard && paymentMethod?.billing_cutoff_day && paymentMethod?.payment_due_day) {
      return this.resolveCreditCardDueDate(baseDate, paymentMethod.billing_cutoff_day, paymentMethod.payment_due_day);
    }

    if (paymentMethod?.payment_due_day) {
      return this.resolveMonthlyDay(baseDate.getFullYear(), baseDate.getMonth() + 1, paymentMethod.payment_due_day);
    }

    return this.formatIsoDate(baseDate);
  }

  private resolveOccurrenceDates(expense: ExpenseOccurrence | Expense, month: number, year: number) {
    if ((expense as ExpenseOccurrence).occurrence_date) {
      return [(expense as ExpenseOccurrence).occurrence_date];
    }

    if (expense.recurrence_type === 'semanal') {
      return this.supabase.getWeekdayDatesInMonth(year, month, expense.weekly_day ?? 1);
    }

    const paymentDate = 'payment_date' in expense ? expense.payment_date || null : null;
    return paymentDate ? [this.resolveProjectedIsoDate(paymentDate, month, year)] : [];
  }

  private resolveProjectedIsoDate(paymentDate: string, month: number, year: number) {
    const parts = paymentDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return paymentDate;

    const day = parts[2];
    const maxDay = new Date(year, month, 0).getDate();
    const effectiveDay = Math.min(day, maxDay);
    return `${year}-${String(month).padStart(2, '0')}-${String(effectiveDay).padStart(2, '0')}`;
  }

  private resolveBaseDate(paymentDate: string | null | undefined) {
    if (!paymentDate) return null;

    const parts = paymentDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  private resolveCreditCardDueDate(baseDate: Date, cutoffDay: number, dueDay: number) {
    const statementClose = this.resolveStatementCloseDate(baseDate, cutoffDay);
    const dueDate = this.resolveFirstDueDateAfter(statementClose, dueDay);
    return this.formatIsoDate(dueDate);
  }

  private resolveStatementCloseDate(baseDate: Date, cutoffDay: number) {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth() + 1;
    const currentCutoff = this.resolveDateWithDay(year, month, cutoffDay);
    if (baseDate.getTime() <= currentCutoff.getTime()) return currentCutoff;

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return this.resolveDateWithDay(nextYear, nextMonth, cutoffDay);
  }

  private resolveFirstDueDateAfter(statementClose: Date, dueDay: number) {
    const year = statementClose.getFullYear();
    const month = statementClose.getMonth() + 1;
    const currentCandidate = this.resolveDateWithDay(year, month, dueDay);
    if (currentCandidate.getTime() > statementClose.getTime()) return currentCandidate;

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return this.resolveDateWithDay(nextYear, nextMonth, dueDay);
  }

  private resolveMonthlyDay(year: number, month: number, day: number) {
    return this.formatIsoDate(this.resolveDateWithDay(year, month, day));
  }

  private resolveDateWithDay(year: number, month: number, day: number) {
    const maxDay = new Date(year, month, 0).getDate();
    const effectiveDay = Math.max(1, Math.min(day, maxDay));
    return new Date(year, month - 1, effectiveDay);
  }

  private formatIsoDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private findPaymentMethod(methodId?: string) {
    if (!methodId) return undefined;
    return this.paymentMethods.find(method => method.id === methodId);
  }

  private todayIso() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}
