import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { Member, AVATAR_COLORS } from '../../core/models/models';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Personas</div>
          <div class="page-subtitle">Quienes participan en los ingresos y gastos del hogar</div>
        </div>
        <button class="btn btn-primary" (click)="openModal()">+ Agregar miembro</button>
      </div>

      <div *ngIf="loading" class="loading"><div class="spinner"></div> Cargando...</div>

      <div *ngIf="!loading" class="grid-3">
        <div *ngFor="let member of members" class="card member-card">
          <div class="member-avatar" [style.background]="member.avatar_color + '22'" [style.border-color]="member.avatar_color + '44'">
            <span [style.color]="member.avatar_color" style="font-size:24px;font-weight:700;font-family:var(--font-display);">
              {{ member.name.charAt(0).toUpperCase() }}
            </span>
          </div>
          <div class="member-info">
            <div class="member-name">{{ member.name }}</div>
            <div class="member-email text-muted">{{ member.email || 'Sin correo' }}</div>
          </div>
          <div class="member-actions">
            <button class="btn btn-ghost btn-sm btn-icon" (click)="openModal(member)" title="Editar">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" (click)="confirmDelete(member)" title="Eliminar">🗑️</button>
          </div>
        </div>

        <!-- Add card -->
        <div class="card member-card add-card" (click)="openModal()">
          <div class="add-icon">+</div>
          <div class="text-muted" style="font-size:13px;">Agregar miembro</div>
        </div>
      </div>

      <!-- MODAL -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">{{ editing ? 'Editar miembro' : 'Nuevo miembro' }}</span>
            <button class="btn btn-ghost btn-icon" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nombre *</label>
              <input class="form-control" [(ngModel)]="form.name" placeholder="Ej. Juan García" />
            </div>
            <div class="form-group">
              <label class="form-label">Correo electrónico</label>
              <input class="form-control" type="email" [(ngModel)]="form.email" placeholder="Ej. juan@correo.com" />
            </div>
            <div class="form-group">
              <label class="form-label">Color de avatar</label>
              <div class="color-picker">
                <div *ngFor="let color of avatarColors"
                     class="color-option"
                     [style.background]="color"
                     [class.selected]="form.avatar_color === color"
                     (click)="form.avatar_color = color"></div>
              </div>
            </div>
            <div class="member-preview" [style.border-color]="form.avatar_color + '44'">
              <div class="member-avatar" [style.background]="form.avatar_color + '22'" [style.border-color]="form.avatar_color + '44'">
                <span [style.color]="form.avatar_color" style="font-size:22px;font-weight:700;font-family:var(--font-display);">
                  {{ (form.name || 'M').charAt(0).toUpperCase() }}
                </span>
              </div>
              <span style="font-size:14px;font-weight:600;">{{ form.name || 'Nombre del miembro' }}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving || !form.name">
              {{ saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear miembro') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .member-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      padding: 28px 20px;
      position: relative;
    }

    .member-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 2px solid;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .member-name {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: var(--color-accent);
    }

    .member-email { font-size: 12px; }

    .member-actions {
      display: flex;
      gap: 8px;
    }

    .add-card {
      border-style: dashed;
      cursor: pointer;
      opacity: 0.6;
      transition: var(--transition);
    }

    .add-card:hover {
      opacity: 1;
      border-color: var(--color-primary);
    }

    .add-icon {
      font-size: 32px;
      color: var(--color-text-muted);
    }

    .color-picker {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .color-option {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      transition: var(--transition);
      border: 2px solid transparent;
    }

    .color-option:hover, .color-option.selected {
      transform: scale(1.2);
      border-color: white;
    }

    .member-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--color-surface-2);
      border-radius: var(--radius-md);
      border: 1px solid;
    }
  `]
})
export class MembersComponent implements OnInit {
  members: Member[] = [];
  loading = true;
  showModal = false;
  editing = false;
  saving = false;
  editId = '';
  avatarColors = AVATAR_COLORS;

  form: Member = { name: '', email: '', avatar_color: '#10b981' };

  constructor(private supabase: SupabaseService) {}

  ngOnInit() { this.load(); }

  async load() {
    this.loading = true;
    try { this.members = await this.supabase.getMembers() || []; }
    catch(e) { console.error(e); }
    this.loading = false;
  }

  openModal(member?: Member) {
    this.editing = !!member;
    this.editId = member?.id || '';
    this.form = member ? { ...member } : { name: '', email: '', avatar_color: '#10b981' };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  async save() {
    if (!this.form.name) return;
    this.saving = true;
    try {
      if (this.editing) await this.supabase.updateMember(this.editId, this.form);
      else await this.supabase.createMember(this.form);
      await this.load();
      this.closeModal();
    } catch(e) { console.error(e); }
    this.saving = false;
  }

  async confirmDelete(member: Member) {
    if (confirm(`¿Eliminar a ${member.name}? Se eliminarán también sus ingresos.`)) {
      try { await this.supabase.deleteMember(member.id!); await this.load(); }
      catch(e) { console.error(e); }
    }
  }
}
