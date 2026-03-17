import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { BankAccount, BankAccountType, BankMovement, Category, BANK_ACCOUNT_TYPES, MONTHS } from '../../core/models/models';

const BANK_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#84cc16'];

@Component({
  selector: 'app-bank',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Movimientos y cuentas</div>
          <div class="page-subtitle">Controla entradas, salidas, traspasos y apartado para tarjetas</div>
        </div>
        <div class="flex gap-2" style="flex-wrap:wrap;">
          <div class="month-selector">
            <button (click)="prevMonth()"><</button>
            <span class="month-label">{{ monthName }} {{ currentYear }}</span>
            <button (click)="nextMonth()">></button>
          </div>
          <button class="btn btn-secondary" (click)="openAccountModal()">Nueva cuenta</button>
          <button class="btn btn-secondary" (click)="openTransferModal()">Traspaso</button>
          <button class="btn btn-primary" (click)="openMovementModal()">+ Movimiento</button>
        </div>
      </div>

      <div *ngIf="loading" class="loading"><div class="spinner"></div></div>

      <ng-container *ngIf="!loading">
        <div class="accounts-grid mb-6">
          <div class="account-card account-card--total" [class.selected]="!selectedAccountId" (click)="selectAccount('')">
            <div class="account-card-top">
              <span class="account-type-icon">BA</span>
              <span class="account-tag">Total</span>
            </div>
            <div class="account-balance">{{ totalBalance | currency:'MXN':'symbol':'1.2-2' }}</div>
            <div class="account-name">Todas las cuentas</div>
          </div>
          <div *ngFor="let acc of accounts" class="account-card" [class.selected]="selectedAccountId === acc.id" [style.--accent]="acc.color" (click)="selectAccount(acc.id!)">
            <div class="account-card-top">
              <span class="account-type-icon">{{ getAccountIcon(acc.type) }}</span>
              <div class="flex gap-1">
                <button class="btn btn-ghost btn-icon btn-xs" (click)="openAccountModal(acc); $event.stopPropagation()">Ed</button>
                <button class="btn btn-ghost btn-icon btn-xs" (click)="deleteAccount(acc); $event.stopPropagation()">X</button>
              </div>
            </div>
            <div class="account-balance" [style.color]="acc.color">{{ acc.balance | currency:'MXN':'symbol':'1.2-2' }}</div>
            <div class="account-name">{{ acc.name }}</div>
            <div class="account-meta">
              <span>{{ acc.bank }}</span>
              <span class="account-tag">{{ getAccountLabel(acc.type) }}</span>
            </div>
          </div>
        </div>

        <div class="grid-4 mb-6">
          <div class="card"><div class="stat-label">Entradas {{ monthName }}</div><div class="stat-value mono text-primary">{{ totalIn | currency:'MXN':'symbol':'1.0-0' }}</div></div>
          <div class="card"><div class="stat-label">Salidas {{ monthName }}</div><div class="stat-value mono text-danger">{{ totalOut | currency:'MXN':'symbol':'1.0-0' }}</div></div>
          <div class="card"><div class="stat-label">Apartado tarjetas</div><div class="stat-value mono text-danger">{{ totalCardReserve | currency:'MXN':'symbol':'1.0-0' }}</div></div>
          <div class="card"><div class="stat-label">Libre despues de apartar</div><div class="stat-value mono" [class.text-primary]="freeAfterReserve >= 0" [class.text-danger]="freeAfterReserve < 0">{{ freeAfterReserve | currency:'MXN':'symbol':'1.0-0' }}</div></div>
        </div>

        <div class="card mb-6">
          <div class="card-header">
            <span class="card-title">Apartado recomendado para tarjetas</span>
            <span class="badge badge-muted mono">{{ cardReserveRows.length }} fecha{{ cardReserveRows.length !== 1 ? 's' : '' }}</span>
          </div>
          <div *ngIf="cardReserveRows.length === 0" class="empty-state">
            <div class="empty-state-title">Sin liquidaciones de tarjeta para este mes</div>
          </div>
          <div class="table-wrapper" *ngIf="cardReserveRows.length > 0">
            <table>
              <thead><tr><th>Fecha limite</th><th>Tarjeta</th><th>Compras</th><th class="text-right">Monto</th></tr></thead>
              <tbody>
                <tr *ngFor="let reserve of cardReserveRows">
                  <td class="mono">{{ reserve.dueDate | date:'dd/MM/yyyy' }}</td>
                  <td>{{ reserve.methodName }}</td>
                  <td>{{ reserve.count }}</td>
                  <td class="text-right mono text-danger">{{ reserve.total | currency:'MXN':'symbol':'1.0-0' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">Movimientos{{ selectedAccountId ? ' - ' + selectedAccountName : '' }}</span>
            <div class="flex gap-2 items-center">
              <div class="tabs" style="margin:0;padding:2px;gap:2px;">
                <button class="tab" [class.active]="typeFilter==='all'" (click)="typeFilter='all'; filterMovements()">Todos</button>
                <button class="tab" [class.active]="typeFilter==='ingreso'" (click)="typeFilter='ingreso'; filterMovements()">Entradas</button>
                <button class="tab" [class.active]="typeFilter==='egreso'" (click)="typeFilter='egreso'; filterMovements()">Salidas</button>
              </div>
              <select class="form-control" [(ngModel)]="categoryFilter" (change)="filterMovements()" style="width:160px;padding:6px 10px;font-size:12px;">
                <option value="">Todas las categorias</option>
                <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
              </select>
            </div>
          </div>
          <div class="table-wrapper" *ngIf="filtered.length > 0">
            <table>
              <thead><tr><th>Fecha</th><th>Descripcion</th><th *ngIf="!selectedAccountId">Cuenta</th><th>Tipo</th><th class="text-right">Monto</th><th></th></tr></thead>
              <tbody>
                <tr *ngFor="let mov of filtered">
                  <td class="mono">{{ mov.date | date:'dd/MM/yyyy' }}</td>
                  <td><div>{{ mov.description }}</div><div *ngIf="mov.notes" class="text-muted" style="font-size:11px;">{{ mov.notes }}</div></td>
                  <td *ngIf="!selectedAccountId">{{ mov.account_name }}</td>
                  <td>{{ mov.type === 'ingreso' ? 'Entrada' : 'Salida' }}</td>
                  <td class="text-right mono" [class.text-primary]="mov.type==='ingreso'" [class.text-danger]="mov.type==='egreso'">{{ mov.amount | currency:'MXN':'symbol':'1.2-2' }}</td>
                  <td>
                    <button *ngIf="!mov.transfer_group_id" class="btn btn-ghost btn-sm btn-icon" (click)="openMovementModal(mov)">Ed</button>
                    <button class="btn btn-danger btn-sm btn-icon" (click)="deleteMovement(mov)">X</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="filtered.length === 0" class="empty-state"><div class="empty-state-title">Sin movimientos en este periodo</div></div>
        </div>
      </ng-container>

      <div class="modal-overlay" *ngIf="showAccountModal" (click)="closeAccountModal()">
        <div class="modal" style="max-width:480px;" (click)="$event.stopPropagation()">
          <div class="modal-header"><span class="modal-title">{{ editingAccount ? 'Editar cuenta' : 'Nueva cuenta bancaria' }}</span><button class="btn btn-ghost btn-icon" (click)="closeAccountModal()">X</button></div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group"><label class="form-label">Banco *</label><input class="form-control" [(ngModel)]="accountForm.bank" /></div>
              <div class="form-group"><label class="form-label">Nombre *</label><input class="form-control" [(ngModel)]="accountForm.name" /></div>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo *</label>
              <div class="type-selector">
                <button *ngFor="let t of accountTypes" class="type-btn" [class.active]="accountForm.type === t.value" (click)="accountForm.type = t.value">
                  <span>{{ t.icon }}</span><span>{{ t.label }}</span>
                </button>
              </div>
            </div>
            <div class="form-group"><label class="form-label">Saldo actual</label><input class="form-control mono" type="number" [(ngModel)]="accountForm.balance" step="0.01" /></div>
            <div class="form-group">
              <label class="form-label">Color</label>
              <div class="color-picker"><button *ngFor="let c of colors" class="color-dot-btn" [style.background]="c" [class.selected]="accountForm.color === c" (click)="accountForm.color = c"></button></div>
            </div>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" (click)="closeAccountModal()">Cancelar</button><button class="btn btn-primary" (click)="saveAccount()" [disabled]="savingAccount || !accountForm.name || !accountForm.bank">{{ savingAccount ? 'Guardando...' : 'Guardar' }}</button></div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showMovementModal" (click)="closeMovementModal()">
        <div class="modal" style="max-width:540px;" (click)="$event.stopPropagation()">
          <div class="modal-header"><span class="modal-title">{{ editingMovement ? 'Editar movimiento' : 'Nuevo movimiento' }}</span><button class="btn btn-ghost btn-icon" (click)="closeMovementModal()">X</button></div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Tipo *</label>
              <div class="flex gap-2">
                <button class="btn" style="flex:1;" [class.btn-primary]="movForm.type==='egreso'" [class.btn-secondary]="movForm.type!=='egreso'" (click)="movForm.type='egreso'">Salida</button>
                <button class="btn" style="flex:1;" [class.btn-primary]="movForm.type==='ingreso'" [class.btn-secondary]="movForm.type!=='ingreso'" (click)="movForm.type='ingreso'">Entrada</button>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Cuenta *</label><select class="form-control" [(ngModel)]="movForm.account_id"><option value="">Seleccionar...</option><option *ngFor="let acc of accounts" [value]="acc.id">{{ acc.name }} - {{ acc.bank }}</option></select></div>
              <div class="form-group"><label class="form-label">Fecha *</label><input class="form-control mono" type="date" [(ngModel)]="movForm.date" /></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Descripcion *</label><input class="form-control" [(ngModel)]="movForm.description" /></div>
              <div class="form-group"><label class="form-label">Monto *</label><input class="form-control mono" type="number" [(ngModel)]="movForm.amount" step="0.01" min="0" /></div>
            </div>
            <div class="form-group"><label class="form-label">Categoria</label><select class="form-control" [(ngModel)]="movForm.category_id"><option value="">Sin categoria</option><option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option></select></div>
            <div class="form-group"><label class="form-label">Notas</label><input class="form-control" [(ngModel)]="movForm.notes" /></div>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" (click)="closeMovementModal()">Cancelar</button><button class="btn btn-primary" (click)="saveMovement()" [disabled]="savingMovement || !movForm.account_id || !movForm.description || !movForm.amount">{{ savingMovement ? 'Guardando...' : 'Guardar' }}</button></div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showTransferModal" (click)="closeTransferModal()">
        <div class="modal" style="max-width:520px;" (click)="$event.stopPropagation()">
          <div class="modal-header"><span class="modal-title">Nuevo traspaso</span><button class="btn btn-ghost btn-icon" (click)="closeTransferModal()">X</button></div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group"><label class="form-label">Cuenta origen *</label><select class="form-control" [(ngModel)]="transferForm.from_account_id"><option value="">Seleccionar...</option><option *ngFor="let acc of accounts" [value]="acc.id">{{ acc.name }} - {{ acc.bank }}</option></select></div>
              <div class="form-group"><label class="form-label">Cuenta destino *</label><select class="form-control" [(ngModel)]="transferForm.to_account_id"><option value="">Seleccionar...</option><option *ngFor="let acc of accounts" [value]="acc.id">{{ acc.name }} - {{ acc.bank }}</option></select></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Monto *</label><input class="form-control mono" type="number" [(ngModel)]="transferForm.amount" step="0.01" min="0" /></div>
              <div class="form-group"><label class="form-label">Fecha *</label><input class="form-control mono" type="date" [(ngModel)]="transferForm.date" /></div>
            </div>
            <div class="form-group"><label class="form-label">Notas</label><input class="form-control" [(ngModel)]="transferForm.notes" /></div>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" (click)="closeTransferModal()">Cancelar</button><button class="btn btn-primary" (click)="saveTransfer()" [disabled]="savingTransfer || !transferForm.from_account_id || !transferForm.to_account_id || !transferForm.amount || transferForm.from_account_id === transferForm.to_account_id">{{ savingTransfer ? 'Guardando...' : 'Crear traspaso' }}</button></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .accounts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px; }
    .account-card { background: var(--color-surface); border: 1.5px solid var(--color-border); border-radius: var(--radius-lg); padding: 18px; cursor: pointer; transition: var(--transition); box-shadow: var(--shadow-card); position: relative; }
    .account-card:hover { border-color: var(--color-border-light); box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .account-card.selected { border-color: var(--accent, var(--color-primary)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, var(--color-primary)) 15%, transparent); }
    .account-card--total { border-style: dashed; background: var(--color-surface-2); }
    .account-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
    .account-type-icon { font-size: 24px; }
    .account-balance { font-family: var(--font-mono); font-size: 18px; font-weight: 600; color: var(--color-accent); margin-bottom: 4px; letter-spacing: -0.01em; }
    .account-name { font-size: 13px; font-weight: 600; color: var(--color-text); margin-bottom: 4px; }
    .account-meta { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: var(--color-text-muted); }
    .account-tag { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; background: var(--color-surface-3); color: var(--color-text-muted); padding: 2px 7px; border-radius: 100px; }
    .type-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .type-btn { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--color-surface-2); border: 1.5px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text-muted); font-family: var(--font-body); cursor: pointer; transition: var(--transition); text-align: left; }
    .type-btn.active { background: var(--color-primary-glow); border-color: var(--color-primary); color: var(--color-primary); font-weight: 600; }
    .color-picker { display: flex; gap: 8px; flex-wrap: wrap; }
    .color-dot-btn { width: 28px; height: 28px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; transition: var(--transition); outline: none; }
    .color-dot-btn.selected { border-color: var(--color-accent); transform: scale(1.2); }
    .btn-xs { padding: 3px 5px; font-size: 11px; }
  `]
})
export class BankComponent implements OnInit {
  currentMonth = new Date().getMonth() + 1;
  currentYear = new Date().getFullYear();
  accounts: BankAccount[] = [];
  categories: Category[] = [];
  allMovements: BankMovement[] = [];
  filtered: BankMovement[] = [];
  cardReserveRows: { methodId: string; methodName: string; methodColor?: string; dueDate: string; total: number; count: number }[] = [];
  loading = false;
  selectedAccountId = '';
  typeFilter = 'all';
  categoryFilter = '';
  accountTypes = BANK_ACCOUNT_TYPES;
  colors = BANK_COLORS;
  showAccountModal = false;
  editingAccount = false;
  savingAccount = false;
  editAccountId = '';
  accountForm: BankAccount = { name: '', bank: '', type: 'debito', balance: 0, color: BANK_COLORS[0] };
  showMovementModal = false;
  editingMovement = false;
  savingMovement = false;
  editMovementId = '';
  movForm: BankMovement = { account_id: '', description: '', amount: 0, type: 'egreso', date: this.today() };
  showTransferModal = false;
  savingTransfer = false;
  transferForm = { from_account_id: '', to_account_id: '', amount: 0, date: this.today(), notes: '' };

  get monthName() { return MONTHS[this.currentMonth - 1]; }
  get movIn() { return this.filtered.filter(m => m.type === 'ingreso'); }
  get movOut() { return this.filtered.filter(m => m.type === 'egreso'); }
  get totalIn() { return this.movIn.reduce((s, m) => s + m.amount, 0); }
  get totalOut() { return this.movOut.reduce((s, m) => s + m.amount, 0); }
  get monthBalance() { return this.totalIn - this.totalOut; }
  get totalBalance() { return this.accounts.reduce((s, a) => s + a.balance, 0); }
  get liquidBalance() { return this.accounts.filter(a => a.type !== 'credito').reduce((s, a) => s + a.balance, 0); }
  get totalCardReserve() { return this.cardReserveRows.reduce((sum, row) => sum + row.total, 0); }
  get freeAfterReserve() { return this.liquidBalance - this.totalCardReserve; }
  get selectedAccountName() { return this.accounts.find(a => a.id === this.selectedAccountId)?.name || ''; }
  get nextCardReserveLabel() {
    if (!this.cardReserveRows.length) return 'Sin pagos de tarjeta este mes';
    const next = this.cardReserveRows[0];
    return `${next.methodName} · ${this.formatDueDate(next.dueDate)}`;
  }
  get topCategory() {
    const map = new Map<string, any>();
    for (const m of this.filtered.filter(m => m.type === 'egreso')) {
      if (!m.category_name) continue;
      if (!map.has(m.category_name)) map.set(m.category_name, { name: m.category_name, icon: m.category_icon, total: 0 });
      map.get(m.category_name).total += m.amount;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)[0] || null;
  }

  constructor(private supabase: SupabaseService) {}

  ngOnInit() { this.load(); }

  async load() {
    this.loading = true;
    try {
      const [accounts, categories] = await Promise.all([this.supabase.getBankAccounts(), this.supabase.getCategories()]);
      this.accounts = accounts || [];
      this.categories = categories || [];
      await Promise.all([this.loadMovements(), this.loadCardReserves()]);
    } catch (e) {
      console.error(e);
    }
    this.loading = false;
  }

  async loadMovements() {
    this.allMovements = await this.supabase.getBankMovements(this.selectedAccountId || undefined, this.currentYear, this.currentMonth) || [];
    this.filterMovements();
  }

  async loadCardReserves() {
    this.cardReserveRows = await this.supabase.getCreditCardReserveSummary(this.currentYear, this.currentMonth) || [];
  }

  filterMovements() {
    let result = [...this.allMovements];
    if (this.typeFilter !== 'all') result = result.filter(m => m.type === this.typeFilter);
    if (this.categoryFilter) result = result.filter(m => m.category_id === this.categoryFilter);
    this.filtered = result;
  }

  selectAccount(id: string) {
    this.selectedAccountId = id;
    this.loadMovements();
  }

  prevMonth() {
    if (this.currentMonth === 1) { this.currentMonth = 12; this.currentYear--; }
    else this.currentMonth--;
    this.loadMovements();
    this.loadCardReserves();
  }

  nextMonth() {
    if (this.currentMonth === 12) { this.currentMonth = 1; this.currentYear++; }
    else this.currentMonth++;
    this.loadMovements();
    this.loadCardReserves();
  }

  openAccountModal(acc?: BankAccount) {
    this.editingAccount = !!acc;
    this.editAccountId = acc?.id || '';
    this.accountForm = acc ? { ...acc } : { name: '', bank: '', type: 'debito', balance: 0, color: BANK_COLORS[0] };
    this.showAccountModal = true;
  }

  closeAccountModal() { this.showAccountModal = false; }

  async saveAccount() {
    if (!this.accountForm.name || !this.accountForm.bank) return;
    this.savingAccount = true;
    try {
      const payload = { name: this.accountForm.name, bank: this.accountForm.bank, type: this.accountForm.type, balance: this.accountForm.balance, color: this.accountForm.color, is_active: true };
      if (this.editingAccount) await this.supabase.updateBankAccount(this.editAccountId, payload);
      else await this.supabase.createBankAccount(payload);
      await this.load();
      this.closeAccountModal();
    } catch (e) {
      console.error(e);
    }
    this.savingAccount = false;
  }

  async deleteAccount(acc: BankAccount) {
    if (confirm(`Desactivar la cuenta "${acc.name}"?`)) {
      try {
        await this.supabase.deleteBankAccount(acc.id!);
        await this.load();
      } catch (e) {
        console.error(e);
      }
    }
  }

  openMovementModal(mov?: BankMovement) {
    this.editingMovement = !!mov;
    this.editMovementId = mov?.id || '';
    this.movForm = mov ? { ...mov } : { account_id: this.selectedAccountId || (this.accounts[0]?.id || ''), description: '', amount: 0, type: 'egreso', date: this.today(), category_id: '', notes: '' };
    this.showMovementModal = true;
  }

  closeMovementModal() { this.showMovementModal = false; }

  async saveMovement() {
    if (!this.movForm.account_id || !this.movForm.description || !this.movForm.amount) return;
    this.savingMovement = true;
    try {
      const payload = { account_id: this.movForm.account_id, category_id: this.movForm.category_id || null, description: this.movForm.description, amount: this.movForm.amount, type: this.movForm.type, date: this.movForm.date, notes: this.movForm.notes || null };
      if (this.editingMovement) await this.supabase.updateBankMovement(this.editMovementId, payload);
      else await this.supabase.createBankMovement(payload);
      await this.loadMovements();
      this.closeMovementModal();
    } catch (e) {
      console.error(e);
    }
    this.savingMovement = false;
  }

  openTransferModal() {
    this.transferForm = { from_account_id: this.selectedAccountId || '', to_account_id: '', amount: 0, date: this.today(), notes: '' };
    this.showTransferModal = true;
  }

  closeTransferModal() { this.showTransferModal = false; }

  async saveTransfer() {
    if (!this.transferForm.from_account_id || !this.transferForm.to_account_id || !this.transferForm.amount) return;
    this.savingTransfer = true;
    try {
      await this.supabase.createTransferBetweenAccounts({
        from_account_id: this.transferForm.from_account_id,
        to_account_id: this.transferForm.to_account_id,
        amount: this.transferForm.amount,
        date: this.transferForm.date,
        notes: this.transferForm.notes || null,
      });
      await this.load();
      this.closeTransferModal();
    } catch (e) {
      console.error(e);
    }
    this.savingTransfer = false;
  }

  async deleteMovement(mov: BankMovement) {
    if (confirm(`Eliminar "${mov.description}"?`)) {
      try {
        await this.supabase.deleteBankMovement(mov.id!);
        await this.loadMovements();
      } catch (e) {
        console.error(e);
      }
    }
  }

  getAccountIcon(type: BankAccountType): string {
    return BANK_ACCOUNT_TYPES.find(t => t.value === type)?.icon || 'BA';
  }

  getAccountLabel(type: BankAccountType): string {
    return BANK_ACCOUNT_TYPES.find(t => t.value === type)?.label || type;
  }

  today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatDueDate(value: string) {
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(new Date(`${value}T00:00:00`));
  }
}
