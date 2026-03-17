import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { BankAccount, Income, Member, MONTHS } from '../../core/models/models';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Entradas de dinero</div>
          <div class="page-subtitle">Registra el dinero que llega a tu hogar</div>
        </div>
        <div class="flex gap-2 items-center">
          <div class="month-selector">
            <button (click)="prevMonth()">‹</button>
            <span class="month-label">{{ monthName }} {{ currentYear }}</span>
            <button (click)="nextMonth()">›</button>
          </div>
          <button class="btn btn-primary" (click)="openModal()">+ Agregar ingreso</button>
        </div>
      </div>

      <!-- Totals -->
      <div class="grid-3 mb-6">
        <div class="card" *ngFor="let m of memberTotals">
          <div class="flex items-center gap-2 mb-4">
            <div class="color-dot" [style.background]="m.color"></div>
            <span class="stat-label">{{ m.name }}</span>
          </div>
          <div class="stat-value mono text-primary">{{ m.total | currency:'MXN':'symbol':'1.0-0' }}</div>
          <div class="stat-delta positive">{{ m.count }} entrada(s)</div>
        </div>
        <div class="card" style="border-color:var(--color-primary);background:var(--color-primary-glow);">
          <div class="stat-label" style="color:var(--color-primary);">TOTAL DEL MES</div>
          <div class="stat-value mono" style="color:var(--color-primary);font-size:32px;">
            {{ totalIncome | currency:'MXN':'symbol':'1.0-0' }}
          </div>
          <div class="stat-delta positive">{{ allIncome.length }} ingresos</div>
        </div>
      </div>

      <!-- Table -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Ingresos de {{ monthName }} {{ currentYear }}</span>
        </div>

        <div *ngIf="loading" class="loading"><div class="spinner"></div></div>

        <div *ngIf="!loading && allIncome.length === 0" class="empty-state">
          <div class="empty-state-icon">💰</div>
          <div class="empty-state-title">Sin ingresos este mes</div>
          <div class="text-muted" style="font-size:12px;margin-top:4px;">Agrega los ingresos proyectados</div>
          <button class="btn btn-primary" style="margin-top:16px;" (click)="openModal()">+ Agregar ingreso</button>
        </div>

        <div class="table-wrapper" *ngIf="!loading && allIncome.length > 0">
          <table>
            <thead>
              <tr>
                <th>Miembro</th>
                <th>Descripción</th>
                <th>Cuenta</th>
                <th>Mes / Año</th>
                <th class="text-right">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inc of allIncome">
                <td>
                  <div class="flex items-center gap-2">
                    <div class="color-dot" [style.background]="inc.member_color || '#10b981'"></div>
                    <span>{{ inc.member_name || 'Sin asignar' }}</span>
                  </div>
                </td>
                <td>{{ inc.description || '—' }}</td>
                <td>{{ inc.bank_account_name || 'Sin reflejar en bancos' }}</td>
                <td class="mono">{{ getMonthName(inc.month) }} {{ inc.year }}</td>
                <td class="text-right mono text-primary">{{ inc.amount | currency:'MXN':'symbol':'1.2-2' }}</td>
                <td>
                  <div class="flex gap-2">
                    <button class="btn btn-ghost btn-sm btn-icon" (click)="openModal(inc)">✏️</button>
                    <button class="btn btn-danger btn-sm btn-icon" (click)="deleteIncome(inc)">🗑️</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">{{ editing ? 'Editar ingreso' : 'Nuevo ingreso' }}</span>
            <button class="btn btn-ghost btn-icon" (click)="closeModal()">✕</button>
          </div>
            <div class="modal-body">
            <div *ngIf="saveError" class="alert alert-danger" style="margin-bottom:16px;">
              <span>!</span>
              <div>{{ saveError }}</div>
            </div>
            <div class="form-group">
              <label class="form-label">Miembro *</label>
              <select class="form-control" [(ngModel)]="form.member_id">
                <option value="">Sin asignar</option>
                <option *ngFor="let m of members" [value]="m.id">{{ m.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Descripción</label>
              <input class="form-control" [(ngModel)]="form.description" placeholder="Ej. Sueldo mensual, Freelance..." />
            </div>
            <div class="form-group">
              <label class="form-label">Monto *</label>
              <input class="form-control mono" type="number" [(ngModel)]="form.amount" placeholder="0.00" step="0.01" />
            </div>
            <div class="form-group">
              <label class="form-label">Cuenta destino</label>
              <select class="form-control" [(ngModel)]="form.bank_account_id">
                <option value="">No reflejar en bancos</option>
                <option *ngFor="let account of eligibleAccounts" [value]="account.id">
                  {{ account.name }} · {{ account.bank }} · {{ getAccountTypeLabel(account) }}
                </option>
              </select>
              <div class="text-muted" style="font-size:11px;">Solo se muestran cuentas de debito o efectivo.</div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Mes *</label>
                <select class="form-control" [(ngModel)]="form.month">
                  <option *ngFor="let m of months; let i = index" [value]="i+1">{{ m }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Año *</label>
                <input class="form-control mono" type="number" [(ngModel)]="form.year" [min]="2020" [max]="2035" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving || !form.amount">
              {{ saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Agregar') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class IncomeComponent implements OnInit {
  currentMonth = new Date().getMonth() + 1;
  currentYear = new Date().getFullYear();
  allIncome: Income[] = [];
  members: Member[] = [];
  bankAccounts: BankAccount[] = [];
  loading = true;
  showModal = false;
  editing = false;
  saving = false;
  saveError = '';
  editId = '';
  months = MONTHS;

  form: Income = { member_id: '', bank_account_id: '', amount: 0, description: '', month: this.currentMonth, year: this.currentYear };

  get monthName() { return MONTHS[this.currentMonth - 1]; }
  get totalIncome() { return this.allIncome.reduce((s, i) => s + i.amount, 0); }
  get eligibleAccounts() { return this.bankAccounts.filter(account => account.type === 'debito' || account.type === 'efectivo'); }
  get memberTotals() {
    const map = new Map<string, any>();
    for (const inc of this.allIncome) {
      const key = inc.member_name || 'Sin asignar';
      if (!map.has(key)) map.set(key, { name: key, color: inc.member_color || '#10b981', total: 0, count: 0 });
      map.get(key).total += inc.amount;
      map.get(key).count++;
    }
    return Array.from(map.values());
  }

  constructor(private supabase: SupabaseService) {}

  ngOnInit() {
    this.loadMembers();
    this.loadBankAccounts();
    this.loadIncome();
  }

  async loadMembers() {
    this.members = await this.supabase.getMembers() || [];
  }

  async loadBankAccounts() {
    this.bankAccounts = await this.supabase.getBankAccounts() || [];
  }

  async loadIncome() {
    this.loading = true;
    try { this.allIncome = await this.supabase.getIncome(this.currentYear, this.currentMonth) || []; }
    catch(e) { console.error(e); }
    this.loading = false;
  }

  prevMonth() {
    if (this.currentMonth === 1) { this.currentMonth = 12; this.currentYear--; }
    else this.currentMonth--;
    this.loadIncome();
  }

  nextMonth() {
    if (this.currentMonth === 12) { this.currentMonth = 1; this.currentYear++; }
    else this.currentMonth++;
    this.loadIncome();
  }

  openModal(inc?: Income) {
    this.editing = !!inc;
    this.editId = inc?.id || '';
    this.saveError = '';
    this.form = inc
      ? { ...inc }
      : { member_id: '', bank_account_id: '', amount: 0, description: '', month: this.currentMonth, year: this.currentYear };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.saveError = '';
  }

  async save() {
    if (!this.form.amount) return;
    this.saving = true;
    this.saveError = '';
    try {
      const payload: any = {
        member_id: this.form.member_id || null,
        amount: this.form.amount,
        description: this.form.description,
        month: this.form.month,
        year: this.form.year,
      };
      if (this.form.bank_account_id) {
        payload.bank_account_id = this.form.bank_account_id;
      }
      if (this.editing) await this.supabase.updateIncome(this.editId, payload);
      else await this.supabase.createIncome(payload);
      await this.loadIncome();
      this.closeModal();
    } catch(e: any) {
      console.error(e);
      this.saveError = e?.message || 'No se pudo guardar el ingreso.';
    }
    this.saving = false;
  }

  async deleteIncome(inc: Income) {
    if (confirm('¿Eliminar este ingreso?')) {
      try { await this.supabase.deleteIncome(inc.id!); await this.loadIncome(); }
      catch(e) { console.error(e); }
    }
  }

  getMonthName(m: number) { return MONTHS[m - 1]; }
  getAccountTypeLabel(account: BankAccount) { return account.type === 'efectivo' ? 'Efectivo' : 'Debito'; }
}
