// Payment Method model
export type PaymentMethodType = 'tarjeta_credito' | 'tarjeta_debito' | 'tarjeta_vales' | 'efectivo' | 'transferencia';

export interface PaymentMethod {
  id?: string;
  name: string;
  type: PaymentMethodType;
  bank?: string;
  last_four?: string;
  bank_account_id?: string;
  bank_account_name?: string;
  billing_cutoff_day?: number;
  payment_due_day?: number;
  color: string;
  created_at?: string;
}

export const PAYMENT_METHOD_TYPES: { value: PaymentMethodType; label: string; icon: string }[] = [
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito', icon: '💳' },
  { value: 'tarjeta_debito',  label: 'Tarjeta de débito',  icon: '🏧' },
  { value: 'tarjeta_vales',   label: 'Tarjeta de vales',   icon: '🎟️' },
  { value: 'efectivo',        label: 'Efectivo',            icon: '💵' },
  { value: 'transferencia',   label: 'Transferencia',       icon: '🔄' },
];

// Bank Account model
export type BankAccountType = 'debito' | 'credito' | 'ahorro' | 'inversion' | 'efectivo';

export interface BankAccount {
  id?: string;
  name: string;
  bank: string;
  type: BankAccountType;
  balance: number;
  color: string;
  is_active?: boolean;
  created_at?: string;
}

export const BANK_ACCOUNT_TYPES: { value: BankAccountType; label: string; icon: string }[] = [
  { value: 'debito',    label: 'Débito',    icon: '🏧' },
  { value: 'credito',   label: 'Crédito',   icon: '💳' },
  { value: 'ahorro',    label: 'Ahorro',    icon: '🏦' },
  { value: 'inversion', label: 'Inversión', icon: '📈' },
  { value: 'efectivo',  label: 'Efectivo',  icon: '💵' },
];

// Bank Movement model
export interface BankMovement {
  id?: string;
  account_id: string;
  category_id?: string;
  description: string;
  amount: number;
  type: 'ingreso' | 'egreso';
  date: string;
  notes?: string;
  transfer_group_id?: string;
  created_at?: string;
  // joined
  account_name?: string;
  account_color?: string;
  account_bank?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

// Member model
export interface Member {
  id?: string;
  household_id?: string;
  profile_id?: string;
  name: string;
  email?: string;
  avatar_color: string;
  profile_name?: string;
  profile_email?: string;
  has_access?: boolean;
  created_at?: string;
}

export type HouseholdRole = 'owner' | 'admin' | 'editor' | 'viewer' | 'limited';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'inactive';

export interface UserProfile {
  id: string;
  email?: string;
  full_name: string;
  avatar_color?: string;
  is_active?: boolean;
  is_platform_admin?: boolean;
  created_at?: string;
}

export interface Household {
  id?: string;
  name: string;
  slug?: string;
  owner_user_id?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface HouseholdMembership {
  id?: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  is_active?: boolean;
  household_name?: string;
  user_name?: string;
  user_email?: string;
  created_at?: string;
}

export interface HouseholdInvite {
  id?: string;
  household_id: string;
  email: string;
  role: HouseholdRole;
  status: InviteStatus;
  token?: string;
  message?: string;
  expires_at?: string;
  sent_at?: string;
  accepted_at?: string;
  household_name?: string;
  invite_link?: string;
  created_at?: string;
}

export interface SubscriptionPlan {
  id?: string;
  code: string;
  name: string;
  description?: string;
  price_monthly?: number;
  max_members?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface HouseholdSubscription {
  id?: string;
  household_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  starts_at?: string;
  ends_at?: string;
  household_name?: string;
  plan_name?: string;
  created_at?: string;
}

export interface ExpenseSplitRule {
  id?: string;
  expense_id: string;
  member_id?: string;
  user_id?: string;
  percentage: number;
  created_at?: string;
  member_name?: string;
  user_name?: string;
}

export interface ExpenseOccurrenceAllocation {
  id?: string;
  expense_occurrence_id: string;
  member_id?: string;
  user_id?: string;
  percentage: number;
  amount: number;
  settlement_account_id?: string;
  is_settled?: boolean;
  settled_at?: string;
  member_name?: string;
  user_name?: string;
  settlement_account_name?: string;
  created_at?: string;
}

// Category model
export interface Category {
  id?: string;
  name: string;
  icon: string;
  color: string;
}

// Income model
export interface Income {
  id?: string;
  member_id?: string;
  bank_account_id?: string;
  bank_movement_id?: string;
  amount: number;
  description?: string;
  month: number;
  year: number;
  created_at?: string;
  // Joined
  member_name?: string;
  member_color?: string;
  bank_account_name?: string;
  bank_account_type?: BankAccountType;
}

// Expense model
export interface Expense {
  id?: string;
  member_id?: string;
  category_id?: string;
  description: string;
  amount: number;
  recurrence_type?: ExpenseRecurrenceType;
  weekly_day?: number;
  months_duration: number; // 0 = indefinido
  start_month: number;
  start_year: number;
  is_fixed: boolean;
  is_active: boolean;
  payment_method_id?: string;
  payment_date?: string;
  is_paid?: boolean;
  paid_payment_method_id?: string;
  notes?: string;
  created_at?: string;
  // Joined
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  member_name?: string;
  member_color?: string;
  payment_method_name?: string;
  payment_method_type?: PaymentMethodType;
  payment_method_last_four?: string;
  payment_method_bank?: string;
  payment_method_color?: string;
  paid_payment_method_name?: string;
  paid_payment_method_type?: PaymentMethodType;
  paid_payment_method_last_four?: string;
  base_amount?: number;
  monthly_amount?: number;
  occurrences_in_month?: number;
}

export interface ExpenseOccurrence {
  id?: string;
  expense_id: string;
  occurrence_date: string;
  amount: number;
  payment_method_id?: string;
  bank_movement_id?: string;
  is_paid?: boolean;
  paid_at?: string;
  paid_payment_method_id?: string;
  created_at?: string;
  description?: string;
  notes?: string;
  recurrence_type?: ExpenseRecurrenceType;
  weekly_day?: number;
  is_fixed?: boolean;
  months_duration?: number;
  start_month?: number;
  start_year?: number;
  category_id?: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  member_id?: string;
  member_name?: string;
  member_color?: string;
  payment_method_name?: string;
  payment_method_type?: PaymentMethodType;
  payment_method_last_four?: string;
  payment_method_bank?: string;
  payment_method_color?: string;
  paid_payment_method_name?: string;
  paid_payment_method_type?: PaymentMethodType;
  paid_payment_method_last_four?: string;
}

export type ExpenseRecurrenceType = 'mensual' | 'semanal';

export const EXPENSE_RECURRENCE_TYPES: { value: ExpenseRecurrenceType; label: string }[] = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'semanal', label: 'Semanal' },
];

export const WEEKDAY_OPTIONS: { value: number; label: string; shortLabel: string }[] = [
  { value: 1, label: 'Lunes', shortLabel: 'lun' },
  { value: 2, label: 'Martes', shortLabel: 'mar' },
  { value: 3, label: 'Miercoles', shortLabel: 'mie' },
  { value: 4, label: 'Jueves', shortLabel: 'jue' },
  { value: 5, label: 'Viernes', shortLabel: 'vie' },
  { value: 6, label: 'Sabado', shortLabel: 'sab' },
  { value: 0, label: 'Domingo', shortLabel: 'dom' },
];

// Monthly summary
export interface MonthlySummary {
  month: number;
  year: number;
  total_income: number;
  total_expenses: number;
  balance: number;
  savings_rate: number;
  expenses_by_category: CategoryTotal[];
}

export interface CategoryTotal {
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  count: number;
  percentage: number;
}

// Budget Limit model
export interface BudgetLimit {
  id?: string;
  member_id: string;
  category_id: string;
  month: number;
  year: number;
  limit_amount: number;
  created_at?: string;
  // joined
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  member_name?: string;
}

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const AVATAR_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];
