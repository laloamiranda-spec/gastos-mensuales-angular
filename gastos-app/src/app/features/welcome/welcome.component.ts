import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="welcome-shell">
      <section class="hero">
        <div class="hero-copy">
          <div class="hero-badge">FinanzasCasa</div>
          <h1>{{ mode === 'forgot' ? 'Recupera tu acceso en minutos.' : 'Tu cuenta primero. Tus hogares despues.' }}</h1>
          <p *ngIf="mode !== 'forgot'">
            Crea tu acceso con correo y contrasena. Una vez dentro podras ver solo tus hogares asignados
            o crear uno nuevo si todavia no tienes ninguno.
          </p>
          <p *ngIf="mode === 'forgot'">
            Te enviaremos una liga segura a tu correo para que definas una nueva contrasena y vuelvas a entrar
            a tus hogares sin perder configuracion ni historial.
          </p>
          <div class="hero-points">
            <span>Acceso por correo y contrasena</span>
            <span>Hogares aislados por usuario</span>
            <span>Invitaciones seguras por correo</span>
          </div>
        </div>

        <div class="hero-card">
          <div class="auth-tabs" *ngIf="mode !== 'forgot'">
            <button class="auth-tab" [class.active]="mode === 'login'" (click)="setMode('login')">Entrar</button>
            <button class="auth-tab" [class.active]="mode === 'signup'" (click)="setMode('signup')">Crear cuenta</button>
          </div>

          <div class="hero-card-kicker">{{ kicker }}</div>
          <div class="hero-card-title">{{ cardTitle }}</div>

          <div class="form-group">
            <label class="form-label">Correo *</label>
            <input class="form-control" [(ngModel)]="form.email" placeholder="tu@correo.com" />
          </div>

          <div class="form-group" *ngIf="mode !== 'forgot'">
            <label class="form-label">Contrasena *</label>
            <input class="form-control" type="password" [(ngModel)]="form.password" placeholder="Minimo 8 caracteres" />
          </div>

          <div class="form-group" *ngIf="mode === 'signup'">
            <label class="form-label">Confirmar contrasena *</label>
            <input class="form-control" type="password" [(ngModel)]="form.confirmPassword" placeholder="Repite tu contrasena" />
          </div>

          <div class="hero-actions">
            <button class="btn btn-primary" (click)="submit()" [disabled]="saving || !canSubmit">
              {{ saving ? 'Procesando...' : submitLabel }}
            </button>
            <button *ngIf="mode === 'forgot'" class="btn btn-secondary" (click)="setMode('login')">Volver a entrar</button>
          </div>

          <div class="hero-note">{{ helperText }}</div>

          <button *ngIf="mode === 'login'" class="forgot-link" type="button" (click)="setMode('forgot')">
            Olvide mi contrasena
          </button>

          <div *ngIf="message" class="hero-message" [class.error]="messageType === 'error'">
            {{ message }}
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .welcome-shell {
      min-height: 100vh;
      padding: 48px 24px;
      background:
        radial-gradient(circle at top left, rgba(16,185,129,0.14), transparent 28%),
        radial-gradient(circle at bottom right, rgba(6,182,212,0.12), transparent 24%),
        linear-gradient(180deg, #f3f4ea 0%, #fbfcf7 100%);
    }

    .hero {
      max-width: 1180px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      gap: 28px;
      align-items: stretch;
    }

    .hero-copy,
    .hero-card {
      border-radius: 28px;
      border: 1px solid rgba(11,143,106,0.12);
      box-shadow: 0 18px 50px rgba(24,44,36,0.08);
      background: rgba(255,253,248,0.86);
      backdrop-filter: blur(10px);
    }

    .hero-copy {
      padding: 56px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 620px;
    }

    .hero-badge {
      display: inline-flex;
      width: fit-content;
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(11,143,106,0.1);
      color: var(--color-primary);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 18px;
    }

    h1 {
      font-size: clamp(40px, 5vw, 64px);
      line-height: 0.95;
      letter-spacing: -0.04em;
      max-width: 9ch;
      margin-bottom: 20px;
    }

    p {
      font-size: 18px;
      color: var(--color-text-muted);
      max-width: 34rem;
      margin-bottom: 24px;
    }

    .hero-points {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .hero-points span {
      display: inline-flex;
      align-items: center;
      padding: 9px 13px;
      border-radius: 999px;
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
      color: var(--color-accent);
      font-size: 13px;
      font-weight: 600;
    }

    .hero-card {
      padding: 30px;
      align-self: center;
    }

    .auth-tabs {
      display: inline-grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      padding: 6px;
      border-radius: 18px;
      background: var(--color-surface-2);
      margin-bottom: 18px;
    }

    .auth-tab {
      border: 0;
      border-radius: 12px;
      background: transparent;
      color: var(--color-text-muted);
      padding: 10px 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .auth-tab.active {
      background: #ffffff;
      color: var(--color-accent);
      box-shadow: var(--shadow-card);
    }

    .hero-card-kicker {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin-bottom: 10px;
    }

    .hero-card-title {
      font-family: var(--font-display);
      font-size: 30px;
      line-height: 1;
      color: var(--color-accent);
      margin-bottom: 24px;
    }

    .hero-actions {
      margin-top: 10px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .hero-note {
      margin-top: 16px;
      font-size: 13px;
      color: var(--color-text-muted);
    }

    .forgot-link {
      margin-top: 14px;
      border: 0;
      background: transparent;
      color: var(--color-primary);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      text-align: left;
      padding: 0;
    }

    .hero-message {
      margin-top: 18px;
      padding: 12px 14px;
      border-radius: 16px;
      background: rgba(5,150,105,0.08);
      border: 1px solid rgba(5,150,105,0.14);
      color: var(--color-primary);
      font-size: 13px;
      font-weight: 600;
    }

    .hero-message.error {
      background: rgba(225,29,72,0.08);
      border-color: rgba(225,29,72,0.14);
      color: var(--color-danger);
    }

    @media (max-width: 980px) {
      .hero {
        grid-template-columns: 1fr;
      }

      .hero-copy {
        min-height: auto;
        padding: 36px 28px;
      }
    }

    @media (max-width: 640px) {
      .welcome-shell {
        padding: 20px 14px;
      }

      .hero-copy,
      .hero-card {
        border-radius: 24px;
      }

      .hero-card {
        padding: 22px 18px;
      }

      .hero-actions {
        flex-direction: column;
      }

      .hero-actions .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `],
})
export class WelcomeComponent implements OnInit {
  mode: 'login' | 'signup' | 'forgot' = 'login';
  saving = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  form = {
    email: '',
    password: '',
    confirmPassword: '',
  };

  get canSubmit() {
    if (this.mode === 'forgot') return !!this.form.email;
    if (!this.form.email || !this.form.password) return false;
    if (this.mode === 'signup') return !!this.form.confirmPassword;
    return true;
  }

  get kicker() {
    return this.mode === 'login'
      ? 'Acceso seguro'
      : this.mode === 'signup'
        ? 'Registro inicial'
        : 'Recuperacion de acceso';
  }

  get cardTitle() {
    return this.mode === 'login'
      ? 'Entra a tu espacio'
      : this.mode === 'signup'
        ? 'Crea tu cuenta con tu correo'
        : 'Recupera tu contrasena';
  }

  get submitLabel() {
    return this.mode === 'login'
      ? 'Entrar'
      : this.mode === 'signup'
        ? 'Crear cuenta'
        : 'Enviar liga';
  }

  get helperText() {
    return this.mode === 'login'
      ? 'Solo veras los hogares donde tengas acceso asignado.'
      : this.mode === 'signup'
        ? 'El registro crea tu cuenta. Ya dentro podras crear hogares o aceptar invitaciones.'
        : 'Te enviaremos una liga segura para que establezcas una nueva contrasena.';
  }

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.url.subscribe(segments => {
      this.mode = segments.some(segment => segment.path === 'crear-cuenta') ? 'signup' : 'login';
    });

    this.auth.initialized$.subscribe((initialized) => {
      if (initialized && this.auth.isAuthenticated) {
        this.router.navigateByUrl('/inicio');
      }
    });
  }

  setMode(mode: 'login' | 'signup' | 'forgot') {
    this.mode = mode;
    this.message = '';
  }

  async submit() {
    if (!this.canSubmit) return;

    if (this.mode === 'signup' && this.form.password !== this.form.confirmPassword) {
      this.messageType = 'error';
      this.message = 'Las contrasenas no coinciden.';
      return;
    }

    if (this.mode !== 'forgot' && this.form.password.length < 8) {
      this.messageType = 'error';
      this.message = 'La contrasena debe tener al menos 8 caracteres.';
      return;
    }

    this.saving = true;
    this.message = '';

    try {
      if (this.mode === 'forgot') {
        await this.auth.requestPasswordReset(this.form.email);
        this.messageType = 'success';
        this.message = 'Te enviamos una liga para restablecer tu contrasena. Revisa tu correo.';
      } else if (this.mode === 'signup') {
        await this.auth.signUp(this.form.email, this.form.password);
        this.messageType = 'success';
        this.message = 'Tu cuenta ya fue creada. Ahora entra para ver o crear tus hogares.';
        this.mode = 'login';
        this.form.confirmPassword = '';
      } else {
        await this.auth.signIn(this.form.email, this.form.password);
        this.router.navigateByUrl('/inicio');
      }
    } catch (error: any) {
      console.error(error);
      this.messageType = 'error';
      this.message = this.getFriendlyErrorMessage(error);
    } finally {
      this.saving = false;
    }
  }

  private getFriendlyErrorMessage(error: any) {
    const message = `${error?.message || ''}`.toLowerCase();
    const code = `${error?.code || ''}`.toLowerCase();

    if (message.includes('invalid login credentials')) {
      return 'El correo o la contrasena no coinciden.';
    }

    if (message.includes('user already registered') || code === 'user_already_exists') {
      return 'La cuenta ya existe con ese correo. Entra con tu contrasena.';
    }

    if (message.includes('email not confirmed')) {
      return 'Tu correo aun no ha sido confirmado. Revisa tu bandeja de entrada.';
    }

    if (message.includes('for security purposes')) {
      return 'Si el correo existe, te enviaremos una liga para recuperar tu contrasena.';
    }

    if (this.mode === 'signup') {
      return 'No se pudo crear la cuenta. Revisa el correo e intentalo de nuevo.';
    }

    if (this.mode === 'forgot') {
      return 'No se pudo enviar la liga de recuperacion. Intentalo otra vez.';
    }

    return 'No se pudo iniciar sesion. Intentalo otra vez.';
  }
}
