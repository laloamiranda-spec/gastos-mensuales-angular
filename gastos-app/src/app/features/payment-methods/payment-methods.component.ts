import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { BankAccount, PaymentMethod, PaymentMethodType, PAYMENT_METHOD_TYPES } from '../../core/models/models';

const PM_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Tarjetas y medios de pago</div>
          <div class="page-subtitle">Tarjetas, efectivo, transferencias y vales para tus compras</div>
        </div>
        <button class="btn btn-primary" (click)="openModal()">+ Nueva forma de pago</button>
      </div>

      <div *ngIf="loading" class="loading"><div class="spinner"></div></div>

      <div *ngIf="!loading && paymentMethods.length === 0" class="empty-state">
        <div class="empty-state-icon">TC</div>
        <div class="empty-state-title">Sin formas de pago registradas</div>
        <div class="empty-state-sub">Agrega tarjetas, efectivo o transferencias para asignarlas a tus gastos</div>
        <button class="btn btn-primary" style="margin-top:16px;" (click)="openModal()">+ Agregar forma de pago</button>
      </div>

      <div class="pm-grid" *ngIf="!loading && paymentMethods.length > 0">
        <div *ngFor="let pm of paymentMethods" class="pm-card">
          <div class="pm-card-header" [style.background]="pm.color + '22'" [style.border-color]="pm.color + '44'">
            <div class="pm-icon">{{ getTypeIcon(pm.type) }}</div>
            <div class="pm-actions">
              <button class="btn btn-ghost btn-sm btn-icon" (click)="openModal(pm)">Editar</button>
              <button class="btn btn-danger btn-sm btn-icon" (click)="delete(pm)">Borrar</button>
            </div>
          </div>
          <div class="pm-card-body">
            <div class="pm-name">{{ pm.name }}</div>
            <div class="pm-type-badge">
              <span class="badge" [style.background]="pm.color + '22'" [style.color]="pm.color">
                {{ getTypeLabel(pm.type) }}
              </span>
            </div>
            <div class="pm-details">
              <div *ngIf="pm.bank" class="pm-detail">
                <span class="pm-detail-label">Banco</span>
                <span class="pm-detail-value">{{ pm.bank }}</span>
              </div>
              <div *ngIf="pm.last_four" class="pm-detail">
                <span class="pm-detail-label">Ultimos 4</span>
                <span class="pm-detail-value mono">.... {{ pm.last_four }}</span>
              </div>
              <div *ngIf="pm.bank_account_name" class="pm-detail">
                <span class="pm-detail-label">Cuenta ligada</span>
                <span class="pm-detail-value">{{ pm.bank_account_name }}</span>
              </div>
              <div *ngIf="pm.type === 'tarjeta_credito' && pm.billing_cutoff_day" class="pm-detail">
                <span class="pm-detail-label">Corte</span>
                <span class="pm-detail-value mono">Dia {{ pm.billing_cutoff_day }}</span>
              </div>
              <div *ngIf="pm.type === 'tarjeta_credito' && pm.payment_due_day" class="pm-detail">
                <span class="pm-detail-label">Pago</span>
                <span class="pm-detail-value mono">Dia {{ pm.payment_due_day }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal" style="max-width:560px;" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">{{ editing ? 'Editar forma de pago' : 'Nueva forma de pago' }}</span>
            <button class="btn btn-ghost btn-icon" (click)="closeModal()">X</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Tipo *</label>
              <div class="type-selector">
                <button *ngFor="let t of pmTypes"
                        class="type-btn"
                        [class.active]="form.type === t.value"
                        (click)="form.type = t.value; onTypeChange()">
                  <span class="type-btn-icon">{{ t.icon }}</span>
                  <span class="type-btn-label">{{ t.label }}</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Nombre *</label>
              <input class="form-control" [(ngModel)]="form.name" [placeholder]="namePlaceholder" />
            </div>

            <div class="form-group" *ngIf="showBank">
              <label class="form-label">Banco / Institucion</label>
              <input class="form-control" [(ngModel)]="form.bank" placeholder="Ej. BBVA, Santander, HSBC..." />
            </div>

            <div class="form-group" *ngIf="showLastFour">
              <label class="form-label">Ultimos 4 digitos</label>
              <input class="form-control mono" [(ngModel)]="form.last_four" placeholder="1234" maxlength="4" />
            </div>

            <div class="form-group" *ngIf="requiresLinkedAccount">
              <label class="form-label">Cuenta ligada *</label>
              <select class="form-control" [(ngModel)]="form.bank_account_id">
                <option value="">Selecciona una cuenta...</option>
                <option *ngFor="let account of bankAccounts" [value]="account.id">
                  {{ account.name }} · {{ account.bank }}
                </option>
              </select>
              <div class="field-help">Se usara para reflejar automaticamente salidas o entradas reales de este medio de pago.</div>
            </div>

            <div class="form-row" *ngIf="showCreditCardSchedule">
              <div class="form-group">
                <label class="form-label">Dia de corte</label>
                <input class="form-control mono" type="number" [(ngModel)]="form.billing_cutoff_day" min="1" max="31" placeholder="20" />
                <div class="field-help">Dia en que cierra el estado de cuenta.</div>
              </div>
              <div class="form-group">
                <label class="form-label">Dia limite de pago</label>
                <input class="form-control mono" type="number" [(ngModel)]="form.payment_due_day" min="1" max="31" placeholder="10" />
                <div class="field-help">Dia del mes en que liquidaras la tarjeta.</div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Color identificador</label>
              <div class="color-picker">
                <button *ngFor="let c of colors"
                        class="color-dot-btn"
                        [style.background]="c"
                        [class.selected]="form.color === c"
                        (click)="form.color = c">
                </button>
              </div>
            </div>

            <div class="pm-preview" [style.border-color]="form.color + '66'" [style.background]="form.color + '11'">
              <span style="font-size:20px;">{{ getTypeIcon(form.type) }}</span>
              <div>
                <div style="font-weight:600;font-size:14px;">{{ form.name || 'Nombre de la forma de pago' }}</div>
                <div style="font-size:12px;color:var(--color-text-muted);">
                  {{ getTypeLabel(form.type) }}
                  <span *ngIf="form.bank"> · {{ form.bank }}</span>
                  <span *ngIf="requiresLinkedAccount && form.bank_account_id"> · Cuenta ligada</span>
                  <span *ngIf="form.last_four"> · .... {{ form.last_four }}</span>
                  <span *ngIf="showCreditCardSchedule && form.billing_cutoff_day"> · Corte {{ form.billing_cutoff_day }}</span>
                  <span *ngIf="showCreditCardSchedule && form.payment_due_day"> · Pago {{ form.payment_due_day }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving || !form.name || (requiresLinkedAccount && !form.bank_account_id)">
              {{ saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Agregar') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pm-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .pm-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      transition: var(--transition);
    }

    .pm-card:hover { border-color: var(--color-border-light); }

    .pm-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid;
    }

    .pm-icon { font-size: 28px; }
    .pm-actions { display: flex; gap: 4px; }
    .pm-card-body { padding: 16px; }

    .pm-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 8px;
    }

    .pm-type-badge { margin-bottom: 12px; }
    .pm-details { display: flex; flex-direction: column; gap: 6px; }

    .pm-detail {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      gap: 12px;
    }

    .pm-detail-label { color: var(--color-text-muted); }
    .pm-detail-value { color: var(--color-text); font-weight: 500; text-align: right; }

    .type-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .type-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-muted);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition);
      font-family: var(--font-body);
      text-align: left;
    }

    .type-btn:hover { border-color: var(--color-border-light); color: var(--color-text); }

    .type-btn.active {
      background: var(--color-primary-glow);
      border-color: var(--color-primary);
      color: var(--color-primary-text);
    }

    .type-btn-icon { font-size: 18px; flex-shrink: 0; }
    .color-picker { display: flex; gap: 8px; flex-wrap: wrap; }

    .color-dot-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid transparent;
      cursor: pointer;
      transition: var(--transition);
      outline: none;
    }

    .color-dot-btn.selected { border-color: var(--color-text); transform: scale(1.15); }

    .pm-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid;
      border-radius: var(--radius-md);
      margin-top: 4px;
    }

    .field-help {
      font-size: 11px;
      color: var(--color-text-muted);
      margin-top: 4px;
    }
  `]
})
export class PaymentMethodsComponent implements OnInit {
  paymentMethods: PaymentMethod[] = [];
  bankAccounts: BankAccount[] = [];
  loading = true;
  showModal = false;
  editing = false;
  saving = false;
  editId = '';
  pmTypes = PAYMENT_METHOD_TYPES;
  colors = PM_COLORS;

  form: PaymentMethod = { name: '', type: 'tarjeta_credito', color: PM_COLORS[0] };

  get showBank() { return this.form.type !== 'efectivo'; }
  get showLastFour() { return this.form.type === 'tarjeta_credito' || this.form.type === 'tarjeta_debito' || this.form.type === 'tarjeta_vales'; }
  get showCreditCardSchedule() { return this.form.type === 'tarjeta_credito'; }
  get requiresLinkedAccount() { return this.form.type === 'tarjeta_debito'; }

  get namePlaceholder() {
    switch (this.form.type) {
      case 'tarjeta_credito': return 'Ej. Visa Oro, Amex Platinum...';
      case 'tarjeta_debito': return 'Ej. Debito BBVA, Cuenta Nu...';
      case 'tarjeta_vales': return 'Ej. Edenred, Si Vale, Up...';
      case 'efectivo': return 'Ej. Efectivo, Cartera...';
      case 'transferencia': return 'Ej. SPEI HSBC, PayPal...';
    }
  }

  constructor(private supabase: SupabaseService) {}

  ngOnInit() { this.load(); }

  async load() {
    this.loading = true;
    try {
      const [methods, accounts] = await Promise.all([
        this.supabase.getPaymentMethods(),
        this.supabase.getBankAccounts(),
      ]);
      this.paymentMethods = methods || [];
      this.bankAccounts = accounts || [];
    } catch (e) {
      console.error(e);
    }
    this.loading = false;
  }

  openModal(pm?: PaymentMethod) {
    this.editing = !!pm;
    this.editId = pm?.id || '';
    this.form = pm ? { ...pm } : { name: '', type: 'tarjeta_credito', color: PM_COLORS[0] };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  onTypeChange() {
    if (!this.showLastFour) this.form.last_four = undefined;
    if (!this.showCreditCardSchedule) {
      this.form.billing_cutoff_day = undefined;
      this.form.payment_due_day = undefined;
    }
    if (this.form.type === 'efectivo') {
      this.form.bank = undefined;
      this.form.last_four = undefined;
    }
    if (!this.requiresLinkedAccount) {
      this.form.bank_account_id = undefined;
    }
  }

  async save() {
    if (!this.form.name || (this.requiresLinkedAccount && !this.form.bank_account_id)) return;
    this.saving = true;

    try {
      const payload: any = {
        name: this.form.name,
        type: this.form.type,
        color: this.form.color,
        bank: this.form.bank || null,
        last_four: this.showLastFour ? (this.form.last_four || null) : null,
        bank_account_id: this.requiresLinkedAccount ? (this.form.bank_account_id || null) : null,
        billing_cutoff_day: this.showCreditCardSchedule ? (this.normalizeDay(this.form.billing_cutoff_day) || null) : null,
        payment_due_day: this.showCreditCardSchedule ? (this.normalizeDay(this.form.payment_due_day) || null) : null,
      };

      if (this.editing) await this.supabase.updatePaymentMethod(this.editId, payload);
      else await this.supabase.createPaymentMethod(payload);

      await this.load();
      this.closeModal();
    } catch (e) {
      console.error(e);
    }

    this.saving = false;
  }

  async delete(pm: PaymentMethod) {
    if (confirm(`Eliminar "${pm.name}"?`)) {
      try {
        await this.supabase.deletePaymentMethod(pm.id!);
        await this.load();
      } catch (e) {
        console.error(e);
      }
    }
  }

  getTypeIcon(type: PaymentMethodType): string {
    return PAYMENT_METHOD_TYPES.find(item => item.value === type)?.icon || 'TC';
  }

  getTypeLabel(type: PaymentMethodType): string {
    return PAYMENT_METHOD_TYPES.find(item => item.value === type)?.label || type;
  }

  private normalizeDay(value?: number) {
    if (!value) return undefined;
    const day = Number(value);
    if (Number.isNaN(day)) return undefined;
    return Math.max(1, Math.min(31, day));
  }
}
