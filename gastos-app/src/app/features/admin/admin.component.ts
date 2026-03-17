import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../core/services/supabase.service';
import { HouseholdSubscription, SubscriptionPlan, UserProfile } from '../../core/models/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Administracion del sistema</div>
          <div class="page-subtitle">Base para activar cuentas, planes y accesos de la plataforma</div>
        </div>
      </div>

      <div *ngIf="loading" class="loading"><div class="spinner"></div></div>

      <ng-container *ngIf="!loading">
        <div class="grid-3 mb-6">
          <div class="card">
            <div class="stat-label">Usuarios</div>
            <div class="stat-value mono">{{ profiles.length }}</div>
          </div>
          <div class="card">
            <div class="stat-label">Planes</div>
            <div class="stat-value mono">{{ plans.length }}</div>
          </div>
          <div class="card">
            <div class="stat-label">Suscripciones</div>
            <div class="stat-value mono">{{ subscriptions.length }}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Usuarios de plataforma</span>
            </div>
            <div class="table-wrapper" *ngIf="profiles.length > 0">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Activo</th>
                    <th>Admin sistema</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let profile of profiles">
                    <td>{{ profile.full_name }}</td>
                    <td>{{ profile.email || '-' }}</td>
                    <td>{{ profile.is_active ? 'Si' : 'No' }}</td>
                    <td>{{ profile.is_platform_admin ? 'Si' : 'No' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div *ngIf="profiles.length === 0" class="empty-state">
              <div class="empty-state-title">Sin perfiles cargados</div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">Planes y suscripciones</span>
            </div>
            <div class="table-wrapper" *ngIf="plans.length > 0">
              <table>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Precio</th>
                    <th>Max miembros</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let plan of plans">
                    <td>{{ plan.name }}</td>
                    <td class="mono">{{ (plan.price_monthly || 0) | currency:'MXN':'symbol':'1.0-0' }}</td>
                    <td>{{ plan.max_members || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="table-wrapper" *ngIf="subscriptions.length > 0" style="margin-top:16px;">
              <table>
                <thead>
                  <tr>
                    <th>Hogar</th>
                    <th>Plan</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let subscription of subscriptions">
                    <td>{{ subscription.household_name || subscription.household_id }}</td>
                    <td>{{ subscription.plan_name || subscription.plan_id }}</td>
                    <td>{{ subscription.status }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class AdminComponent implements OnInit {
  profiles: UserProfile[] = [];
  plans: SubscriptionPlan[] = [];
  subscriptions: HouseholdSubscription[] = [];
  loading = true;

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    this.loading = true;
    try {
      const [profiles, plans, subscriptions] = await Promise.all([
        this.supabase.getProfiles(),
        this.supabase.getSubscriptionPlans(),
        this.supabase.getHouseholdSubscriptions(),
      ]);
      this.profiles = profiles || [];
      this.plans = plans || [];
      this.subscriptions = subscriptions || [];
    } catch (e) {
      console.error(e);
    }
    this.loading = false;
  }
}
