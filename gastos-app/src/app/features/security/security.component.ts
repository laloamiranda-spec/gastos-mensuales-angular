import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Seguridad</div>
          <div class="page-subtitle">Administra tu acceso, tu contrasena y el cierre de sesion</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Acceso</span>
          </div>
          <div class="form-group">
            <label class="form-label">Correo de acceso</label>
            <input class="form-control" [value]="auth.currentUser?.email || '-'" disabled />
          </div>
          <div class="security-tip">
            Si llegaste aqui desde una liga de recuperacion, escribe tu nueva contrasena y guardala para terminar el proceso.
          </div>
          <div class="form-group">
            <label class="form-label">Nueva contrasena</label>
            <input class="form-control" type="password" [(ngModel)]="password" placeholder="Minimo 8 caracteres" />
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar contrasena</label>
            <input class="form-control" type="password" [(ngModel)]="confirmPassword" placeholder="Repite la contrasena" />
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-primary" (click)="savePassword()" [disabled]="saving || !password || !confirmPassword">
              {{ saving ? 'Guardando...' : 'Actualizar contrasena' }}
            </button>
            <button class="btn btn-secondary" (click)="logout()">Cerrar sesion</button>
          </div>
          <div *ngIf="message" class="security-message" [class.error]="messageType === 'error'">
            {{ message }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .security-message {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(5,150,105,0.08);
      border: 1px solid rgba(5,150,105,0.14);
      color: var(--color-primary);
      font-size: 13px;
      font-weight: 600;
    }

    .security-message.error {
      background: rgba(225,29,72,0.08);
      border-color: rgba(225,29,72,0.14);
      color: var(--color-danger);
    }

    .security-tip {
      margin-bottom: 14px;
      padding: 12px 14px;
      border-radius: 14px;
      background: rgba(47,126,154,0.08);
      border: 1px solid rgba(47,126,154,0.14);
      color: var(--color-info);
      font-size: 13px;
      font-weight: 600;
    }
  `],
})
export class SecurityComponent {
  password = '';
  confirmPassword = '';
  saving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    public auth: AuthService,
    private router: Router,
  ) {}

  async savePassword() {
    if (this.password !== this.confirmPassword) {
      this.messageType = 'error';
      this.message = 'Las contrasenas no coinciden.';
      return;
    }

    if (this.password.length < 8) {
      this.messageType = 'error';
      this.message = 'La contrasena debe tener al menos 8 caracteres.';
      return;
    }

    this.saving = true;
    this.message = '';

    try {
      await this.auth.updatePassword(this.password);
      this.messageType = 'success';
      this.message = 'La contrasena se actualizo correctamente.';
      this.password = '';
      this.confirmPassword = '';
    } catch (error: any) {
      this.messageType = 'error';
      this.message = error?.message || 'No se pudo actualizar la contrasena.';
    } finally {
      this.saving = false;
    }
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigateByUrl('/acceso');
  }
}
