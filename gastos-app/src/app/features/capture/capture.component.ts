import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuickCaptureComponent } from '../quick-capture/quick-capture.component';

/**
 * Ruta dedicada a pantalla completa para capturar un gasto.
 * Reutiliza el asistente QuickCaptureComponent en modo "page".
 * Ideal para un acceso directo en el celular (pantalla de inicio / PWA).
 */
@Component({
  selector: 'app-capture',
  standalone: true,
  imports: [CommonModule, QuickCaptureComponent],
  template: `
    <app-quick-capture
      *ngIf="!done"
      mode="page"
      (saved)="onSaved()"
      (cancelled)="goHome()"
    ></app-quick-capture>

    <div class="cap-success" *ngIf="done">
      <div class="cap-success-inner">
        <div class="cap-check">✓</div>
        <div class="cap-title">¡Gasto registrado!</div>
        <div class="cap-sub">Se guardó correctamente en tu hogar.</div>
        <div class="cap-actions">
          <button class="cap-btn cap-btn-primary" (click)="again()">
            <span class="cap-btn-plus">+</span> Registrar otro
          </button>
          <button class="cap-btn cap-btn-secondary" (click)="goHome()">Ir al inicio</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cap-success {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        radial-gradient(circle at top, rgba(11,143,106,0.10), transparent 40%),
        var(--color-bg, #f3f4ea);
    }

    .cap-success-inner {
      width: 100%;
      max-width: 420px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      animation: capFade 0.3s ease;
    }

    .cap-check {
      width: 92px;
      height: 92px;
      border-radius: 50%;
      background: linear-gradient(135deg, #14c088, var(--color-primary, #0b8f6a));
      color: #fff;
      font-size: 48px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 12px 30px rgba(11,143,106,0.42);
      margin-bottom: 8px;
      animation: capPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .cap-title {
      font-family: var(--font-display, 'Syne', sans-serif);
      font-size: 26px;
      font-weight: 800;
      color: var(--color-accent, #0c4538);
      letter-spacing: -0.02em;
    }

    .cap-sub {
      font-size: 14px;
      color: var(--color-text-muted, #6a7d71);
      margin-bottom: 18px;
    }

    .cap-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .cap-btn {
      width: 100%;
      min-height: 52px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 14px;
      border: none;
      font-family: var(--font-display, 'Syne', sans-serif);
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    .cap-btn:active { transform: scale(0.98); }

    .cap-btn-primary {
      background: var(--color-primary, #0b8f6a);
      color: #fff;
      box-shadow: 0 8px 22px rgba(11,143,106,0.35);
    }

    .cap-btn-secondary {
      background: var(--color-surface, #fffdf8);
      color: var(--color-text, #215246);
      border: 1.5px solid var(--color-border, #d8dfcc);
    }

    .cap-btn-plus { font-size: 22px; font-weight: 400; line-height: 1; }

    @keyframes capPop {
      from { transform: scale(0.4); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }
    @keyframes capFade {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class CaptureComponent {
  done = false;

  constructor(private router: Router) {}

  onSaved() {
    this.done = true;
  }

  again() {
    this.done = false;
  }

  goHome() {
    this.router.navigate(['/inicio']);
  }
}
