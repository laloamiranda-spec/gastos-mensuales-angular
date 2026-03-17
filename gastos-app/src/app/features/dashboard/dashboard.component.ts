import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { MONTHS, CategoryTotal } from '../../core/models/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="home-hero mb-6">
        <div class="home-hero-copy">
          <div class="home-kicker">Resumen del hogar</div>
          <div class="page-title">Inicio</div>
          <div class="page-subtitle">Tu dinero, tus pagos y lo que sigue en un solo vistazo</div>
          <div class="hero-actions">
            <a routerLink="/pagos-y-gastos" class="btn btn-primary">Ver pagos</a>
            <a routerLink="/tu-dinero/movimientos" class="btn btn-secondary">Registrar movimiento</a>
          </div>
        </div>

        <div class="hero-month-card">
          <div class="month-selector">
            <button (click)="prevMonth()">‹</button>
            <span class="month-label">{{ monthName }} {{ currentYear }}</span>
            <button (click)="nextMonth()">›</button>
          </div>

          <div class="hero-month-meta">
            <div>
              <strong>{{ remainingMonthDays }}</strong>
              <span>{{ remainingMonthDaysLabel }}</span>
            </div>
            <div>
              <strong>{{ upcomingExpenses.length }}</strong>
              <span>pagos próximos</span>
            </div>
          </div>
        </div>
      </div>

      <ng-container *ngIf="alerts.length > 0">
        <div *ngFor="let alert of alerts" class="alert" [ngClass]="'alert-' + alert.type">
          <span>{{ alert.icon }}</span>
          <div>
            <strong>{{ alert.title }}</strong>
            <div>{{ alert.message }}</div>
          </div>
        </div>
      </ng-container>

      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <span>Cargando datos...</span>
      </div>

      <ng-container *ngIf="!loading">
        <div class="dashboard-highlight-grid mb-6">
          <div class="feature-card feature-card-balance">
            <div class="feature-label">Disponible hoy</div>
            <div class="feature-value mono">{{ balance | currency:'MXN':'symbol':'1.0-0' }}</div>
            <div class="feature-meta" [class.negative]="balance < 0">
              {{ balance >= 0 ? 'Después de gastos del mes' : 'Tu gasto esperado supera lo que entra' }}
            </div>
          </div>

          <div class="feature-card feature-card-reserve">
            <div class="feature-label">Apartado para tarjetas</div>
            <div class="feature-value mono">{{ totalCreditReserve | currency:'MXN':'symbol':'1.0-0' }}</div>
            <div class="feature-meta" *ngIf="nextCreditReserve">
              Siguiente: {{ nextCreditReserve.methodName }} · {{ nextCreditReserve.dueDate | date:'dd MMM' }}
            </div>
            <div class="feature-meta" *ngIf="!nextCreditReserve">
              Sin pagos de tarjeta proyectados en este mes
            </div>
          </div>

          <div class="feature-card">
            <div class="feature-label">Pagos próximos</div>
            <div class="feature-value mono">{{ upcomingExpenses.length }}</div>
            <div class="feature-meta">{{ upcomingSummaryLabel }}</div>
          </div>

          <div class="feature-card">
            <div class="feature-label">Restante para gastar</div>
            <div class="feature-value mono">{{ spendingAvailable | currency:'MXN':'symbol':'1.0-0' }}</div>
            <div class="feature-meta" [class.negative]="spendingAvailable < 0">{{ spendingAvailableLabel }}</div>
          </div>
        </div>

        <div class="home-priority-grid mb-6">
          <div class="card priority-card">
            <div class="card-header">
              <span class="card-title">Qué atender primero</span>
              <span class="badge badge-warning" *ngIf="upcomingExpenses.length > 0">{{ upcomingExpenses.length }} próximos</span>
            </div>

            <div *ngIf="upcomingExpenses.length === 0" class="empty-state compact-empty">
              <div class="empty-state-title">Sin pagos urgentes</div>
              <div class="empty-state-sub">Tus próximos compromisos del mes se ven en orden.</div>
            </div>

            <div class="priority-list" *ngIf="upcomingExpenses.length > 0">
              <div class="priority-item" *ngFor="let expense of upcomingExpenses">
                <div class="priority-date">{{ expense.occurrence_date | date:'dd MMM' }}</div>
                <div class="priority-copy">
                  <strong>{{ expense.description }}</strong>
                  <span>{{ expense.category_name || 'Sin categoría' }} · {{ expense.member_name || 'Hogar' }}</span>
                </div>
                <div class="priority-amount mono">{{ expense.amount | currency:'MXN':'symbol':'1.0-0' }}</div>
              </div>
            </div>
          </div>

          <div class="card reserve-card">
            <div class="card-header">
              <span class="card-title">Tarjetas por liquidar</span>
              <a routerLink="/resumenes" class="btn btn-secondary btn-sm">Ver detalle</a>
            </div>

            <div *ngIf="creditReserveRows.length === 0" class="empty-state compact-empty">
              <div class="empty-state-title">Sin deuda de tarjeta este mes</div>
              <div class="empty-state-sub">Cuando existan consumos por liquidar aparecerán aquí.</div>
            </div>

            <div class="reserve-list" *ngIf="creditReserveRows.length > 0">
              <div class="reserve-item" *ngFor="let row of creditReserveRows">
                <div class="reserve-item-copy">
                  <strong>{{ row.methodName }}</strong>
                  <span>{{ row.dueDate | date:'dd MMM yyyy' }} · {{ row.count }} compra{{ row.count !== 1 ? 's' : '' }}</span>
                </div>
                <div class="reserve-item-total mono">{{ row.total | currency:'MXN':'symbol':'1.0-0' }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="stats-band mb-6">
          <div class="mini-stat">
            <span>Entradas del mes</span>
            <strong class="mono text-primary">{{ totalIncome | currency:'MXN':'symbol':'1.0-0' }}</strong>
          </div>
          <div class="mini-stat">
            <span>Gastos del mes</span>
            <strong class="mono" [class.text-danger]="totalExpenses > totalIncome">{{ totalExpenses | currency:'MXN':'symbol':'1.0-0' }}</strong>
          </div>
          <div class="mini-stat">
            <span>Tasa de ahorro</span>
            <strong class="mono">{{ savingsRate | number:'1.1-1' }}%</strong>
          </div>
          <div class="mini-stat">
            <span>Uso del ingreso</span>
            <strong class="mono">{{ expenseRatio | number:'1.0-0' }}%</strong>
          </div>
        </div>

        <div class="grid-chart mb-6">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Tendencia 6 meses</span>
              <span class="badge badge-info text-mono" style="font-size:10px;">Proyección</span>
            </div>
            <canvas #trendChart style="max-height:260px;"></canvas>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">Gastos por rubro</span>
            </div>
            <canvas #categoryChart style="max-height:260px;"></canvas>
          </div>
        </div>

        <div class="grid-2 mb-6">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Dónde se va el dinero</span>
            </div>
            <div *ngIf="categoryTotals.length === 0" class="empty-state">
              <div class="empty-state-icon">📂</div>
              <div class="empty-state-title">Sin gastos este mes</div>
            </div>
            <div *ngFor="let cat of categoryTotals" style="margin-bottom:12px;">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span>{{ cat.category_icon }}</span>
                  <span style="font-size:13px;">{{ cat.category_name }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="mono" style="font-size:13px;">{{ cat.total | currency:'MXN':'symbol':'1.0-0' }}</span>
                  <span class="badge badge-muted">{{ cat.percentage | number:'1.0-0' }}%</span>
                </div>
              </div>
              <div class="progress-bar">
                <div class="progress-fill"
                     [style.background]="cat.category_color"
                     [style.width.%]="cat.percentage"></div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">Entradas por cuenta</span>
            </div>
            <div *ngIf="incomingAccounts.length === 0" class="empty-state">
              <div class="empty-state-icon">👥</div>
              <div class="empty-state-title">Sin entradas registradas</div>
            </div>
            <div *ngFor="let m of incomingAccounts" style="margin-bottom:16px;">
              <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-2">
                  <div class="color-dot" [style.background]="m.color"></div>
                  <span style="font-size:13px;">{{ m.name }}</span>
                </div>
                <span class="mono text-primary" style="font-size:14px;font-weight:600;">
                  {{ m.total | currency:'MXN':'symbol':'1.0-0' }}
                </span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill"
                     [style.background]="m.color"
                     [style.width.%]="totalIncome > 0 ? (m.total/totalIncome*100) : 0"></div>
              </div>
            </div>

            <div class="divider"></div>

            <div class="card-title mb-4" style="margin-top:8px;">Acciones rápidas</div>
            <div class="quick-actions-grid">
              <a routerLink="/tu-dinero/movimientos" class="btn btn-secondary btn-sm">+ Movimiento</a>
              <a routerLink="/pagos-y-gastos" class="btn btn-secondary btn-sm">+ Gasto</a>
              <a routerLink="/resumenes" class="btn btn-secondary btn-sm">📄 Resúmenes</a>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .home-hero {
      display: grid;
      grid-template-columns: 1.3fr 0.7fr;
      gap: 18px;
      align-items: stretch;
    }

    .home-hero-copy,
    .hero-month-card,
    .feature-card {
      border: 1px solid var(--color-border);
      border-radius: 24px;
      background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,251,247,0.92));
      box-shadow: var(--shadow-card);
    }

    .home-hero-copy {
      padding: 28px;
      background:
        radial-gradient(circle at top right, rgba(8,145,178,0.10), transparent 30%),
        radial-gradient(circle at bottom left, rgba(5,150,105,0.10), transparent 35%),
        linear-gradient(180deg, rgba(255,255,255,0.98), rgba(244,251,247,0.94));
    }

    .home-kicker {
      display: inline-flex;
      width: fit-content;
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

    .hero-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 18px;
    }

    .hero-month-card {
      padding: 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 18px;
    }

    .hero-month-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .hero-month-meta div {
      padding: 14px;
      border-radius: 18px;
      background: rgba(255,255,255,0.88);
      border: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .hero-month-meta strong {
      font-family: var(--font-display);
      font-size: 22px;
      color: var(--color-accent);
    }

    .hero-month-meta span {
      color: var(--color-text-muted);
      font-size: 12px;
    }

    .dashboard-highlight-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
    }

    .feature-card {
      padding: 20px;
      min-height: 150px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .feature-card-balance {
      background: linear-gradient(180deg, rgba(5,150,105,0.10), rgba(255,255,255,0.96));
    }

    .feature-card-reserve {
      background: linear-gradient(180deg, rgba(217,119,6,0.12), rgba(255,255,255,0.96));
    }

    .feature-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-text-muted);
      font-weight: 700;
    }

    .feature-value {
      font-size: 30px;
      line-height: 1;
      color: var(--color-accent);
    }

    .feature-meta {
      color: var(--color-text-muted);
      font-size: 13px;
      line-height: 1.45;
    }

    .feature-meta.negative {
      color: var(--color-danger);
    }

    .home-priority-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: 16px;
    }

    .priority-card,
    .reserve-card {
      min-height: 290px;
    }

    .priority-list,
    .reserve-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .priority-item,
    .reserve-item {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 14px;
      align-items: center;
      padding: 14px;
      border-radius: 18px;
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
    }

    .priority-date {
      min-width: 62px;
      padding: 8px 10px;
      border-radius: 14px;
      background: #ffffff;
      border: 1px solid var(--color-border);
      font-family: var(--font-mono);
      font-size: 11px;
      text-align: center;
      color: var(--color-accent);
    }

    .priority-copy,
    .reserve-item-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .priority-copy strong,
    .reserve-item-copy strong {
      font-size: 14px;
      color: var(--color-accent);
    }

    .priority-copy span,
    .reserve-item-copy span {
      font-size: 12px;
      color: var(--color-text-muted);
    }

    .priority-amount,
    .reserve-item-total {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-danger);
      text-align: right;
    }

    .reserve-item {
      grid-template-columns: 1fr auto;
    }

    .stats-band {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .mini-stat {
      padding: 14px 16px;
      border-radius: 18px;
      background: rgba(255,255,255,0.82);
      border: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .mini-stat span {
      color: var(--color-text-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    .mini-stat strong {
      color: var(--color-accent);
      font-size: 18px;
    }

    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .compact-empty {
      padding: 30px 16px;
    }

    @media (max-width: 1100px) {
      .dashboard-highlight-grid,
      .stats-band {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 900px) {
      .home-hero,
      .home-priority-grid,
      .dashboard-highlight-grid,
      .stats-band,
      .quick-actions-grid {
        grid-template-columns: 1fr;
      }

      .feature-card {
        min-height: 132px;
      }

      .priority-item,
      .reserve-item {
        grid-template-columns: 1fr;
      }

      .priority-amount,
      .reserve-item-total {
        text-align: left;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trendChart') trendChartRef!: ElementRef;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef;

  currentMonth = new Date().getMonth() + 1;
  currentYear = new Date().getFullYear();

  loading = true;
  totalIncome = 0;
  totalExpenses = 0;
  balance = 0;
  savingsRate = 0;
  expenseRatio = 0;
  categoryTotals: CategoryTotal[] = [];
  incomingAccounts: any[] = [];
  alerts: any[] = [];
  creditReserveRows: any[] = [];
  upcomingExpenses: any[] = [];

  private trendChartInstance?: Chart;
  private categoryChartInstance?: Chart;

  get monthName() { return MONTHS[this.currentMonth - 1]; }

  get remainingMonthDays() {
    const today = new Date();
    const viewedMonthIndex = this.currentMonth - 1;
    const lastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();

    if (this.currentYear < today.getFullYear() || (this.currentYear === today.getFullYear() && viewedMonthIndex < today.getMonth())) {
      return 0;
    }

    if (this.currentYear > today.getFullYear() || (this.currentYear === today.getFullYear() && viewedMonthIndex > today.getMonth())) {
      return lastDay;
    }

    return Math.max(lastDay - today.getDate(), 0);
  }

  get remainingMonthDaysLabel() {
    if (this.isCurrentViewedMonth()) {
      return this.remainingMonthDays === 0
        ? 'Último día del mes'
        : `${this.remainingMonthDays} día${this.remainingMonthDays === 1 ? '' : 's'} por transcurrir`;
    }

    if (this.isFutureViewedMonth()) {
      return 'Mes futuro completo';
    }

    return 'Mes ya concluido';
  }

  get spendingAvailable() {
    return this.balance;
  }

  get spendingAvailableLabel() {
    if (this.spendingAvailable >= 0) {
      if (this.isCurrentViewedMonth() && this.remainingMonthDays > 0) {
        const daily = this.spendingAvailable / this.remainingMonthDays;
        return `Promedio diario: ${this.formatCurrency(daily)}`;
      }
      return 'Disponible dentro del mes';
    }

    return `Excedido por ${this.formatCurrency(Math.abs(this.spendingAvailable))}`;
  }

  get totalCreditReserve() {
    return this.creditReserveRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  }

  get nextCreditReserve() {
    return this.creditReserveRows[0] || null;
  }

  get upcomingSummaryLabel() {
    if (this.upcomingExpenses.length === 0) {
      return 'Sin compromisos urgentes en este momento';
    }

    const next = this.upcomingExpenses[0];
    return `Sigue ${next.description} el ${this.formatDateLabel(next.occurrence_date)}`;
  }

  constructor(private supabase: SupabaseService) {}

  ngOnInit() { this.loadData(); }

  ngAfterViewInit() {
    // charts init after load
  }

  ngOnDestroy() {
    this.trendChartInstance?.destroy();
    this.categoryChartInstance?.destroy();
  }

  prevMonth() {
    if (this.currentMonth === 1) { this.currentMonth = 12; this.currentYear--; }
    else this.currentMonth--;
    this.loadData();
  }

  nextMonth() {
    if (this.currentMonth === 12) { this.currentMonth = 1; this.currentYear++; }
    else this.currentMonth++;
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    this.alerts = [];
    try {
      const [incomeData, expensesData, creditReserve] = await Promise.all([
        this.supabase.getIncomingMovements(this.currentYear, this.currentMonth),
        this.supabase.getExpenseOccurrences(this.currentYear, this.currentMonth),
        this.supabase.getCreditCardReserveSummary(this.currentYear, this.currentMonth),
      ]);

      this.creditReserveRows = creditReserve || [];
      this.totalIncome = (incomeData || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      this.totalExpenses = (expensesData || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      this.balance = this.totalIncome - this.totalExpenses;
      this.expenseRatio = this.totalIncome > 0 ? (this.totalExpenses / this.totalIncome * 100) : 0;
      this.savingsRate = this.totalIncome > 0 ? (this.balance / this.totalIncome * 100) : 0;

      const categoryMap = new Map<string, any>();
      for (const expense of (expensesData || [])) {
        const key = expense.category_name || 'Otros';
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            category_name: key,
            category_icon: expense.category_icon,
            category_color: expense.category_color,
            total: 0,
            count: 0,
          });
        }

        categoryMap.get(key).total += Number(expense.amount || 0);
        categoryMap.get(key).count += 1;
      }

      this.categoryTotals = Array.from(categoryMap.values())
        .sort((a, b) => b.total - a.total)
        .map(category => ({
          ...category,
          percentage: this.totalExpenses > 0 ? (category.total / this.totalExpenses * 100) : 0,
        }));

      const accountMap = new Map<string, any>();
      for (const income of (incomeData || [])) {
        const key = income.account_name || 'Sin cuenta';
        if (!accountMap.has(key)) {
          accountMap.set(key, {
            name: key,
            color: income.account_color || '#10b981',
            total: 0,
          });
        }
        accountMap.get(key).total += Number(income.amount || 0);
      }
      this.incomingAccounts = Array.from(accountMap.values());

      this.upcomingExpenses = (expensesData || [])
        .filter((expense: any) => !expense.is_paid && !!expense.occurrence_date)
        .sort((a: any, b: any) => String(a.occurrence_date).localeCompare(String(b.occurrence_date)))
        .slice(0, 5);

      if (this.balance < 0) {
        this.alerts.push({
          type: 'danger',
          icon: '🚨',
          title: 'Déficit detectado',
          message: `Tus gastos superan tus ingresos por ${this.formatCurrency(Math.abs(this.balance))} este mes.`,
        });
      } else if (this.expenseRatio > 80) {
        this.alerts.push({
          type: 'warning',
          icon: '⚠️',
          title: 'Gastos elevados',
          message: `Estás usando el ${this.expenseRatio.toFixed(1)}% de tus ingresos en gastos.`,
        });
      }

      if (this.totalCreditReserve > 0) {
        this.alerts.push({
          type: 'warning',
          icon: '💳',
          title: 'Apartado para tarjetas',
          message: `Necesitas reservar ${this.formatCurrency(this.totalCreditReserve)} para cubrir tus tarjetas este mes.`,
        });
      }

      this.loading = false;
      setTimeout(() => this.initCharts(), 100);
    } catch (error) {
      console.error(error);
      this.loading = false;
    }
  }

  async initCharts() {
    await this.initTrendChart();
    await this.initCategoryChart();
  }

  async initTrendChart() {
    if (!this.trendChartRef) return;
    this.trendChartInstance?.destroy();

    const months: number[] = [];
    const years: number[] = [];
    let month = this.currentMonth;
    let year = this.currentYear;

    for (let i = 0; i < 6; i++) {
      months.unshift(month);
      years.unshift(year);
      month--;
      if (month === 0) {
        month = 12;
        year--;
      }
    }

    const labels = months.map((value, index) => `${MONTHS[value - 1].slice(0, 3)} ${years[index]}`);
    const incomePromises = months.map((value, index) => this.supabase.getIncomingMovements(years[index], value));
    const expensePromises = months.map((value, index) => this.supabase.getExpenseOccurrences(years[index], value));

    const [allIncome, allExpenses] = await Promise.all([
      Promise.all(incomePromises),
      Promise.all(expensePromises),
    ]);

    const incomeData = allIncome.map(items => (items || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0));
    const expenseData = allExpenses.map(items => (items || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0));

    this.trendChartInstance = new Chart(this.trendChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos',
            data: incomeData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#10b981',
            pointRadius: 4,
          },
          {
            label: 'Gastos',
            data: expenseData,
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244,63,94,0.05)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#f43f5e',
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: { color: '#6b7f72', font: { family: 'DM Mono', size: 11 } },
          },
        },
        scales: {
          x: {
            grid: { color: '#dcefe4' },
            ticks: { color: '#6b7f72', font: { family: 'DM Mono', size: 10 } },
          },
          y: {
            grid: { color: '#dcefe4' },
            ticks: {
              color: '#6b7f72',
              font: { family: 'DM Mono', size: 10 },
              callback: (value) => `$${Number(value) / 1000}k`,
            },
          },
        },
      },
    });
  }

  async initCategoryChart() {
    if (!this.categoryChartRef || this.categoryTotals.length === 0) return;
    this.categoryChartInstance?.destroy();

    this.categoryChartInstance = new Chart(this.categoryChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.categoryTotals.map(category => `${category.category_icon} ${category.category_name}`),
        datasets: [{
          data: this.categoryTotals.map(category => category.total),
          backgroundColor: this.categoryTotals.map(category => category.category_color || '#10b981'),
          borderColor: '#f8fcfa',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#6b7f72', font: { family: 'DM Mono', size: 10 }, boxWidth: 12, padding: 8 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${Number(ctx.parsed || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`,
            },
          },
        },
      },
    });
  }

  formatCurrency(value: number) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDateLabel(value: string) {
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`));
  }

  private isCurrentViewedMonth() {
    const today = new Date();
    return this.currentYear === today.getFullYear() && this.currentMonth === today.getMonth() + 1;
  }

  private isFutureViewedMonth() {
    const today = new Date();
    return this.currentYear > today.getFullYear()
      || (this.currentYear === today.getFullYear() && this.currentMonth > today.getMonth() + 1);
  }
}
