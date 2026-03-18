import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category, Member, PaymentMethod, PAYMENT_METHOD_TYPES, PaymentMethodType } from '../../core/models/models';
import { SupabaseService } from '../../core/services/supabase.service';

type Step = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-quick-capture',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quick-capture.component.html',
  styleUrl: './quick-capture.component.scss',
})
export class QuickCaptureComponent implements OnInit {
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  step: Step = 1;
  saving = false;

  // Step 1
  amount = 0;
  quickAmounts = [50, 100, 200, 500, 1000, 2000];

  // Step 2
  categories: Category[] = [];
  selectedCategoryId = '';
  selectedCategory: Category | null = null;

  // Step 3
  description = '';
  ticketFile: File | null = null;
  ticketPreview: string | null = null;

  // Step 4
  members: Member[] = [];
  paymentMethods: PaymentMethod[] = [];
  selectedMemberId = '';
  selectedPaymentMethodId = '';
  isPaid = false;
  expenseDate = '';

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    this.expenseDate = this.today();
    const [cats, mems, pms] = await Promise.all([
      this.supabase.getCategories(),
      this.supabase.getMembers(),
      this.supabase.getPaymentMethods(),
    ]);
    this.categories = cats || [];
    this.members = mems || [];
    this.paymentMethods = pms || [];
  }

  setAmount(val: number) {
    this.amount = val;
  }

  selectCategory(cat: Category | null) {
    this.selectedCategory = cat;
    this.selectedCategoryId = cat?.id || '';
    if (!this.description && cat) {
      this.description = cat.name;
    }
    setTimeout(() => this.goToStep(3), 180);
  }

  triggerFileInput() {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input?.click();
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.ticketFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.ticketPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removePhoto(event: Event) {
    event.stopPropagation();
    this.ticketFile = null;
    this.ticketPreview = null;
  }

  canProceed(): boolean {
    if (this.step === 1) return this.amount > 0;
    if (this.step === 3) return !!this.description;
    return true;
  }

  next() {
    if (!this.canProceed()) return;
    this.goToStep((this.step + 1) as Step);
  }

  back() {
    if (this.step > 1) this.goToStep((this.step - 1) as Step);
  }

  goToStep(s: Step) {
    this.step = s;
  }

  async save() {
    if (!this.description || !this.amount) return;
    this.saving = true;
    try {
      let notes: string | null = null;
      if (this.ticketFile) {
        const url = await this.supabase.uploadTicketPhoto(this.ticketFile);
        if (url) notes = 'ticket:' + url;
      }
      const now = new Date();
      await this.supabase.createExpense({
        description: this.description,
        amount: this.amount,
        category_id: this.selectedCategoryId || null,
        member_id: this.selectedMemberId || null,
        payment_method_id: this.selectedPaymentMethodId || null,
        recurrence_type: 'mensual',
        months_duration: 1,
        start_month: now.getMonth() + 1,
        start_year: now.getFullYear(),
        is_fixed: false,
        is_active: true,
        is_paid: this.isPaid,
        payment_date: this.expenseDate || null,
        notes,
      });
      this.saved.emit();
    } catch (err) {
      console.error(err);
    }
    this.saving = false;
  }

  cancel() {
    this.cancelled.emit();
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) this.cancel();
  }

  getPaymentMethodIcon(type?: PaymentMethodType): string {
    return PAYMENT_METHOD_TYPES.find(item => item.value === type)?.icon || '💳';
  }

  private today(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
}
