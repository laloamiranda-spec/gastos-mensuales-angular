import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private _client: SupabaseClient | null = null;
  private readonly occurrencePastMonths = 1;
  private readonly occurrenceFutureMonths = 3;

  // Lazy init: evita el error NG0200 (circular DI con Supabase)
  private get supabase(): SupabaseClient {
    if (!this._client) {
      this._client = createClient(environment.supabaseUrl, environment.supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
    }
    return this._client;
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  // --- HOUSEHOLDS, USERS AND PLATFORM ADMIN --------------------------------
  async getProfiles() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    if (error) throw error;
    return data;
  }

  async createProfile(payload: any) {
    const { data, error } = await this.supabase
      .from('profiles')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async upsertProfile(payload: any) {
    const { data, error } = await this.supabase
      .from('profiles')
      .upsert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getProfileById(id: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async getHouseholds() {
    const userId = await this.getCurrentAuthUserId();
    if (!userId) return [];

    const { data, error } = await this.supabase
      .from('household_memberships')
      .select('household_id, households(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at');
    if (error) throw error;

    return (data || [])
      .map((row: any) => row.households)
      .filter((household: any) => household?.is_active)
      .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }

  async createHousehold(payload: any) {
    const ownerUserId = payload.owner_user_id || await this.getCurrentAuthUserId();
    const { data, error } = await this.supabase
      .from('households')
      .insert({ ...payload, owner_user_id: ownerUserId, created_by: ownerUserId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async createHouseholdMembership(payload: any) {
    const { data, error } = await this.supabase
      .from('household_memberships')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getHouseholdMemberships(householdId?: string) {
    let query = this.supabase
      .from('household_memberships')
      .select('*, households(name), profiles(full_name,email)')
      .order('created_at');

    if (householdId) query = query.eq('household_id', householdId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      household_name: row.households?.name,
      user_name: row.profiles?.full_name,
      user_email: row.profiles?.email,
    }));
  }

  async getHouseholdInvites(householdId?: string) {
    let query = this.supabase
      .from('household_invites')
      .select('*, households(name)')
      .order('created_at', { ascending: false });

    if (householdId) query = query.eq('household_id', householdId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      household_name: row.households?.name,
      invite_link: row.token ? `${window.location.origin}/crear-cuenta?invite=${row.token}` : undefined,
    }));
  }

  async createHouseholdInvite(payload: any) {
    const invitePayload = {
      ...payload,
      token: payload.token || crypto.randomUUID(),
      expires_at: payload.expires_at || new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    };

    const { data, error } = await this.supabase
      .from('household_invites')
      .insert(invitePayload)
      .select()
      .single();
    if (error) throw error;
    return {
      ...data,
      invite_link: data?.token ? `${window.location.origin}/crear-cuenta?invite=${data.token}` : undefined,
    };
  }

  async markHouseholdInviteSent(id: string) {
    const { data, error } = await this.supabase
      .from('household_invites')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getSubscriptionPlans() {
    const { data, error } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .order('price_monthly');
    if (error) throw error;
    return data;
  }

  async getSubscriptionPlanByCode(code: string) {
    const { data, error } = await this.supabase
      .from('subscription_plans')
      .select('*')
      .eq('code', code)
      .single();
    if (error) throw error;
    return data;
  }

  async createHouseholdSubscription(payload: any) {
    const { data, error } = await this.supabase
      .from('household_subscriptions')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getHouseholdSubscriptions() {
    const { data, error } = await this.supabase
      .from('household_subscriptions')
      .select('*, households(name), subscription_plans(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      household_name: row.households?.name,
      plan_name: row.subscription_plans?.name,
    }));
  }

  async getExpenseSplitRules(expenseId: string) {
    const { data, error } = await this.supabase
      .from('expense_split_rules')
      .select('*, members(name), profiles(full_name)')
      .eq('expense_id', expenseId)
      .order('created_at');
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      member_name: row.members?.name,
      user_name: row.profiles?.full_name,
    }));
  }

  // ── BANK ACCOUNTS ────────────────────────────
  async getBankAccounts() {
    const householdId = this.getActiveHouseholdId();
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('bank')
      .order('name');
    if (error) throw error;
    return data;
  }

  async createBankAccount(account: any) {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .insert({ ...account, household_id: account.household_id || this.getActiveHouseholdId() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateBankAccount(id: string, account: any) {
    const { data, error } = await this.supabase
      .from('bank_accounts')
      .update(account)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteBankAccount(id: string) {
    const { error } = await this.supabase
      .from('bank_accounts')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
  }

  // ── BANK MOVEMENTS ────────────────────────────
  async getBankMovements(account_id?: string, year?: number, month?: number) {
    const householdId = this.getActiveHouseholdId();
    let query = this.supabase
      .from('bank_movements')
      .select(`*, bank_accounts(name,color,bank), categories(name,icon,color)`)
      .eq('household_id', householdId)
      .order('date', { ascending: false });

    if (account_id) query = query.eq('account_id', account_id);
    if (year && month) {
      const from = `${year}-${String(month).padStart(2,'0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to = `${year}-${String(month).padStart(2,'0')}-${lastDay}`;
      query = query.gte('date', from).lte('date', to);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      account_name:   r.bank_accounts?.name,
      account_color:  r.bank_accounts?.color,
      account_bank:   r.bank_accounts?.bank,
      category_name:  r.categories?.name,
      category_icon:  r.categories?.icon,
      category_color: r.categories?.color,
    }));
  }

  async getIncomingMovements(year?: number, month?: number, account_id?: string) {
    const movements = await this.getBankMovements(account_id, year, month);
    return (movements || []).filter((movement: any) => movement.type === 'ingreso');
  }

  async getIncomingMovementsForYear(year: number, account_id?: string) {
    const householdId = this.getActiveHouseholdId();
    let query = this.supabase
      .from('bank_movements')
      .select('*, bank_accounts(name,color,bank), categories(name,icon,color)')
      .eq('household_id', householdId)
      .eq('type', 'ingreso')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: false });

    if (account_id) {
      query = query.eq('account_id', account_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((r: any) => ({
      ...r,
      account_name: r.bank_accounts?.name,
      account_color: r.bank_accounts?.color,
      account_bank: r.bank_accounts?.bank,
      category_name: r.categories?.name,
      category_icon: r.categories?.icon,
      category_color: r.categories?.color,
    }));
  }

  async createBankMovement(movement: any) {
    const { data, error } = await this.supabase
      .from('bank_movements')
      .insert({ ...movement, household_id: movement.household_id || this.getActiveHouseholdId() })
      .select()
      .single();
    if (error) throw error;
    await this.applyBankMovementDelta(movement.account_id, this.getMovementSignedAmount(movement));
    return data;
  }

  async updateBankMovement(id: string, movement: any) {
    const { data: previous, error: previousError } = await this.supabase
      .from('bank_movements')
      .select('*')
      .eq('id', id)
      .single();
    if (previousError) throw previousError;

    const { data, error } = await this.supabase
      .from('bank_movements')
      .update(movement)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await this.applyBankMovementDelta(previous.account_id, -this.getMovementSignedAmount(previous));
    await this.applyBankMovementDelta(movement.account_id, this.getMovementSignedAmount(movement));
    return data;
  }

  async deleteBankMovement(id: string) {
    const { data: previous, error: previousError } = await this.supabase
      .from('bank_movements')
      .select('*')
      .eq('id', id)
      .single();
    if (previousError) throw previousError;

    if (previous.transfer_group_id) {
      const { data: grouped, error: groupedError } = await this.supabase
        .from('bank_movements')
        .select('*')
        .eq('transfer_group_id', previous.transfer_group_id);
      if (groupedError) throw groupedError;

      const { error: deleteGroupedError } = await this.supabase
        .from('bank_movements')
        .delete()
        .eq('transfer_group_id', previous.transfer_group_id);
      if (deleteGroupedError) throw deleteGroupedError;

      for (const movement of (grouped || [])) {
        await this.applyBankMovementDelta(movement.account_id, -this.getMovementSignedAmount(movement));
      }
      return;
    }

    const { error } = await this.supabase
      .from('bank_movements')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await this.applyBankMovementDelta(previous.account_id, -this.getMovementSignedAmount(previous));
  }

  async createTransferBetweenAccounts(payload: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    date: string;
    notes?: string | null;
  }) {
    if (payload.from_account_id === payload.to_account_id) {
      throw new Error('El origen y el destino deben ser diferentes.');
    }

    const transferGroupId = crypto.randomUUID();
    const accounts = await this.getBankAccounts();
    const fromAccount = (accounts || []).find((account: any) => account.id === payload.from_account_id);
    const toAccount = (accounts || []).find((account: any) => account.id === payload.to_account_id);

    const baseNotes = payload.notes ? `${payload.notes}` : 'Traspaso entre cuentas';

    await this.createBankMovement({
      account_id: payload.from_account_id,
      description: `Traspaso a ${toAccount?.name || 'cuenta destino'}`,
      amount: payload.amount,
      type: 'egreso',
      date: payload.date,
      notes: baseNotes,
      transfer_group_id: transferGroupId,
    });

    await this.createBankMovement({
      account_id: payload.to_account_id,
      description: `Traspaso desde ${fromAccount?.name || 'cuenta origen'}`,
      amount: payload.amount,
      type: 'ingreso',
      date: payload.date,
      notes: baseNotes,
      transfer_group_id: transferGroupId,
    });
  }

  // ── PAYMENT METHODS ──────────────────────────
  async getPaymentMethods() {
    const householdId = this.getActiveHouseholdId();
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*, bank_accounts(name)')
      .eq('household_id', householdId)
      .order('name');
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      bank_account_name: row.bank_accounts?.name,
    }));
  }

  async createPaymentMethod(pm: any) {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .insert({ ...pm, household_id: pm.household_id || this.getActiveHouseholdId() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updatePaymentMethod(id: string, pm: any) {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .update(pm)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deletePaymentMethod(id: string) {
    const { error } = await this.supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ── MEMBERS ──────────────────────────────────
  async getMembers(householdId?: string) {
    const resolvedHouseholdId = householdId || this.getActiveHouseholdId();
    let query = this.supabase
      .from('members')
      .select('*, profiles(full_name,email)')
      .order('created_at');

    if (resolvedHouseholdId) {
      query = query.eq('household_id', resolvedHouseholdId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      profile_name: row.profiles?.full_name,
      profile_email: row.profiles?.email,
      has_access: !!row.profile_id,
    }));
  }

  async createMember(member: any) {
    const { data, error } = await this.supabase
      .from('members')
      .insert({ ...member, household_id: member.household_id || this.getActiveHouseholdId() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateMember(id: string, member: any) {
    const { data, error } = await this.supabase
      .from('members')
      .update(member)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteMember(id: string) {
    const { error } = await this.supabase
      .from('members')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ── CATEGORIES ────────────────────────────────
  async getCategories() {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  }

  async createCategory(cat: any) {
    const { data, error } = await this.supabase
      .from('categories')
      .insert(cat)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ── INCOME ────────────────────────────────────
  async getIncome(year?: number, month?: number, member_id?: string) {
    const householdId = this.getActiveHouseholdId();
    let query = this.supabase
      .from('income_detail')
      .select('*')
      .eq('household_id', householdId)
      .order('year')
      .order('month');

    if (year)      query = query.eq('year', year);
    if (month)     query = query.eq('month', month);
    if (member_id) query = query.eq('member_id', member_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async createIncome(income: any) {
    const wantsBankLink = !!income?.bank_account_id;
    const payload = {
      ...income,
      household_id: income?.household_id || this.getActiveHouseholdId(),
    };
    const { data, error } = await this.supabase
      .from('income')
      .insert(payload)
      .select()
      .single();
    if (error) throw this.normalizeIncomePersistenceError(error, wantsBankLink);
    if (!data?.bank_account_id) return data;

    const movement = await this.createBankMovement({
      account_id: data.bank_account_id,
      description: data.description || 'Ingreso registrado',
      amount: data.amount,
      type: 'ingreso',
      date: this.resolveIncomeMovementDate(data.year, data.month),
      notes: 'Generado automaticamente desde ingresos',
    });

    const { error: linkError } = await this.supabase
      .from('income')
      .update({ bank_movement_id: movement.id })
      .eq('id', data.id);

    if (linkError) {
      await this.deleteBankMovement(movement.id);
      throw this.normalizeIncomePersistenceError(linkError, true);
    }

    return { ...data, bank_movement_id: movement.id };
  }

  async updateIncome(id: string, income: any) {
    const payload = {
      ...income,
      household_id: income?.household_id || this.getActiveHouseholdId(),
    };
    const { data: previous, error: previousError } = await this.supabase
      .from('income')
      .select('*')
      .eq('id', id)
      .single();
    if (previousError) throw this.normalizeIncomePersistenceError(previousError, !!income?.bank_account_id);

    const { data, error } = await this.supabase
      .from('income')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw this.normalizeIncomePersistenceError(error, !!income?.bank_account_id);

    if (previous.bank_movement_id && data?.bank_account_id) {
      await this.updateBankMovement(previous.bank_movement_id, {
        account_id: data.bank_account_id,
        description: data.description || 'Ingreso registrado',
        amount: data.amount,
        type: 'ingreso',
        date: this.resolveIncomeMovementDate(data.year, data.month),
        notes: 'Generado automaticamente desde ingresos',
      });
      return data;
    }

    if (!previous.bank_movement_id && data?.bank_account_id) {
      const movement = await this.createBankMovement({
        account_id: data.bank_account_id,
        description: data.description || 'Ingreso registrado',
        amount: data.amount,
        type: 'ingreso',
        date: this.resolveIncomeMovementDate(data.year, data.month),
        notes: 'Generado automaticamente desde ingresos',
      });
      await this.supabase
        .from('income')
        .update({ bank_movement_id: movement.id })
        .eq('id', data.id);
      return { ...data, bank_movement_id: movement.id };
    }

    if (previous.bank_movement_id && !data?.bank_account_id) {
      await this.deleteBankMovement(previous.bank_movement_id);
      await this.supabase
        .from('income')
        .update({ bank_movement_id: null })
        .eq('id', data.id);
      return { ...data, bank_movement_id: null };
    }

    return data;
  }

  async deleteIncome(id: string) {
    const { data: previous, error: previousError } = await this.supabase
      .from('income')
      .select('*')
      .eq('id', id)
      .single();
    if (previousError) throw previousError;

    const { error } = await this.supabase
      .from('income')
      .delete()
      .eq('id', id);
    if (error) throw error;

    if (previous?.bank_movement_id) {
      await this.deleteBankMovement(previous.bank_movement_id);
    }
  }

  // ── EXPENSES ──────────────────────────────────
  async getExpenses(year?: number, month?: number, member_id?: string) {
    const householdId = this.getActiveHouseholdId();
    let query = this.supabase
      .from('expenses_detail')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('start_year')
      .order('start_month');

    if (member_id) query = query.eq('member_id', member_id);

    const { data, error } = await query;
    if (error) throw error;

    // Filter by month/year if provided
    if (year && month && data) {
      return data.filter((exp: any) => this.expenseActiveInMonth(exp, month, year));
    }
    return data;
  }

  async uploadTicketPhoto(file: File): Promise<string | null> {
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `ticket_${Date.now()}.${ext}`;
    const { data, error } = await this.supabase.storage
      .from('ticket-photos')
      .upload(filename, file, { upsert: true });
    if (error) return null;
    const { data: urlData } = this.supabase.storage
      .from('ticket-photos')
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  }

  async createExpense(expense: any) {
    const { data, error } = await this.supabase
      .from('expenses')
      .insert({ ...expense, household_id: expense.household_id || this.getActiveHouseholdId() })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      await this.ensureExpenseOccurrencesAroundMonth(data.start_year, data.start_month, undefined, data.member_id || undefined);
    }
    return data;
  }

  async updateExpense(id: string, expense: any) {
    const { data, error } = await this.supabase
      .from('expenses')
      .update({ ...expense, household_id: expense.household_id || this.getActiveHouseholdId() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (data) {
      await this.ensureExpenseOccurrencesAroundMonth(data.start_year, data.start_month, undefined, data.member_id || undefined);
    }
    return data;
  }

  async deleteExpense(id: string) {
    const { error } = await this.supabase
      .from('expenses')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;

    const { error: occurrenceError } = await this.supabase
      .from('expense_occurrences')
      .delete()
      .eq('expense_id', id)
      .eq('is_paid', false);
    if (occurrenceError) throw occurrenceError;
  }

  async getExpenseOccurrences(year: number, month: number, member_id?: string) {
    const householdId = this.getActiveHouseholdId();
    await this.ensureExpenseOccurrencesAroundMonth(year, month, undefined, member_id);
    const start = this.isoDate(year, month, 1);
    const end = this.isoDate(year, month, new Date(year, month, 0).getDate());
    await this.ensurePaidOccurrenceBankMovementsForRange(start, end, member_id);

    let query = this.supabase
      .from('expense_occurrences_detail')
      .select('*')
      .eq('household_id', householdId)
      .gte('occurrence_date', start)
      .lte('occurrence_date', end)
      .order('occurrence_date')
      .order('created_at');

    if (member_id) query = query.eq('member_id', member_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getExpenseOccurrencesForYear(year: number, member_id?: string) {
    const householdId = this.getActiveHouseholdId();
    await this.ensureExpenseOccurrencesForRange(this.isoDate(year, 1, 1), this.isoDate(year, 12, 31), member_id);
    await this.ensurePaidOccurrenceBankMovementsForRange(this.isoDate(year, 1, 1), this.isoDate(year, 12, 31), member_id);

    let query = this.supabase
      .from('expense_occurrences_detail')
      .select('*')
      .eq('household_id', householdId)
      .gte('occurrence_date', this.isoDate(year, 1, 1))
      .lte('occurrence_date', this.isoDate(year, 12, 31))
      .order('occurrence_date')
      .order('created_at');

    if (member_id) query = query.eq('member_id', member_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getExpenseOccurrencesInRange(startIso: string, endIso: string, member_id?: string) {
    const householdId = this.getActiveHouseholdId();
    await this.ensureExpenseOccurrencesForRange(startIso, endIso, member_id);
    await this.ensurePaidOccurrenceBankMovementsForRange(startIso, endIso, member_id);

    let query = this.supabase
      .from('expense_occurrences_detail')
      .select('*')
      .eq('household_id', householdId)
      .gte('occurrence_date', startIso)
      .lte('occurrence_date', endIso)
      .order('occurrence_date')
      .order('created_at');

    if (member_id) query = query.eq('member_id', member_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async updateExpenseOccurrence(id: string, payload: any) {
    const { data, error } = await this.supabase
      .from('expense_occurrences')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async payExpenseOccurrence(id: string, paymentDate: string, paidPaymentMethodId?: string | null) {
    const occurrence = await this.getExpenseOccurrenceDetail(id);
    const paymentMethodId = paidPaymentMethodId || occurrence.payment_method_id || null;
    const paymentMethod = paymentMethodId ? await this.getPaymentMethodById(paymentMethodId) : null;

    let bankMovementId: string | null = occurrence.bank_movement_id || null;
    const accountId = paymentMethod ? await this.resolvePaymentMethodAccountId(paymentMethod) : null;

    if (paymentMethod && accountId) {
      const movement = await this.createBankMovement({
        account_id: accountId,
        category_id: occurrence.category_id || null,
        description: occurrence.description || 'Pago de gasto',
        amount: Number(occurrence.amount || 0),
        type: 'egreso',
        date: paymentDate,
        notes: `Generado automaticamente desde el gasto "${occurrence.description || 'Sin descripcion'}"`,
      });
      bankMovementId = movement.id;
    }

    return this.updateExpenseOccurrence(id, {
      is_paid: true,
      paid_at: paymentDate,
      paid_payment_method_id: paymentMethodId,
      bank_movement_id: bankMovementId,
    });
  }

  async unpayExpenseOccurrence(id: string) {
    const occurrence = await this.getExpenseOccurrenceDetail(id);
    if (occurrence.bank_movement_id) {
      await this.deleteBankMovement(occurrence.bank_movement_id);
    }

    return this.updateExpenseOccurrence(id, {
      is_paid: false,
      paid_at: null,
      paid_payment_method_id: null,
      bank_movement_id: null,
    });
  }

  async getCreditCardReserveSummary(year: number, month: number) {
    const startDate = new Date(year, month - 2, 1);
    const endDate = new Date(year, month, 0);
    const occurrences = await this.getExpenseOccurrencesInRange(
      this.isoDate(startDate.getFullYear(), startDate.getMonth() + 1, 1),
      this.isoDate(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate())
    );
    const paymentMethods = await this.getPaymentMethods();
    const rows = new Map<string, any>();

    for (const occurrence of (occurrences || [])) {
      const obligations = this.resolveCreditCardReserveObligations(occurrence, paymentMethods);
      for (const obligation of obligations) {
        if (!obligation.dueDate) continue;
        const dueDate = this.parseIsoDate(obligation.dueDate);
        if (dueDate.getFullYear() !== year || dueDate.getMonth() + 1 !== month) continue;

        const key = `${obligation.methodId}__${obligation.dueDate}`;
        if (!rows.has(key)) {
          rows.set(key, {
            methodId: obligation.methodId,
            methodName: obligation.methodName,
            methodColor: obligation.methodColor,
            dueDate: obligation.dueDate,
            total: 0,
            count: 0,
          });
        }

        const row = rows.get(key)!;
        row.total += obligation.amount;
        row.count += 1;
      }
    }

    return Array.from(rows.values()).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  // ── AI BUDGET SUGGESTION ─────────────────────
  async generateBudgetSuggestion(payload: {
    income: number;
    categories: any[];
    members_count: number;
    current_expenses: any[];
  }) {
    const { data, error } = await this.supabase.functions.invoke('generate-budget', {
      body: payload,
    });
    if (error) throw error;
    return data;
  }

  // ── BUDGET LIMITS ──────────────────────────────
  async getBudgetLimits(year: number, month: number, member_id?: string) {
    const householdId = this.getActiveHouseholdId();
    let query = this.supabase
      .from('budget_limits')
      .select(`*, categories(name,icon,color), members(name)`)
      .eq('household_id', householdId)
      .eq('year', year)
      .eq('month', month);

    if (member_id) query = query.eq('member_id', member_id);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      category_name:  r.categories?.name,
      category_icon:  r.categories?.icon,
      category_color: r.categories?.color,
      member_name:    r.members?.name,
    }));
  }

  async upsertBudgetLimit(limit: any) {
    const { data, error } = await this.supabase
      .from('budget_limits')
      .upsert(
        { ...limit, household_id: limit.household_id || this.getActiveHouseholdId() },
        { onConflict: 'household_id,member_id,category_id,month,year' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteBudgetLimit(id: string) {
    const { error } = await this.supabase
      .from('budget_limits')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // Helper: check if expense applies to a given month/year
  expenseActiveInMonth(exp: any, month: number, year: number): boolean {
    const startDate = new Date(exp.start_year, exp.start_month - 1);
    const checkDate = new Date(year, month - 1);

    if (checkDate < startDate) return false;
    if (exp.months_duration === 0) return true; // indefinido

    const endDate = new Date(exp.start_year, exp.start_month - 1 + exp.months_duration - 1);
    return checkDate <= endDate;
  }

  getExpenseAmountForMonth(exp: any, month: number, year: number): number {
    if (!this.expenseActiveInMonth(exp, month, year)) return 0;

    const amount = Number(exp?.amount || 0);
    if (!amount) return 0;

    if (exp?.recurrence_type === 'semanal') {
      const occurrences = this.countWeekdayOccurrencesInMonth(year, month, exp?.weekly_day);
      return amount * occurrences;
    }

    return amount;
  }

  countWeekdayOccurrencesInMonth(year: number, month: number, weekday: number | undefined | null): number {
    if (weekday === undefined || weekday === null || Number.isNaN(Number(weekday))) return 0;

    const normalizedWeekday = Number(weekday);
    const daysInMonth = new Date(year, month, 0).getDate();
    let count = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      if (new Date(year, month - 1, day).getDay() === normalizedWeekday) {
        count += 1;
      }
    }

    return count;
  }

  getWeekdayDatesInMonth(year: number, month: number, weekday: number | undefined | null): string[] {
    if (weekday === undefined || weekday === null || Number.isNaN(Number(weekday))) return [];

    const normalizedWeekday = Number(weekday);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dates: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      if (currentDate.getDay() === normalizedWeekday) {
        dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
    }

    return dates;
  }

  async ensureExpenseOccurrencesAroundMonth(year: number, month: number, futureMonths = this.occurrenceFutureMonths, member_id?: string) {
    const anchor = new Date(year, month - 1, 1);
    const start = new Date(anchor.getFullYear(), anchor.getMonth() - this.occurrencePastMonths, 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + futureMonths + 1, 0);
    await this.ensureExpenseOccurrencesForRange(this.formatDate(start), this.formatDate(end), member_id);
  }

  async ensureExpenseOccurrencesForRange(startIso: string, endIso: string, member_id?: string) {
    const householdId = this.getActiveHouseholdId();
    let expensesQuery = this.supabase
      .from('expenses_detail')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('start_year')
      .order('start_month');

    if (member_id) expensesQuery = expensesQuery.eq('member_id', member_id);

    const { data: expenses, error: expenseError } = await expensesQuery;
    if (expenseError) throw expenseError;

    const expenseIds = (expenses || []).map((expense: any) => expense.id).filter(Boolean);
    if (expenseIds.length === 0) return;

    let occurrenceQuery = this.supabase
      .from('expense_occurrences')
      .select('*')
      .gte('occurrence_date', startIso)
      .lte('occurrence_date', endIso)
      .in('expense_id', expenseIds);

    const { data: existingOccurrences, error: occurrenceError } = await occurrenceQuery;
    if (occurrenceError) throw occurrenceError;

    const desiredOccurrences = (expenses || []).flatMap((expense: any) =>
      this.buildDesiredOccurrencesForExpense(expense, startIso, endIso),
    );

    const desiredMap = new Map<string, any>();
    for (const occurrence of desiredOccurrences) {
      desiredMap.set(`${occurrence.expense_id}__${occurrence.occurrence_date}`, occurrence);
    }

    const existingMap = new Map<string, any>();
    for (const occurrence of (existingOccurrences || [])) {
      existingMap.set(`${occurrence.expense_id}__${occurrence.occurrence_date}`, occurrence);
    }

    const toInsert = desiredOccurrences.filter((occurrence: any) =>
      !existingMap.has(`${occurrence.expense_id}__${occurrence.occurrence_date}`),
    );

    const toUpdate = (existingOccurrences || []).filter((occurrence: any) => {
      if (occurrence.is_paid) return false;
      const desired = desiredMap.get(`${occurrence.expense_id}__${occurrence.occurrence_date}`);
      if (!desired) return false;
      return Number(occurrence.amount || 0) !== Number(desired.amount || 0)
        || (occurrence.payment_method_id || null) !== (desired.payment_method_id || null);
    }).map((occurrence: any) => {
      const desired = desiredMap.get(`${occurrence.expense_id}__${occurrence.occurrence_date}`);
      return {
        id: occurrence.id,
        amount: desired.amount,
        payment_method_id: desired.payment_method_id,
      };
    });

    const toDeleteIds = (existingOccurrences || [])
      .filter((occurrence: any) =>
        !occurrence.is_paid && !desiredMap.has(`${occurrence.expense_id}__${occurrence.occurrence_date}`),
      )
      .map((occurrence: any) => occurrence.id);

    if (toInsert.length > 0) {
      const { error } = await this.supabase.from('expense_occurrences').insert(toInsert);
      if (error) throw error;
    }

    for (const occurrence of toUpdate) {
      const { error } = await this.supabase
        .from('expense_occurrences')
        .update({
          amount: occurrence.amount,
          payment_method_id: occurrence.payment_method_id,
        })
        .eq('id', occurrence.id);
      if (error) throw error;
    }

    if (toDeleteIds.length > 0) {
      const { error } = await this.supabase
        .from('expense_occurrences')
        .delete()
        .in('id', toDeleteIds);
      if (error) throw error;
    }
  }

  private buildDesiredOccurrencesForExpense(expense: any, startIso: string, endIso: string) {
    const start = this.parseIsoDate(startIso);
    const end = this.parseIsoDate(endIso);
    const occurrences: any[] = [];

    for (
      let current = new Date(start.getFullYear(), start.getMonth(), 1);
      current <= end;
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
    ) {
      const month = current.getMonth() + 1;
      const year = current.getFullYear();
      if (!this.expenseActiveInMonth(expense, month, year)) continue;

      const monthDates = expense.recurrence_type === 'semanal'
        ? this.getWeekdayDatesInMonth(year, month, expense.weekly_day ?? 1)
        : [this.resolveMonthlyOccurrenceDate(expense, year, month)];

      for (const occurrenceDate of monthDates.filter(Boolean)) {
        occurrences.push({
          expense_id: expense.id,
          household_id: expense.household_id || this.getActiveHouseholdId(),
          occurrence_date: occurrenceDate,
          amount: Number(expense.amount || 0),
          payment_method_id: expense.payment_method_id || null,
          is_paid: false,
        });
      }
    }

    return occurrences;
  }

  private resolveMonthlyOccurrenceDate(expense: any, year: number, month: number) {
    const paymentDate = expense.payment_date || null;
    if (!paymentDate) return this.isoDate(year, month, 1);

    const parts = paymentDate.split('-').map(Number);
    const rawDay = parts.length === 3 && !parts.some(Number.isNaN) ? parts[2] : 1;
    const maxDay = new Date(year, month, 0).getDate();
    return this.isoDate(year, month, Math.min(rawDay, maxDay));
  }

  private isoDate(year: number, month: number, day: number) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private formatDate(date: Date) {
    return this.isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  private parseIsoDate(value: string) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private getMovementSignedAmount(movement: any) {
    const amount = Number(movement?.amount || 0);
    return movement?.type === 'egreso' ? -amount : amount;
  }

  private async applyBankMovementDelta(accountId: string, delta: number) {
    if (!accountId || !delta) return;

    const { data: account, error } = await this.supabase
      .from('bank_accounts')
      .select('id,balance')
      .eq('id', accountId)
      .single();
    if (error) throw error;

    const { error: updateError } = await this.supabase
      .from('bank_accounts')
      .update({ balance: Number(account.balance || 0) + delta })
      .eq('id', accountId);
    if (updateError) throw updateError;
  }

  private async getExpenseOccurrenceDetail(id: string) {
    const { data: detail, error } = await this.supabase
      .from('expense_occurrences_detail')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;

    const { data: raw, error: rawError } = await this.supabase
      .from('expense_occurrences')
      .select('bank_movement_id')
      .eq('id', id)
      .single();
    if (rawError) throw rawError;

    return {
      ...detail,
      bank_movement_id: raw?.bank_movement_id || null,
    };
  }

  private async ensurePaidOccurrenceBankMovementsForRange(startIso: string, endIso: string, member_id?: string) {
    const householdId = this.getActiveHouseholdId();
    let query = this.supabase
      .from('expense_occurrences_detail')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_paid', true)
      .is('bank_movement_id', null)
      .not('paid_at', 'is', null)
      .gte('occurrence_date', startIso)
      .lte('occurrence_date', endIso)
      .order('occurrence_date');

    if (member_id) query = query.eq('member_id', member_id);

    const { data, error } = await query;
    if (error) throw error;

    for (const occurrence of (data || [])) {
      const paymentMethodId = occurrence.paid_payment_method_id || occurrence.payment_method_id || null;
      if (!paymentMethodId) continue;

      const paymentMethod = await this.getPaymentMethodById(paymentMethodId);
      const accountId = await this.resolvePaymentMethodAccountId(paymentMethod);
      if (!accountId) continue;

      const movement = await this.createBankMovement({
        account_id: accountId,
        category_id: occurrence.category_id || null,
        description: occurrence.description || 'Pago de gasto',
        amount: Number(occurrence.amount || 0),
        type: 'egreso',
        date: occurrence.paid_at,
        notes: `Sincronizado automaticamente desde el gasto "${occurrence.description || 'Sin descripcion'}"`,
      });

      await this.updateExpenseOccurrence(occurrence.id, {
        bank_movement_id: movement.id,
      });
    }
  }

  private async getPaymentMethodById(id: string) {
    const { data, error } = await this.supabase
      .from('payment_methods')
      .select('*, bank_accounts(name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return {
      ...data,
      bank_account_name: data.bank_accounts?.name,
    };
  }

  private paymentMethodConsumesAccount(paymentMethod: any) {
    return !!paymentMethod?.bank_account_id;
  }

  private async resolvePaymentMethodAccountId(paymentMethod: any) {
    if (paymentMethod?.bank_account_id) return paymentMethod.bank_account_id;
    if (paymentMethod?.type !== 'efectivo') return null;

    const cashAccount = await this.getDefaultCashAccount();
    return cashAccount?.id || null;
  }

  private async getDefaultCashAccount() {
    const accounts = await this.getBankAccounts();
    const cashAccounts = (accounts || []).filter((account: any) => account.type === 'efectivo');
    if (cashAccounts.length === 0) return null;

    const preferred = cashAccounts.find((account: any) =>
      ['caja', 'efectivo', 'caja general'].includes(String(account.name || '').trim().toLowerCase())
    );

    return preferred || cashAccounts[0];
  }

  private resolveCreditCardReserveObligations(expense: any, paymentMethods: any[]) {
    const amount = Number(expense.amount || 0);
    if (!amount) return [];

    const occurrenceDate = expense.occurrence_date || null;
    if (!occurrenceDate) return [];

    const paidWithCreditCard = expense.paid_payment_method_type === 'tarjeta_credito'
      && (!!expense.paid_payment_method_id || !!expense.paid_payment_method_name);
    const plannedCreditCard = expense.payment_method_type === 'tarjeta_credito'
      && (!!expense.payment_method_id || !!expense.payment_method_name);

    if (paidWithCreditCard) {
      const paymentMethod = paymentMethods.find(method => method.id === expense.paid_payment_method_id);
      return [{
        dueDate: this.resolveExpenseDueDate(occurrenceDate, paymentMethod, true),
        methodId: expense.paid_payment_method_id || expense.paid_payment_method_name,
        methodName: expense.paid_payment_method_name || 'Tarjeta de credito',
        methodColor: paymentMethod?.color || expense.payment_method_color || '#ef4444',
        amount,
      }];
    }

    if (plannedCreditCard && !expense.paid_payment_method_id) {
      const paymentMethod = paymentMethods.find(method => method.id === expense.payment_method_id);
      return [{
        dueDate: this.resolveExpenseDueDate(occurrenceDate, paymentMethod, true),
        methodId: expense.payment_method_id || expense.payment_method_name,
        methodName: expense.payment_method_name || 'Tarjeta de credito',
        methodColor: paymentMethod?.color || expense.payment_method_color || '#ef4444',
        amount,
      }];
    }

    return [];
  }

  private resolveExpenseDueDate(baseDateIso: string | null, paymentMethod: any, treatAsCreditCard: boolean) {
    const baseDate = baseDateIso ? this.parseIsoDate(baseDateIso) : null;
    if (!baseDate) return null;

    if (treatAsCreditCard && paymentMethod?.billing_cutoff_day && paymentMethod?.payment_due_day) {
      return this.formatDate(this.resolveFirstDueDateAfter(
        this.resolveStatementCloseDate(baseDate, paymentMethod.billing_cutoff_day),
        paymentMethod.payment_due_day
      ));
    }

    if (paymentMethod?.payment_due_day) {
      return this.formatDate(this.resolveDateWithDay(baseDate.getFullYear(), baseDate.getMonth() + 1, paymentMethod.payment_due_day));
    }

    return this.formatDate(baseDate);
  }

  private resolveStatementCloseDate(baseDate: Date, cutoffDay: number) {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth() + 1;
    const currentCutoff = this.resolveDateWithDay(year, month, cutoffDay);
    if (baseDate.getTime() <= currentCutoff.getTime()) return currentCutoff;

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return this.resolveDateWithDay(nextYear, nextMonth, cutoffDay);
  }

  private resolveFirstDueDateAfter(statementClose: Date, dueDay: number) {
    const year = statementClose.getFullYear();
    const month = statementClose.getMonth() + 1;
    const candidate = this.resolveDateWithDay(year, month, dueDay);
    if (candidate.getTime() > statementClose.getTime()) return candidate;

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return this.resolveDateWithDay(nextYear, nextMonth, dueDay);
  }

  private resolveDateWithDay(year: number, month: number, day: number) {
    const maxDay = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, Math.min(day, maxDay));
  }

  private normalizeIncomePersistenceError(error: any, wantsBankLink = false) {
    const message = String(error?.message || error?.details || '').toLowerCase();
    const missingBankSchema = ['bank_account_id', 'bank_movement_id'].some(column => message.includes(column));

    if (missingBankSchema) {
      const prefix = wantsBankLink
        ? 'No se pudo guardar el ingreso porque tu base todavia no tiene la liga entre ingresos y cuentas.'
        : 'No se pudo guardar el ingreso porque la tabla income no tiene el esquema nuevo.';
      return new Error(`${prefix} Ejecuta la migracion 20260314_add_income_bank_link_and_voucher_card.sql en Supabase.`);
    }

    return error;
  }

  private resolveIncomeMovementDate(year: number, month: number) {
    return this.isoDate(year, month, 1);
  }

  private getActiveHouseholdId() {
    return localStorage.getItem('finanzas_casa_household_id') || '';
  }

  private async getCurrentAuthUserId() {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return data.user?.id || null;
  }
}
