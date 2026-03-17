import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { Household, HouseholdInvite, HouseholdMembership, Member } from '../../core/models/models';

@Component({
  selector: 'app-households',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Hogar y accesos</div>
          <div class="page-subtitle">Administra hogares, miembros reales del hogar, invitaciones y accesos de la plataforma</div>
        </div>
        <button class="btn btn-primary" (click)="openHouseholdModal()">+ Nuevo hogar</button>
      </div>

      <div *ngIf="loading" class="loading"><div class="spinner"></div></div>

      <ng-container *ngIf="!loading">
        <div class="grid-4 mb-6">
          <div class="card">
            <div class="stat-label">Hogares activos</div>
            <div class="stat-value mono text-primary">{{ households.length }}</div>
          </div>
          <div class="card">
            <div class="stat-label">Miembros del hogar</div>
            <div class="stat-value mono">{{ members.length }}</div>
          </div>
          <div class="card">
            <div class="stat-label">Usuarios con acceso</div>
            <div class="stat-value mono text-primary">{{ memberships.length }}</div>
          </div>
          <div class="card">
            <div class="stat-label">Invitaciones pendientes</div>
            <div class="stat-value mono text-warning">{{ pendingInvites }}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Miembros del hogar</span>
            </div>
            <div class="table-wrapper" *ngIf="members.length > 0">
              <table>
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>Correo</th>
                    <th>Cuenta ligada</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let member of members">
                    <td>{{ member.name }}</td>
                    <td>{{ member.email || '-' }}</td>
                    <td>{{ member.has_access ? (member.profile_name || member.profile_email || 'Si') : 'Sin acceso aun' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div *ngIf="members.length === 0" class="empty-state">
              <div class="empty-state-title">Sin miembros dados de alta en este hogar</div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">Usuarios con acceso</span>
            </div>
            <div class="table-wrapper" *ngIf="memberships.length > 0">
              <table>
                <thead>
                  <tr>
                    <th>Hogar</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let membership of memberships">
                    <td>{{ membership.household_name || membership.household_id }}</td>
                    <td>{{ membership.user_name || membership.user_email || membership.user_id }}</td>
                    <td class="mono">{{ membership.role }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div *ngIf="memberships.length === 0" class="empty-state">
              <div class="empty-state-title">Sin usuarios con acceso</div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:24px;">
          <div class="card-header">
            <span class="card-title">Centro de invitaciones</span>
            <button class="btn btn-secondary btn-sm" (click)="openInviteModal()">Invitar por correo</button>
          </div>

          <div class="invite-advice">
            Recomendacion de arquitectura: el envio real debe salir desde backend seguro. Para esta fase la app ya genera token, liga y borrador de correo.
          </div>

          <div class="table-wrapper" *ngIf="invites.length > 0">
            <table>
              <thead>
                <tr>
                  <th>Hogar</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Vence</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let invite of invites">
                  <td>{{ invite.household_name || invite.household_id }}</td>
                  <td>{{ invite.email }}</td>
                  <td class="mono">{{ invite.role }}</td>
                  <td>{{ invite.status }}</td>
                  <td>{{ invite.expires_at ? (invite.expires_at | date:'dd/MM/yyyy') : '-' }}</td>
                  <td>
                    <div class="invite-actions">
                      <button class="btn btn-secondary btn-sm" (click)="copyInviteLink(invite)" *ngIf="invite.invite_link">Copiar liga</button>
                      <button class="btn btn-ghost btn-sm" (click)="openEmailDraft(invite)" *ngIf="invite.invite_link">Abrir correo</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="invites.length === 0" class="empty-state">
            <div class="empty-state-title">Sin invitaciones</div>
          </div>
        </div>
      </ng-container>

      <div class="modal-overlay" *ngIf="showHouseholdModal" (click)="closeHouseholdModal()">
        <div class="modal" style="max-width:460px;" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">Nuevo hogar</span>
            <button class="btn btn-ghost btn-icon" (click)="closeHouseholdModal()">X</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nombre *</label>
              <input class="form-control" [(ngModel)]="householdForm.name" placeholder="Ej. FUBA, Casa Centro..." />
            </div>
            <div class="form-group">
              <label class="form-label">Slug</label>
              <input class="form-control mono" [(ngModel)]="householdForm.slug" placeholder="fuba" />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeHouseholdModal()">Cancelar</button>
            <button class="btn btn-primary" (click)="saveHousehold()" [disabled]="saving || !householdForm.name">Guardar</button>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showInviteModal" (click)="closeInviteModal()">
        <div class="modal" style="max-width:520px;" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">Nueva invitacion por correo</span>
            <button class="btn btn-ghost btn-icon" (click)="closeInviteModal()">X</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Hogar *</label>
              <select class="form-control" [(ngModel)]="inviteForm.household_id">
                <option value="">Seleccionar...</option>
                <option *ngFor="let household of households" [value]="household.id">{{ household.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Correo *</label>
              <input class="form-control" [(ngModel)]="inviteForm.email" placeholder="persona@correo.com" />
            </div>
            <div class="form-group">
              <label class="form-label">Rol *</label>
              <select class="form-control" [(ngModel)]="inviteForm.role">
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
                <option value="limited">limited</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Mensaje personal</label>
              <textarea
                class="form-control"
                rows="4"
                [(ngModel)]="inviteForm.message"
                placeholder="Ej. Te invito a ver y colaborar en los gastos de nuestro hogar."
              ></textarea>
            </div>

            <div class="invite-preview" *ngIf="invitePreview">
              <div class="card-title" style="margin-bottom:10px;">Invitacion generada</div>
              <div class="invite-preview-copy">
                Ya tienes una liga segura lista para compartir. Puedes copiarla o abrir tu cliente de correo.
              </div>
              <div class="mono invite-preview-link">{{ invitePreview.invite_link }}</div>
              <div class="invite-actions">
                <button class="btn btn-secondary btn-sm" (click)="copyInviteLink(invitePreview)">Copiar liga</button>
                <button class="btn btn-primary btn-sm" (click)="openEmailDraft(invitePreview)">Abrir correo</button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeInviteModal()">Cancelar</button>
            <button class="btn btn-primary" (click)="saveInvite()" [disabled]="saving || !inviteForm.household_id || !inviteForm.email">
              {{ saving ? 'Generando...' : 'Generar invitacion' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 18px;
    }

    .invite-advice {
      margin-bottom: 14px;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(5,150,105,0.08);
      border: 1px solid rgba(16,185,129,0.14);
      color: var(--color-text-muted);
      font-size: 13px;
    }

    .invite-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .invite-preview {
      margin-top: 10px;
      padding: 16px;
      border-radius: 18px;
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
    }

    .invite-preview-copy {
      font-size: 13px;
      color: var(--color-text-muted);
      margin-bottom: 10px;
    }

    .invite-preview-link {
      font-size: 12px;
      word-break: break-all;
      margin-bottom: 12px;
    }

    @media (max-width: 1100px) {
      .grid-4 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 720px) {
      .grid-4 {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HouseholdsComponent implements OnInit {
  households: Household[] = [];
  members: Member[] = [];
  memberships: HouseholdMembership[] = [];
  invites: HouseholdInvite[] = [];
  loading = true;
  saving = false;
  showHouseholdModal = false;
  showInviteModal = false;
  invitePreview: HouseholdInvite | null = null;

  householdForm: Household = { name: '', slug: '' };
  inviteForm = { household_id: '', email: '', role: 'viewer', status: 'pending' as const, message: '' };

  get pendingInvites() {
    return this.invites.filter(invite => invite.status === 'pending').length;
  }

  constructor(private supabase: SupabaseService) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      const households = await this.supabase.getHouseholds();
      this.households = households || [];
      const storedHouseholdId = localStorage.getItem('finanzas_casa_household_id');
      const activeHouseholdId =
        this.households.find(household => household.id === storedHouseholdId)?.id
        || this.households[0]?.id
        || undefined;

      if (!activeHouseholdId) {
        localStorage.removeItem('finanzas_casa_household_id');
        this.members = [];
        this.memberships = [];
        this.invites = [];
        this.loading = false;
        return;
      }

      const [members, memberships, invites] = await Promise.all([
        this.supabase.getMembers(activeHouseholdId),
        this.supabase.getHouseholdMemberships(activeHouseholdId),
        this.supabase.getHouseholdInvites(activeHouseholdId),
      ]);

      localStorage.setItem('finanzas_casa_household_id', activeHouseholdId);
      this.members = members || [];
      this.memberships = memberships || [];
      this.invites = invites || [];
    } catch (e) {
      console.error(e);
    }
    this.loading = false;
  }

  openHouseholdModal() {
    this.householdForm = { name: '', slug: '' };
    this.showHouseholdModal = true;
  }

  closeHouseholdModal() {
    this.showHouseholdModal = false;
  }

  openInviteModal() {
    this.inviteForm = { household_id: '', email: '', role: 'viewer', status: 'pending', message: '' };
    this.invitePreview = null;
    this.showInviteModal = true;
  }

  closeInviteModal() {
    this.showInviteModal = false;
    this.invitePreview = null;
  }

  async saveHousehold() {
    this.saving = true;
    try {
      await this.supabase.createHousehold({
        name: this.householdForm.name,
        slug: this.householdForm.slug || null,
        is_active: true,
      });
      await this.load();
      this.closeHouseholdModal();
    } catch (e) {
      console.error(e);
    }
    this.saving = false;
  }

  async saveInvite() {
    this.saving = true;
    try {
      const invite = await this.supabase.createHouseholdInvite({
        household_id: this.inviteForm.household_id,
        email: this.inviteForm.email.trim().toLowerCase(),
        role: this.inviteForm.role,
        status: 'pending',
        message: this.inviteForm.message || null,
      });
      this.invitePreview = invite;
      await this.load();
    } catch (e) {
      console.error(e);
    }
    this.saving = false;
  }

  async copyInviteLink(invite: HouseholdInvite) {
    if (!invite.invite_link) return;
    await navigator.clipboard.writeText(invite.invite_link);
  }

  async openEmailDraft(invite: HouseholdInvite) {
    if (!invite.invite_link) return;

    const householdName = invite.household_name || 'tu hogar';
    const body = [
      'Hola,',
      '',
      `Te invito a unirte a ${householdName} en FinanzasCasa con rol ${invite.role}.`,
      invite.message || '',
      '',
      'Usa esta liga para crear tu cuenta o aceptar la invitacion:',
      invite.invite_link,
    ].filter(Boolean).join('\n');

    const subject = encodeURIComponent(`Invitacion a ${householdName} en FinanzasCasa`);
    const encodedBody = encodeURIComponent(body);
    window.location.href = `mailto:${encodeURIComponent(invite.email)}?subject=${subject}&body=${encodedBody}`;

    if (invite.id) {
      try {
        await this.supabase.markHouseholdInviteSent(invite.id);
        await this.load();
      } catch (error) {
        console.error(error);
      }
    }
  }
}
