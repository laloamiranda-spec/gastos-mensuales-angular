import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserProfile } from '../models/models';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionSubject = new BehaviorSubject<any>(null);
  private readonly userSubject = new BehaviorSubject<any>(null);
  private readonly profileSubject = new BehaviorSubject<UserProfile | null>(null);
  private readonly initializedSubject = new BehaviorSubject<boolean>(false);
  private bootstrapPromise: Promise<void> | null = null;

  session$ = this.sessionSubject.asObservable();
  user$ = this.userSubject.asObservable();
  profile$ = this.profileSubject.asObservable();
  initialized$ = this.initializedSubject.asObservable();

  constructor(private supabase: SupabaseService) {
    this.bootstrapPromise = this.bootstrap();
  }

  get currentUser() {
    return this.userSubject.value;
  }

  get isAuthenticated() {
    return !!this.userSubject.value;
  }

  get currentProfile() {
    return this.profileSubject.value;
  }

  get isPlatformAdmin() {
    return !!this.profileSubject.value?.is_platform_admin;
  }

  get isInitialized() {
    return this.initializedSubject.value;
  }

  private async bootstrap() {
    try {
      const { data } = await this.supabase.client.auth.getSession();
      this.sessionSubject.next(data.session ?? null);
      this.userSubject.next(data.session?.user ?? null);
      await this.syncProfile(data.session?.user?.id ?? null);

      this.supabase.client.auth.onAuthStateChange(async (_event, session) => {
        this.sessionSubject.next(session ?? null);
        this.userSubject.next(session?.user ?? null);
        await this.syncProfile(session?.user?.id ?? null);
        this.initializedSubject.next(true);
      });
    } finally {
      this.initializedSubject.next(true);
    }
  }

  async signUp(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await this.supabase.client.auth.signUp({
      email: normalizedEmail,
      password,
    });
    if (error) throw error;

    const user = data.user;
    if (user) {
      await this.supabase.upsertProfile({
        id: user.id,
        email: normalizedEmail,
        full_name: normalizedEmail.split('@')[0],
        avatar_color: '#10b981',
        is_active: true,
        is_platform_admin: false,
      });
    }

    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return data;
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const redirectTo = `${window.location.origin}/seguridad`;
    const { data, error } = await this.supabase.client.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('finanzas_casa_household_id');
    this.profileSubject.next(null);
  }

  async updatePassword(password: string) {
    const { data, error } = await this.supabase.client.auth.updateUser({ password });
    if (error) throw error;
    return data;
  }

  async waitUntilInitialized() {
    if (this.isInitialized) return;
    await this.bootstrapPromise;
  }

  private async syncProfile(userId: string | null) {
    if (!userId) {
      this.profileSubject.next(null);
      return;
    }

    try {
      const profile = await this.supabase.getProfileById(userId);
      this.profileSubject.next(profile);
    } catch {
      this.profileSubject.next(null);
    }
  }
}
