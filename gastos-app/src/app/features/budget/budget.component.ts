import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { Member, Category, BudgetLimit, MONTHS } from '../../core/models/models';

interface BudgetRow {
  category: Category;
  limit_id?: string;
  limit_amount: number;
  actual: number;
  pct_of_income: number;
  suggested: number;
  used_pct: number;      // actual/limit*100
  status: 'ok' | 'warn' | 'over' | 'none';
  editing: boolean;
  editValue: number;
}

interface AISuggestion {
  resumen: string;
  salud_financiera: 'buena' | 'regular' | 'critica';
  tasa_ahorro_sugerida: number;
  monto_ahorro: number;
  categorias: { nombre: string; porcentaje: number; monto: number; razon: string }[];
  recomendaciones: string[];
  alertas: string[];
}

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Plan mensual</div>
          <div class="page-subtitle">Organiza cuanto puedes usar este mes y en que rubros</div>
        </div>
        <div class="flex gap-2 items-center" style="flex-wrap:wrap;">
          <div class="month-selector">
            <button (click)="prevMonth()">‹</button>
            <span class="month-label">{{ monthName }} {{ currentYear }}</span>
            <button (click)="nextMonth()">›</button>
          </div>
          <select class="form-control" [(ngModel)]="selectedMemberId" (change)="onMemberChange()" style="width:160px;">
            <option value="">Todos</option>
            <option *ngFor="let m of members" [value]="m.id">{{ m.name }}</option>
          </select>
        </div>
      </div>

      <div *ngIf="loading" class="loading"><div class="spinner"></div></div>

      <ng-container *ngIf="!loading">

        <!-- Incoming movements summary -->
        <div class="grid-4 mb-6">
          <div class="card" *ngFor="let mi of accountIncomes">
            <div class="flex items-center gap-2 mb-2">
              <div class="color-dot" [style.background]="mi.color"></div>
              <span style="font-size:13px;font-weight:600;">{{ mi.name }}</span>
            </div>
            <div class="stat-value mono text-primary" style="font-size:20px;">{{ mi.income | currency:'MXN':'symbol':'1.0-0' }}</div>
            <div class="stat-delta">entrada {{ monthName }}</div>
          </div>
          <div class="card" style="border-color:var(--color-primary);background:var(--color-primary-glow);">
            <div class="stat-label">Entradas del mes</div>
            <div class="stat-value mono text-primary">{{ totalIncome | currency:'MXN':'symbol':'1.0-0' }}</div>
            <div class="stat-delta positive">{{ accountIncomes.length }} {{ accountIncomes.length === 1 ? 'cuenta' : 'cuentas' }}</div>
          </div>
        </div>

        <!-- IA Budget Suggestion -->
        <div class="card mb-6">
          <div class="card-header">
            <span class="card-title">✨ Presupuesto sugerido con IA</span>
            <span class="badge badge-muted" style="font-size:11px;">Claude Opus · Adaptive Thinking</span>
          </div>
          <div style="padding:16px 24px 20px;">

            <!-- Income source toggle -->
            <div class="ai-income-row">
              <div style="font-size:13px;font-weight:600;color:var(--color-text);margin-bottom:10px;">Base de ingresos para sugerencia</div>
              <div class="toggle-group mb-3">
                <button class="toggle-btn" [class.active]="!aiManualIncome" (click)="aiManualIncome=false">
                  📊 Usar entradas registradas
                </button>
                <button class="toggle-btn" [class.active]="aiManualIncome" (click)="aiManualIncome=true">
                  ✏️ Ingresar manualmente
                </button>
              </div>
              <div *ngIf="aiManualIncome" class="ai-input-row">
                <label style="font-size:13px;color:var(--color-text-muted);margin-bottom:4px;display:block;">Ingreso mensual total (MXN)</label>
                <input type="number" class="form-control" [(ngModel)]="aiIncomeInput"
                       placeholder="Ej. 25000" min="0" step="500" style="max-width:240px;" />
              </div>
              <div *ngIf="!aiManualIncome" class="ai-income-preview">
                <span class="text-muted" style="font-size:13px;">Usando entradas registradas:</span>
                <span class="mono text-primary" style="font-size:15px;font-weight:700;margin-left:8px;">{{ totalIncome | currency:'MXN':'symbol':'1.0-0' }}</span>
              </div>
            </div>

            <button class="btn btn-primary" style="margin-top:14px;gap:8px;"
                    (click)="generateAI()" [disabled]="aiLoading || aiIncomeForRequest <= 0">
              <span *ngIf="!aiLoading">✨ Generar presupuesto con IA</span>
              <span *ngIf="aiLoading" style="display:flex;align-items:center;gap:8px;">
                <span class="spinner-sm"></span> Analizando con IA...
              </span>
            </button>
            <div *ngIf="aiError" class="ai-error">{{ aiError }}</div>

          </div>

          <!-- AI Results -->
          <ng-container *ngIf="aiResult as r">
          <div class="ai-result">
            <div class="ai-result-header">
              <div class="ai-health" [class]="'ai-health-' + r.salud_financiera">
                <span class="ai-health-dot"></span>
                Salud financiera:
                <strong>{{ r.salud_financiera === 'buena' ? 'Buena' : r.salud_financiera === 'regular' ? 'Regular' : 'Crítica' }}</strong>
              </div>
              <div class="ai-savings">
                <span class="text-muted" style="font-size:12px;">Ahorro sugerido</span>
                <span class="mono text-primary" style="font-size:18px;font-weight:700;">{{ r.monto_ahorro | currency:'MXN':'symbol':'1.0-0' }}</span>
                <span class="badge badge-success">{{ r.tasa_ahorro_sugerida }}%</span>
              </div>
            </div>

            <div class="ai-summary">
              <div style="font-size:13px;line-height:1.6;color:var(--color-text);">{{ r.resumen }}</div>
            </div>

            <!-- Alerts from AI -->
            <div *ngIf="r.alertas?.length" class="ai-alerts">
              <div *ngFor="let alerta of r.alertas" class="alert-item alert-yellow" style="margin-bottom:8px;">
                <div class="alert-icon">⚠️</div>
                <div class="alert-body">
                  <div class="alert-detail">{{ alerta }}</div>
                </div>
              </div>
            </div>

            <!-- Category suggestions -->
            <div class="ai-categories">
              <div style="font-size:12px;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">
                Distribución sugerida por categoría
              </div>
              <div class="ai-cat-grid">
                <div *ngFor="let cat of r.categorias" class="ai-cat-card">
                  <div class="ai-cat-header">
                    <span style="font-weight:600;font-size:13px;">{{ cat.nombre }}</span>
                    <span class="badge badge-muted mono">{{ cat.porcentaje }}%</span>
                  </div>
                  <div class="mono text-primary" style="font-size:16px;font-weight:700;">{{ cat.monto | currency:'MXN':'symbol':'1.0-0' }}</div>
                  <div style="font-size:11px;color:var(--color-text-muted);margin-top:4px;line-height:1.4;">{{ cat.razon }}</div>
                </div>
              </div>
            </div>

            <!-- Recommendations -->
            <div *ngIf="r.recomendaciones?.length" class="ai-recs">
              <div style="font-size:12px;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">
                Recomendaciones
              </div>
              <div *ngFor="let rec of r.recomendaciones; let i = index" class="rec-item">
                <span class="rec-icon">{{ i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉' }}</span>
                <span class="rec-text">{{ rec }}</span>
              </div>
            </div>

            <!-- Apply button -->
            <div style="padding:16px 0 4px;border-top:1px solid var(--color-border);margin-top:12px;">
              <button class="btn btn-primary" (click)="applyAISuggestions()">
                ✅ Aplicar sugerencias al presupuesto
              </button>
              <span style="font-size:12px;color:var(--color-text-muted);margin-left:12px;">
                Rellena automáticamente los límites de la tabla
              </span>
            </div>
          </div>
          </ng-container>
        </div>

        <!-- Budget vs actual table -->
        <div class="card mb-6">
          <div class="card-header">
            <span class="card-title">Control de presupuesto por categoría</span>
            <div class="flex gap-2 items-center">
              <span class="badge badge-muted">{{ monthName }} {{ currentYear }}</span>
              <button class="btn btn-primary btn-sm" (click)="saveAll()" [disabled]="saving">
                {{ saving ? 'Guardando...' : '💾 Guardar límites' }}
              </button>
            </div>
          </div>

          <div *ngIf="totalIncome === 0" class="empty-state" style="padding:24px;">
            <div class="empty-state-icon">💡</div>
            <div class="empty-state-title">Sin movimientos de entrada para este período</div>
            <div class="empty-state-sub">Registra entradas en la sección <strong>Tu dinero</strong> para obtener sugerencias de plan mensual</div>
          </div>

          <div class="table-wrapper" *ngIf="budgetRows.length > 0">
            <table>
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th class="text-right">% del ingreso</th>
                  <th class="text-right">Sugerido</th>
                  <th class="text-right">Límite</th>
                  <th class="text-right">Gasto real</th>
                  <th class="text-right">Disponible</th>
                  <th style="width:140px;">Uso</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of budgetRows" [class.row-over]="row.status === 'over'" [class.row-warn]="row.status === 'warn'">
                  <td>
                    <div class="flex items-center gap-2">
                      <span style="font-size:16px;">{{ row.category.icon }}</span>
                      <span class="badge" [style.background]="(row.category.color || '#94a3b8') + '22'" [style.color]="row.category.color || '#94a3b8'">
                        {{ row.category.name }}
                      </span>
                    </div>
                  </td>
                  <td class="text-right">
                    <div class="pct-input">
                      <input type="number" class="form-control form-control-sm mono text-right"
                             [(ngModel)]="row.pct_of_income"
                             (input)="onPctChange(row)"
                             min="0" max="100" step="1"
                             style="width:64px;" />
                      <span class="text-muted" style="font-size:12px;">%</span>
                    </div>
                  </td>
                  <td class="text-right mono text-muted" style="font-size:12px;">
                    {{ row.suggested | currency:'MXN':'symbol':'1.0-0' }}
                  </td>
                  <td class="text-right">
                    <input type="number" class="form-control form-control-sm mono text-right"
                           [(ngModel)]="row.limit_amount"
                           (input)="onLimitChange(row)"
                           min="0" step="100"
                           style="width:110px;" />
                  </td>
                  <td class="text-right mono" [class.text-danger]="row.status === 'over'" style="font-weight:600;">
                    {{ row.actual | currency:'MXN':'symbol':'1.0-0' }}
                  </td>
                  <td class="text-right mono" [class.text-primary]="row.limit_amount > 0 && row.actual < row.limit_amount" [class.text-danger]="row.status === 'over'">
                    <span *ngIf="row.limit_amount > 0">{{ (row.limit_amount - row.actual) | currency:'MXN':'symbol':'1.0-0' }}</span>
                    <span *ngIf="row.limit_amount === 0" class="text-muted">—</span>
                  </td>
                  <td>
                    <div *ngIf="row.limit_amount > 0" class="progress-bar" style="margin:0;">
                      <div class="progress-fill"
                           [style.width.%]="row.used_pct > 100 ? 100 : row.used_pct"
                           [style.background]="row.status === 'over' ? '#ef4444' : row.status === 'warn' ? '#f59e0b' : '#10b981'">
                      </div>
                    </div>
                    <span *ngIf="row.limit_amount === 0" class="text-muted" style="font-size:11px;">Sin límite</span>
                  </td>
                  <td>
                    <span *ngIf="row.status === 'over'"  class="badge badge-danger">🔴 Excedido</span>
                    <span *ngIf="row.status === 'warn'"  class="badge badge-warning">🟡 Por exceder</span>
                    <span *ngIf="row.status === 'ok'"    class="badge badge-success">🟢 En control</span>
                    <span *ngIf="row.status === 'none'"  class="badge badge-muted">— Sin límite</span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr style="background:var(--color-surface-2);font-weight:700;">
                  <td style="padding:12px 16px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-text-muted);">Total</td>
                  <td class="text-right mono" style="padding:12px 16px;">{{ totalBudgetPct | number:'1.0-0' }}%</td>
                  <td class="text-right mono text-muted" style="padding:12px 16px;">{{ totalSuggested | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono" style="padding:12px 16px;">{{ totalLimit | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono text-danger" style="padding:12px 16px;">{{ totalActual | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono" [class.text-primary]="totalLimit - totalActual >= 0" [class.text-danger]="totalLimit - totalActual < 0" style="padding:12px 16px;">
                    <span *ngIf="totalLimit > 0">{{ (totalLimit - totalActual) | currency:'MXN':'symbol':'1.0-0' }}</span>
                  </td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Savings analysis -->
        <div class="grid-2 mb-6">

          <!-- Alertas y focos rojos -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">⚠️ Alertas de gasto</span>
            </div>
            <div *ngIf="overRows.length === 0 && warnRows.length === 0" style="padding:20px 24px;">
              <div style="text-align:center;padding:16px 0;">
                <div style="font-size:32px;margin-bottom:8px;">🎉</div>
                <div style="font-weight:600;color:var(--color-text);">Todo bajo control</div>
                <div style="font-size:13px;color:var(--color-text-muted);margin-top:4px;">Ninguna categoría supera su límite</div>
              </div>
            </div>
            <div *ngIf="overRows.length > 0 || warnRows.length > 0" style="padding:16px 24px;display:flex;flex-direction:column;gap:12px;">
              <div *ngFor="let row of overRows" class="alert-item alert-red">
                <div class="alert-icon">{{ row.category.icon }}</div>
                <div class="alert-body">
                  <div class="alert-title">{{ row.category.name }}</div>
                  <div class="alert-detail">
                    Gastaste <strong>{{ row.actual | currency:'MXN':'symbol':'1.0-0' }}</strong> de un límite de
                    <strong>{{ row.limit_amount | currency:'MXN':'symbol':'1.0-0' }}</strong>
                    <span class="badge badge-danger" style="margin-left:6px;">+{{ (row.actual - row.limit_amount) | currency:'MXN':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="progress-bar" style="margin-top:6px;">
                    <div class="progress-fill" style="width:100%;background:#ef4444;"></div>
                  </div>
                </div>
              </div>
              <div *ngFor="let row of warnRows" class="alert-item alert-yellow">
                <div class="alert-icon">{{ row.category.icon }}</div>
                <div class="alert-body">
                  <div class="alert-title">{{ row.category.name }}</div>
                  <div class="alert-detail">
                    Llevas <strong>{{ row.used_pct | number:'1.0-0' }}%</strong> del límite —
                    restan <strong>{{ (row.limit_amount - row.actual) | currency:'MXN':'symbol':'1.0-0' }}</strong>
                  </div>
                  <div class="progress-bar" style="margin-top:6px;">
                    <div class="progress-fill" [style.width.%]="row.used_pct" style="background:#f59e0b;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sugerencias de ahorro -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">💡 Sugerencias de ahorro</span>
            </div>
            <div style="padding:16px 24px;display:flex;flex-direction:column;gap:12px;">

              <!-- Resumen de ahorro -->
              <div class="saving-summary">
                <div class="saving-item">
                  <span class="saving-label">Entradas del mes</span>
                  <span class="saving-value mono text-primary">{{ totalIncome | currency:'MXN':'symbol':'1.0-0' }}</span>
                </div>
                <div class="saving-item">
                  <span class="saving-label">Gasto total</span>
                  <span class="saving-value mono text-danger">{{ totalActual | currency:'MXN':'symbol':'1.0-0' }}</span>
                </div>
                <div class="saving-item">
                  <span class="saving-label">Balance</span>
                  <span class="saving-value mono" [class.text-primary]="totalIncome - totalActual >= 0" [class.text-danger]="totalIncome - totalActual < 0">
                    {{ (totalIncome - totalActual) | currency:'MXN':'symbol':'1.0-0' }}
                  </span>
                </div>
                <div class="saving-item">
                  <span class="saving-label">Tasa de ahorro</span>
                  <span class="saving-value mono"
                        [class.text-primary]="savingsRate >= 20"
                        [class.text-warning]="savingsRate > 0 && savingsRate < 20"
                        [class.text-danger]="savingsRate <= 0">
                    {{ savingsRate | number:'1.1-1' }}%
                  </span>
                </div>
              </div>

              <!-- Regla 50/30/20 -->
              <div style="margin-top:8px;">
                <div style="font-size:12px;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">
                  Regla 50/30/20 sugerida
                </div>
                <div class="rule-item">
                  <span class="rule-label">🏠 Necesidades (50%)</span>
                  <span class="rule-value mono">{{ totalIncome * 0.5 | currency:'MXN':'symbol':'1.0-0' }}</span>
                </div>
                <div class="rule-item">
                  <span class="rule-label">🎯 Deseos (30%)</span>
                  <span class="rule-value mono">{{ totalIncome * 0.3 | currency:'MXN':'symbol':'1.0-0' }}</span>
                </div>
                <div class="rule-item">
                  <span class="rule-label">💰 Ahorro (20%)</span>
                  <span class="rule-value mono text-primary">{{ totalIncome * 0.2 | currency:'MXN':'symbol':'1.0-0' }}</span>
                </div>
              </div>

              <!-- Recomendaciones -->
              <div *ngIf="recommendations.length > 0" style="margin-top:4px;display:flex;flex-direction:column;gap:6px;">
                <div style="font-size:12px;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;">
                  Recomendaciones
                </div>
                <div *ngFor="let rec of recommendations" class="rec-item">
                  <span class="rec-icon">{{ rec.icon }}</span>
                  <span class="rec-text">{{ rec.text }}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        <!-- Per-member breakdown -->
        <div class="card" *ngIf="!selectedMemberId && members.length > 1">
          <div class="card-header">
            <span class="card-title">Gastos por persona — {{ monthName }} {{ currentYear }}</span>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Miembro</th>
                  <th class="text-right">Gasto total</th>
                  <th class="text-right">% del gasto total</th>
                  <th style="width:160px;">Participacion</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let mi of memberBreakdown">
                  <td>
                    <div class="flex items-center gap-2">
                      <div class="color-dot" [style.background]="mi.color"></div>
                      <span style="font-weight:600;">{{ mi.name }}</span>
                    </div>
                  </td>
                  <td class="text-right mono text-danger">{{ mi.expenses | currency:'MXN':'symbol':'1.0-0' }}</td>
                  <td class="text-right mono"
                      [class.text-primary]="mi.share <= 35"
                      [class.text-warning]="mi.share > 35 && mi.share <= 50"
                      [class.text-danger]="mi.share > 50">
                    {{ mi.share | number:'1.1-1' }}%
                  </td>
                  <td>
                    <div class="progress-bar" style="margin:0;">
                      <div class="progress-fill"
                           [style.width.%]="mi.share > 100 ? 100 : mi.share"
                           [style.background]="mi.share <= 35 ? '#10b981' : mi.share <= 50 ? '#f59e0b' : '#ef4444'">
                      </div>
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
    .pct-input { display:flex; align-items:center; gap:4px; justify-content:flex-end; }

    .row-over td { background: rgba(239,68,68,0.04); }
    .row-warn td { background: rgba(245,158,11,0.04); }

    /* Alert items */
    .alert-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      border-radius: var(--radius-md);
    }
    .alert-red    { background: rgba(239,68,68,0.08);  border: 1px solid rgba(239,68,68,0.2); }
    .alert-yellow { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); }
    .alert-icon { font-size:22px; flex-shrink:0; }
    .alert-body { flex:1; min-width:0; }
    .alert-title { font-size:13px; font-weight:600; color:var(--color-text); margin-bottom:2px; }
    .alert-detail { font-size:12px; color:var(--color-text-muted); }

    /* Saving summary */
    .saving-summary {
      background: var(--color-surface-2);
      border-radius: var(--radius-md);
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .saving-item { display:flex; justify-content:space-between; font-size:13px; }
    .saving-label { color:var(--color-text-muted); }
    .saving-value { font-weight:600; }

    /* 50/30/20 rule */
    .rule-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      padding: 5px 0;
      border-bottom: 1px solid var(--color-border);
    }
    .rule-item:last-child { border-bottom:none; }
    .rule-label { color:var(--color-text-muted); }
    .rule-value { font-weight:600; color:var(--color-text); }

    /* Recommendations */
    .rec-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      color: var(--color-text-muted);
      padding: 4px 0;
    }
    .rec-icon { flex-shrink:0; }
    .rec-text { line-height:1.4; }

    .form-control-sm {
      padding: 4px 8px;
      font-size: 12px;
    }

    /* AI Section */
    .toggle-group {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .toggle-btn {
      padding: 7px 14px;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      background: var(--color-surface-2);
      color: var(--color-text-muted);
      font-size: 13px;
      cursor: pointer;
      transition: var(--transition);
    }
    .toggle-btn.active {
      background: var(--color-primary);
      color: #fff;
      border-color: var(--color-primary);
      font-weight: 600;
    }
    .toggle-btn:not(.active):hover {
      background: var(--color-surface-3);
      color: var(--color-text);
    }
    .ai-income-row { background: var(--color-surface-2); border-radius: var(--radius-md); padding: 14px 16px; }
    .ai-income-preview { display: flex; align-items: center; padding: 6px 0; }
    .ai-input-row { margin-top: 8px; }

    .ai-error {
      margin-top: 10px;
      padding: 10px 14px;
      background: rgba(225,29,72,0.08);
      border: 1px solid rgba(225,29,72,0.2);
      border-radius: var(--radius-md);
      color: var(--color-danger);
      font-size: 13px;
    }

    .ai-result {
      border-top: 1px solid var(--color-border);
      padding: 20px 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .ai-result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .ai-health {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 20px;
      font-size: 13px;
    }
    .ai-health-buena    { background: rgba(16,185,129,0.1);  color: #065f46; border: 1px solid rgba(16,185,129,0.3); }
    .ai-health-regular  { background: rgba(245,158,11,0.1);  color: #92400e; border: 1px solid rgba(245,158,11,0.3); }
    .ai-health-critica  { background: rgba(225,29,72,0.1);   color: #9f1239; border: 1px solid rgba(225,29,72,0.3); }
    .ai-health-dot {
      width: 8px; height: 8px; border-radius: 50%;
    }
    .ai-health-buena   .ai-health-dot { background: #10b981; }
    .ai-health-regular .ai-health-dot { background: #f59e0b; }
    .ai-health-critica .ai-health-dot { background: #e11d48; }

    .ai-savings {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ai-summary {
      background: var(--color-surface-2);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      border-left: 3px solid var(--color-primary);
    }

    .ai-alerts { display: flex; flex-direction: column; gap: 0; }

    .ai-cat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
    }
    .ai-cat-card {
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 12px 14px;
    }
    .ai-cat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .ai-recs { display: flex; flex-direction: column; gap: 4px; }

    .spinner-sm {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class BudgetComponent implements OnInit {
  currentMonth = new Date().getMonth() + 1;
  currentYear  = new Date().getFullYear();
  selectedMemberId = '';

  members:    Member[]   = [];
  categories: Category[] = [];
  loading  = true;
  saving   = false;

  // AI suggestion
  aiManualIncome = false;
  aiIncomeInput  = 0;
  aiLoading = false;
  aiError   = '';
  aiResult: AISuggestion | null = null;

  get aiIncomeForRequest(): number {
    return this.aiManualIncome ? this.aiIncomeInput : this.totalIncome;
  }

  // Raw data
  private incomeData:  any[] = [];
  private expensesData: any[] = [];
  private savedLimits: any[] = [];

  budgetRows:      BudgetRow[] = [];
  accountIncomes:  { id: string; name: string; color: string; income: number }[] = [];
  memberBreakdown: { id: string; name: string; color: string; expenses: number; share: number }[] = [];

  get monthName()  { return MONTHS[this.currentMonth - 1]; }
  get totalIncome() {
    return this.accountIncomes.reduce((s, m) => s + m.income, 0);
  }
  get totalActual()    { return this.budgetRows.reduce((s, r) => s + r.actual, 0); }
  get totalLimit()     { return this.budgetRows.reduce((s, r) => s + r.limit_amount, 0); }
  get totalSuggested() { return this.budgetRows.reduce((s, r) => s + r.suggested, 0); }
  get totalBudgetPct() { return this.budgetRows.reduce((s, r) => s + r.pct_of_income, 0); }
  get savingsRate()    { return this.totalIncome > 0 ? (this.totalIncome - this.totalActual) / this.totalIncome * 100 : 0; }
  get overRows()  { return this.budgetRows.filter(r => r.status === 'over'); }
  get warnRows()  { return this.budgetRows.filter(r => r.status === 'warn'); }

  get recommendations(): { icon: string; text: string }[] {
    const recs: { icon: string; text: string }[] = [];
    if (this.savingsRate < 20 && this.totalIncome > 0) {
      recs.push({ icon: '💰', text: `Tu tasa de ahorro es ${this.savingsRate.toFixed(1)}%. Lo recomendado es al menos 20%.` });
    }
    for (const row of this.overRows.slice(0, 3)) {
      const excess = row.actual - row.limit_amount;
      recs.push({ icon: '✂️', text: `Reduce "${row.category.name}" en ${new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(excess)} para mantenerte en presupuesto.` });
    }
    if (this.totalBudgetPct > 80) {
      recs.push({ icon: '⚠️', text: `Tienes asignado ${this.totalBudgetPct.toFixed(0)}% del ingreso. Intenta dejar al menos 20% libre para ahorros.` });
    }
    if (recs.length === 0 && this.savingsRate >= 20) {
      recs.push({ icon: '🏆', text: `Excelente gestión. Considera invertir parte del excedente.` });
    }
    return recs;
  }

  constructor(private supabase: SupabaseService) {}

  ngOnInit() { this.load(); }

  async load() {
    this.loading = true;
    try {
      [this.members, this.categories] = await Promise.all([
        this.supabase.getMembers(),
        this.supabase.getCategories(),
      ]);
      await this.loadPeriod();
    } catch(e) { console.error(e); }
    this.loading = false;
  }

  async loadPeriod() {
    const [incAll, expAll, limits] = await Promise.all([
      this.supabase.getIncomingMovements(this.currentYear, this.currentMonth),
      this.supabase.getExpenseOccurrences(this.currentYear, this.currentMonth, this.selectedMemberId || undefined),
      this.supabase.getBudgetLimits(this.currentYear, this.currentMonth, this.selectedMemberId || undefined),
    ]);
    this.incomeData   = incAll   || [];
    this.expensesData = expAll   || [];
    this.savedLimits  = limits   || [];
    this.buildAccountIncomes();
    this.buildBudgetRows();
    this.buildMemberBreakdown();
  }

  buildAccountIncomes() {
    const byAccount = new Map<string, { id: string; name: string; color: string; income: number }>();
    for (const movement of this.incomeData) {
      const key = movement.account_id || '__no_account__';
      if (!byAccount.has(key)) {
        byAccount.set(key, {
          id: key,
          name: movement.account_name || 'Sin cuenta',
          color: movement.account_color || '#10b981',
          income: 0,
        });
      }
      byAccount.get(key)!.income += Number(movement.amount || 0);
    }
    this.accountIncomes = Array.from(byAccount.values()).filter(account => account.income > 0);
  }

  buildBudgetRows() {
    const expByCategory = new Map<string, number>();
    for (const exp of this.expensesData) {
      const key = exp.category_id || '__none__';
      expByCategory.set(key, (expByCategory.get(key) || 0) + Number(exp.amount || 0));
    }

    this.budgetRows = this.categories.map(cat => {
      const saved   = this.savedLimits.find(l => l.category_id === cat.id);
      const actual  = expByCategory.get(cat.id!) || 0;
      const income  = this.totalIncome;
      const pct     = saved ? (income > 0 ? saved.limit_amount / income * 100 : 10) : 10;
      const limit   = saved ? saved.limit_amount : 0;
      const suggested = income > 0 ? income * pct / 100 : 0;
      const used_pct  = limit > 0 ? actual / limit * 100 : 0;
      const status: BudgetRow['status'] = limit === 0 ? 'none' : actual > limit ? 'over' : used_pct >= 80 ? 'warn' : 'ok';

      return {
        category: cat,
        limit_id: saved?.id,
        limit_amount: limit,
        actual,
        pct_of_income: Math.round(pct),
        suggested,
        used_pct,
        status,
        editing: false,
        editValue: limit,
      };
    });
  }

  buildMemberBreakdown() {
    const totalExpenses = this.expensesData.reduce((sum: number, expense: any) => sum + Number(expense.amount || 0), 0);
    this.memberBreakdown = this.members.map(m => {
      const expenses = this.expensesData
        .filter(e => e.member_id === m.id)
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      return {
        id: m.id!,
        name: m.name,
        color: m.avatar_color,
        expenses,
        share: totalExpenses > 0 ? expenses / totalExpenses * 100 : 0,
      };
    }).filter(member => member.expenses > 0);
  }

  onPctChange(row: BudgetRow) {
    row.suggested    = this.totalIncome * row.pct_of_income / 100;
    row.limit_amount = Math.round(row.suggested / 100) * 100;
    this.updateRowStatus(row);
  }

  onLimitChange(row: BudgetRow) {
    row.pct_of_income = this.totalIncome > 0 ? row.limit_amount / this.totalIncome * 100 : 0;
    row.suggested     = this.totalIncome * row.pct_of_income / 100;
    this.updateRowStatus(row);
  }

  private updateRowStatus(row: BudgetRow) {
    const used = row.limit_amount > 0 ? row.actual / row.limit_amount * 100 : 0;
    row.used_pct = used;
    row.status   = row.limit_amount === 0 ? 'none' : row.actual > row.limit_amount ? 'over' : used >= 80 ? 'warn' : 'ok';
  }

  async saveAll() {
    if (!this.selectedMemberId) {
      alert('Selecciona un miembro para guardar los límites de presupuesto.');
      return;
    }
    this.saving = true;
    try {
      const toSave = this.budgetRows.filter(r => r.limit_amount > 0);
      for (const row of toSave) {
        await this.supabase.upsertBudgetLimit({
          id:           row.limit_id || undefined,
          member_id:    this.selectedMemberId,
          category_id:  row.category.id,
          month:        this.currentMonth,
          year:         this.currentYear,
          limit_amount: row.limit_amount,
        });
      }
      await this.loadPeriod();
    } catch(e) { console.error(e); }
    this.saving = false;
  }

  async generateAI() {
    const income = this.aiIncomeForRequest;
    if (income <= 0) return;

    this.aiLoading = true;
    this.aiError   = '';
    this.aiResult  = null;

    try {
      const currentExpenses = this.expensesData.map((e: any) => ({
        category_name: e.category_name || 'Sin categoría',
        amount: Number(e.amount || 0),
      }));

      const result = await this.supabase.generateBudgetSuggestion({
        income,
        categories: this.categories.map(c => ({ name: c.name, icon: c.icon })),
        members_count: this.members.length || 1,
        current_expenses: currentExpenses,
      });

      if (result?.error) {
        this.aiError = result.error;
      } else {
        this.aiResult = result as AISuggestion;
      }
    } catch (e: any) {
      this.aiError = e?.message || 'Error al generar sugerencia. Intenta de nuevo.';
    }

    this.aiLoading = false;
  }

  applyAISuggestions() {
    if (!this.aiResult) return;

    for (const suggestion of this.aiResult.categorias) {
      const row = this.budgetRows.find(r =>
        r.category.name.toLowerCase() === suggestion.nombre.toLowerCase()
      );
      if (row) {
        row.limit_amount  = suggestion.monto;
        row.pct_of_income = suggestion.porcentaje;
        row.suggested     = suggestion.monto;
        this.updateRowStatus(row);
      }
    }
  }

  onMemberChange() { this.loadPeriod(); }

  prevMonth() {
    if (this.currentMonth === 1) { this.currentMonth = 12; this.currentYear--; }
    else this.currentMonth--;
    this.loadPeriod();
  }

  nextMonth() {
    if (this.currentMonth === 12) { this.currentMonth = 1; this.currentYear++; }
    else this.currentMonth++;
    this.loadPeriod();
  }
}
