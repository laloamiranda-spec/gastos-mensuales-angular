import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-money-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="money-hub-shell">
      <div class="money-hub-header">
        <div>
          <div class="money-hub-title">Tu dinero</div>
          <div class="money-hub-subtitle">Aqui administras tus cuentas, tus movimientos y tus tarjetas en un solo lugar</div>
        </div>
      </div>

      <div class="tabs money-tabs">
        <a routerLink="/tu-dinero/movimientos" routerLinkActive="active" class="tab">Movimientos y cuentas</a>
        <a routerLink="/tu-dinero/tarjetas" routerLinkActive="active" class="tab">Tarjetas y medios de pago</a>
      </div>

      <router-outlet />
    </div>
  `,
  styles: [`
    .money-hub-shell {
      padding: 24px 32px 0;
    }

    .money-hub-header {
      margin-bottom: 16px;
    }

    .money-hub-title {
      font-family: var(--font-display);
      font-size: 32px;
      font-weight: 800;
      color: var(--color-accent);
      letter-spacing: -0.02em;
    }

    .money-hub-subtitle {
      font-size: 14px;
      color: var(--color-text-muted);
      margin-top: 4px;
    }

    .money-tabs {
      max-width: 820px;
      margin-bottom: 18px;
    }

    .money-tabs .tab {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    @media (max-width: 900px) {
      .money-hub-shell {
        padding: 18px 16px 0;
      }

      .money-hub-title {
        font-size: 26px;
      }
    }
  `],
})
export class MoneyHubComponent {}
