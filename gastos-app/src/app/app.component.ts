import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Household } from './core/models/models';
import { AuthService } from './core/services/auth.service';
import { SupabaseService } from './core/services/supabase.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <router-outlet *ngIf="isPublicRoute" />

    <div class="app-layout" *ngIf="!isPublicRoute">
      <div class="mobile-backdrop" [class.open]="mobileNavOpen" (click)="closeMobileNav()"></div>

      <aside class="sidebar" [class.open]="mobileNavOpen">
        <div class="sidebar-logo">
          <div class="logo-icon">MX</div>
          <div class="logo-copy">
            <span class="logo-text nav-text">FinanzasCasa</span>
            <span class="logo-subtext nav-text">Tu hogar financiero</span>
          </div>
        </div>

        <div class="household-panel" *ngIf="currentHousehold">
          <div class="household-label">Hogar activo</div>
          <div class="household-name">{{ currentHousehold.name }}</div>
          <div class="household-caption">Todo lo que ves pertenece a este espacio</div>
          <a routerLink="/hogar-y-accesos" class="household-action" (click)="closeMobileNav()">Administrar hogar</a>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-group">
            <div class="nav-group-label">Vista general</div>
            <a routerLink="/inicio" routerLinkActive="active" class="nav-item" (click)="closeMobileNav()">
              <span class="nav-icon">01</span>
              <span class="nav-text">Inicio</span>
            </a>
            <a routerLink="/pagos-y-gastos" routerLinkActive="active" class="nav-item" (click)="closeMobileNav()">
              <span class="nav-icon">02</span>
              <span class="nav-text">Pagos y gastos</span>
            </a>
            <a routerLink="/tu-dinero" routerLinkActive="active" class="nav-item" (click)="closeMobileNav()">
              <span class="nav-icon">03</span>
              <span class="nav-text">Tu dinero</span>
            </a>
            <a routerLink="/plan-mensual" routerLinkActive="active" class="nav-item" (click)="closeMobileNav()">
              <span class="nav-icon">04</span>
              <span class="nav-text">Plan mensual</span>
            </a>
            <a routerLink="/resumenes" routerLinkActive="active" class="nav-item" (click)="closeMobileNav()">
              <span class="nav-icon">05</span>
              <span class="nav-text">Resumenes</span>
            </a>
          </div>

          <div class="nav-group">
            <div class="nav-group-label">Colaboracion</div>
            <a routerLink="/personas" routerLinkActive="active" class="nav-item" (click)="closeMobileNav()">
              <span class="nav-icon">06</span>
              <span class="nav-text">Personas</span>
            </a>
            <a routerLink="/hogar-y-accesos" routerLinkActive="active" class="nav-item" (click)="closeMobileNav()">
              <span class="nav-icon">07</span>
              <span class="nav-text">Hogar y accesos</span>
            </a>
            <a routerLink="/gastos-compartidos" routerLinkActive="active" class="nav-item" (click)="closeMobileNav()">
              <span class="nav-icon">08</span>
              <span class="nav-text">Gastos compartidos</span>
            </a>
          </div>

          <div class="nav-group">
            <div class="nav-group-label">Cuenta</div>
            <a *ngIf="isPlatformAdmin" routerLink="/administracion" routerLinkActive="active" class="nav-item" (click)="closeMobileNav()">
              <span class="nav-icon">09</span>
              <span class="nav-text">Administracion</span>
            </a>
            <a routerLink="/seguridad" routerLinkActive="active" class="nav-item" (click)="closeMobileNav()">
              <span class="nav-icon">10</span>
              <span class="nav-text">Seguridad</span>
            </a>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-version nav-text">v1.0.0</div>
        </div>
      </aside>

      <main class="main-content">
        <div class="desktop-topbar" *ngIf="households.length > 0">
          <div class="desktop-topbar-copy">
            <div class="desktop-topbar-label">Espacio actual</div>
            <div class="desktop-topbar-title">{{ currentHousehold?.name || 'Selecciona un hogar' }}</div>
            <div class="desktop-topbar-caption">Controla dinero, pagos y colaboracion desde un solo lugar</div>
          </div>
          <div class="desktop-topbar-actions">
            <label class="desktop-switcher">
              <span>Cambiar</span>
              <select [(ngModel)]="selectedHouseholdId" (ngModelChange)="onHouseholdChange($event)">
                <option *ngFor="let household of households" [value]="household.id">{{ household.name }}</option>
              </select>
            </label>
            <a routerLink="/hogar-y-accesos" class="desktop-link">Administrar</a>
          </div>
        </div>

        <div class="mobile-topbar">
          <div class="mobile-topbar-row">
            <button class="mobile-menu-btn" type="button" (click)="toggleMobileNav()" aria-label="Abrir menu">
              {{ mobileNavOpen ? 'X' : '|||'}}
            </button>
            <div class="mobile-topbar-brand">
              <div class="mobile-brand-icon">MX</div>
              <div class="mobile-brand-copy">
                <span>FinanzasCasa</span>
                <small>{{ currentHousehold?.name || 'Sin hogar' }}</small>
              </div>
            </div>
          </div>
          <div class="mobile-household" *ngIf="households.length > 0">
            <div class="mobile-household-label">Hogar</div>
            <select class="mobile-household-select" [(ngModel)]="selectedHouseholdId" (ngModelChange)="onHouseholdChange($event)">
              <option *ngFor="let household of households" [value]="household.id">{{ household.name }}</option>
            </select>
          </div>
        </div>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .mobile-backdrop,
    .mobile-topbar {
      display: none;
    }

    .sidebar-logo {
      padding: 24px 18px 18px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .logo-copy {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .logo-icon,
    .mobile-brand-icon {
      width: 36px;
      height: 36px;
      background: var(--color-primary);
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      flex-shrink: 0;
      box-shadow: 0 2px 10px rgba(5,150,105,0.4);
    }

    .logo-text {
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      color: #e0f2eb;
      letter-spacing: -0.01em;
    }

    .logo-subtext {
      font-size: 11px;
      color: rgba(209, 250, 229, 0.52);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .household-panel {
      margin: 16px 14px 10px;
      padding: 18px 16px 16px;
      border-radius: 24px;
      background:
        radial-gradient(circle at top right, rgba(110,231,183,0.18), transparent 42%),
        linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03)),
        rgba(255,255,255,0.05);
      border: 1px solid rgba(110,231,183,0.16);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 14px 30px rgba(0,0,0,0.1);
    }

    .household-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.5);
      margin-bottom: 10px;
      font-weight: 700;
    }

    .household-name {
      font-family: var(--font-display);
      font-size: 20px;
      line-height: 1.05;
      font-weight: 700;
      color: #ecfdf5;
      letter-spacing: -0.02em;
    }

    .household-caption {
      margin-top: 8px;
      color: rgba(209, 250, 229, 0.72);
      font-size: 12px;
      line-height: 1.45;
    }

    .household-action {
      display: inline-flex;
      margin-top: 14px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(209, 250, 229, 0.14);
      color: #d1fae5;
      text-decoration: none;
      font-size: 12px;
      font-weight: 700;
    }

    .sidebar-nav {
      padding: 14px 10px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nav-group-label {
      padding: 0 12px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: rgba(209, 250, 229, 0.36);
      font-weight: 700;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 13px;
      border-radius: 16px;
      color: rgba(255,255,255,0.55);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: var(--transition);
    }

    .nav-item:hover {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.9);
    }

    .nav-item.active {
      background: linear-gradient(180deg, rgba(5,150,105,0.30), rgba(5,150,105,0.18));
      color: #ecfdf5;
      border: 1px solid rgba(110,231,183,0.2);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 18px rgba(5,150,105,0.12);
    }

    .nav-icon {
      min-width: 32px;
      font-size: 11px;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.62;
      flex-shrink: 0;
      font-family: var(--font-mono);
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }

    .desktop-topbar {
      position: sticky;
      top: 0;
      z-index: 80;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 22px 34px 18px;
      background: linear-gradient(180deg, rgba(255,253,248,0.88), rgba(255,253,248,0.55));
      backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(12, 69, 56, 0.06);
    }

    .desktop-topbar-copy {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .desktop-topbar-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
      font-weight: 700;
    }

    .desktop-topbar-title {
      font-family: var(--font-display);
      font-size: 24px;
      line-height: 1.1;
      font-weight: 700;
      color: var(--color-accent);
      letter-spacing: -0.02em;
    }

    .desktop-topbar-caption {
      font-size: 13px;
      color: var(--color-text-muted);
      max-width: 420px;
    }

    .desktop-topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .desktop-switcher {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 18px;
      background: rgba(255,255,255,0.9);
      border: 1px solid rgba(16,185,129,0.14);
      box-shadow: 0 6px 20px rgba(6,78,59,0.08);
      color: var(--color-text-muted);
      font-size: 12px;
      font-weight: 700;
    }

    .desktop-switcher select {
      min-width: 190px;
      border: 0;
      background: transparent;
      color: var(--color-accent);
      font-size: 14px;
      font-weight: 700;
      outline: none;
    }

    .desktop-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 15px;
      border-radius: 16px;
      background: rgba(5,150,105,0.08);
      border: 1px solid rgba(16,185,129,0.16);
      color: var(--color-primary);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
    }

    .sidebar-version {
      font-size: 11px;
      color: rgba(255,255,255,0.25);
      font-family: var(--font-mono);
    }

    .mobile-topbar {
      position: sticky;
      top: 0;
      z-index: 90;
      flex-direction: column;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(244,251,247,0.92);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--color-border);
    }

    .mobile-topbar-row {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .mobile-menu-btn {
      width: 42px;
      height: 42px;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-surface);
      color: var(--color-accent);
      font-size: 18px;
      cursor: pointer;
      box-shadow: var(--shadow-card);
    }

    .mobile-topbar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: var(--font-display);
      font-weight: 700;
      color: var(--color-accent);
    }

    .mobile-brand-copy {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .mobile-brand-copy small {
      font-family: var(--font-body);
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .mobile-household {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .mobile-household-label {
      font-size: 12px;
      color: var(--color-text-muted);
      min-width: 42px;
    }

    .mobile-household-select {
      flex: 1;
      min-width: 0;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-surface);
      padding: 10px 12px;
      color: var(--color-accent);
      font-size: 13px;
    }

    .mobile-backdrop.open {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(5, 46, 34, 0.4);
      backdrop-filter: blur(3px);
      z-index: 95;
    }

    @media (max-width: 900px) {
      .desktop-topbar {
        display: none;
      }

      .household-panel {
        margin-bottom: 10px;
      }

      .logo-subtext,
      .desktop-topbar-caption,
      .household-action {
        display: none;
      }

      .nav-group-label {
        display: none;
      }

      .mobile-topbar {
        display: flex;
      }

      .sidebar {
        width: min(82vw, 300px);
        transform: translateX(-100%);
        transition: transform 0.22s ease;
        z-index: 100;
      }

      .sidebar.open {
        transform: translateX(0);
      }

      .main-content {
        margin-left: 0;
        width: 100%;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  private readonly storageKey = 'finanzas_casa_household_id';
  mobileNavOpen = false;
  households: Household[] = [];
  selectedHouseholdId = '';
  isPublicRoute = false;

  get currentHousehold() {
    return this.households.find(household => household.id === this.selectedHouseholdId) || null;
  }

  get isPlatformAdmin() {
    return this.auth.isPlatformAdmin;
  }

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private auth: AuthService,
  ) {}

  async ngOnInit() {
    this.syncRouteMode(this.router.url);
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const nav = event as NavigationEnd;
        this.syncRouteMode(nav.urlAfterRedirects);
      });

    this.auth.user$.subscribe(async (user) => {
      if (!user) {
        this.households = [];
        this.selectedHouseholdId = '';
        return;
      }
      await this.loadHouseholds();
    });

    if (this.auth.isAuthenticated) {
      await this.loadHouseholds();
    }
  }

  async loadHouseholds() {
    try {
      const households = await this.supabase.getHouseholds();
      this.households = households || [];
      const stored = localStorage.getItem(this.storageKey);
      const selected = this.households.find(household => household.id === stored)?.id || this.households[0]?.id || '';
      this.selectedHouseholdId = selected;
      if (selected) {
        localStorage.setItem(this.storageKey, selected);
      } else {
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      console.error('No se pudieron cargar los hogares', error);
    }
  }

  onHouseholdChange(householdId: string) {
    this.selectedHouseholdId = householdId;
    if (householdId) {
      localStorage.setItem(this.storageKey, householdId);
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }

  toggleMobileNav() {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  closeMobileNav() {
    this.mobileNavOpen = false;
  }

  private syncRouteMode(url: string) {
    this.isPublicRoute = url === '/' || url.startsWith('/crear-cuenta') || url.startsWith('/acceso');
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 900) {
      this.closeMobileNav();
    }
  }
}
