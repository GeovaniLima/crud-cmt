import { Component, ElementRef, Input, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { CustomerService } from '../../core/services/customer.service';
import { CepService } from '../../core/services/cep.service';
import { cpfValidator, minAgeValidator } from '../../core/validators/cpf.validator';
import { formatCpf, formatCurrency } from '../../core/utils/format';
import { CreateCustomerPayload } from '../../core/models/customer.model';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, InputTextModule, InputMaskModule, ButtonModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-xl font-semibold text-gray-800">
          {{ isEditMode ? 'Editar Cliente' : 'Novo Cliente' }}
        </h1>
        <button class="btn-secondary" routerLink="/clientes">
          <i class="pi pi-arrow-left mr-1 text-xs"></i> Voltar
        </button>
      </div>

      @if (loading()) {
        <div class="bg-white rounded shadow-sm border p-12 text-center text-gray-500">
          <i class="pi pi-spin pi-spinner text-2xl"></i>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="bg-white rounded shadow-sm border border-gray-200">
          <div class="p-4 space-y-4">
            @if (isEditMode && totalSpent() !== null) {
              <div class="bg-blue-50 border border-blue-200 rounded p-3 flex items-center gap-2 text-sm">
                <i class="pi pi-wallet text-blue-600"></i>
                <span class="text-gray-700">Total gasto em pedidos:</span>
                <span class="font-semibold text-blue-700">{{ formatCurrency(totalSpent()!) }}</span>
              </div>
            }

            <section>
              <h2 class="text-sm font-semibold text-gray-700 mb-2">Dados pessoais</h2>
              <div class="grid grid-cols-12 gap-3">
                <div class="col-span-12 md:col-span-7">
                  <label class="form-label">Nome *</label>
                  <input pInputText formControlName="name" maxlength="200" />
                  @if (showError('name')) {
                    <p class="form-error">{{ errorMessage('name') }}</p>
                  }
                </div>
                <div class="col-span-12 md:col-span-5">
                  <label class="form-label">CPF *</label>
                  <p-inputMask formControlName="cpf" mask="999.999.999-99" placeholder="000.000.000-00"></p-inputMask>
                  @if (showError('cpf')) {
                    <p class="form-error">{{ errorMessage('cpf') }}</p>
                  }
                </div>
                <div class="col-span-12 md:col-span-7">
                  <label class="form-label">E-mail *</label>
                  <input pInputText formControlName="email" maxlength="255" type="email" />
                  @if (showError('email')) {
                    <p class="form-error">{{ errorMessage('email') }}</p>
                  }
                </div>
                <div class="col-span-12 md:col-span-5">
                  <label class="form-label">Data de nascimento *</label>
                  <input pInputText type="date" formControlName="birthDate" />
                  @if (showError('birthDate')) {
                    <p class="form-error">{{ errorMessage('birthDate') }}</p>
                  }
                </div>
              </div>
            </section>

            <section formGroupName="address" class="border-t pt-3">
              <h2 class="text-sm font-semibold text-gray-700 mb-2">Endereço</h2>
              <div class="grid grid-cols-12 gap-3">
                <div class="col-span-12 md:col-span-3">
                  <label class="form-label">CEP *</label>
                  <div class="relative">
                    <p-inputMask
                      formControlName="zipCode"
                      mask="99999-999"
                      placeholder="00000-000"
                      (onBlur)="onCepBlur()"
                      (onComplete)="onCepComplete()"></p-inputMask>
                    @if (cepLoading()) {
                      <i class="pi pi-spin pi-spinner absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-sm"></i>
                    }
                  </div>
                  @if (showAddressError('zipCode')) {
                    <p class="form-error">CEP é obrigatório.</p>
                  } @else if (cepNotFound()) {
                    <p class="form-error">CEP não encontrado. Preencha manualmente.</p>
                  } @else {
                    <p class="text-xs text-gray-400 mt-1">Preenchimento automático via ViaCEP</p>
                  }
                </div>
                <div class="col-span-9 md:col-span-7">
                  <label class="form-label">Rua *</label>
                  <input #ruaInput pInputText formControlName="street" />
                  @if (showAddressError('street')) {
                    <p class="form-error">Rua é obrigatória.</p>
                  }
                </div>
                <div class="col-span-3 md:col-span-2">
                  <label class="form-label">Número *</label>
                  <input #numeroInput pInputText formControlName="number" />
                  @if (showAddressError('number')) {
                    <p class="form-error">Número é obrigatório.</p>
                  }
                </div>

                <div class="col-span-12 md:col-span-5">
                  <label class="form-label">Complemento</label>
                  <input pInputText formControlName="complement" />
                </div>
                <div class="col-span-12 md:col-span-4">
                  <label class="form-label">Bairro *</label>
                  <input pInputText formControlName="neighborhood" />
                  @if (showAddressError('neighborhood')) {
                    <p class="form-error">Bairro é obrigatório.</p>
                  }
                </div>
                <div class="col-span-8 md:col-span-2">
                  <label class="form-label">Cidade *</label>
                  <input pInputText formControlName="city" />
                  @if (showAddressError('city')) {
                    <p class="form-error">Cidade é obrigatória.</p>
                  }
                </div>
                <div class="col-span-4 md:col-span-1">
                  <label class="form-label">UF *</label>
                  <input pInputText formControlName="state" maxlength="2" class="uppercase" />
                  @if (showAddressError('state')) {
                    <p class="form-error">UF.</p>
                  }
                </div>
              </div>
            </section>
          </div>

          <div class="border-t bg-gray-50 px-4 py-3 flex justify-end gap-2
                      sticky bottom-0 z-10 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]
                      md:static md:shadow-none">
            <button type="button" class="btn-secondary" routerLink="/clientes">Cancelar</button>
            <button type="submit" class="btn-primary" [disabled]="saving()">
              @if (saving()) {
                <i class="pi pi-spin pi-spinner mr-1"></i>
              } @else {
                <i class="pi pi-check mr-1 text-xs"></i>
              }
              Salvar
            </button>
          </div>
        </form>
      }
    </div>
  `
})
export class ClienteFormComponent implements OnInit {
  @Input() id?: string;

  @ViewChild('numeroInput') numeroInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(CustomerService);
  private readonly cepService = inject(CepService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly cepLoading = signal(false);
  readonly cepNotFound = signal(false);
  readonly totalSpent = signal<number | null>(null);
  readonly formatCurrency = formatCurrency;

  private lastLookedUpCep = '';

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    birthDate: ['', [Validators.required, minAgeValidator(18)]],
    cpf: ['', [Validators.required, cpfValidator]],
    address: this.fb.nonNullable.group({
      zipCode: ['', Validators.required],
      street: ['', Validators.required],
      number: ['', Validators.required],
      complement: [''],
      neighborhood: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]]
    })
  });

  get isEditMode(): boolean {
    return !!this.id;
  }

  ngOnInit(): void {
    if (this.isEditMode && this.id) {
      this.loading.set(true);
      this.service.getById(this.id).subscribe({
        next: c => {
          this.form.patchValue({
            name: c.name,
            email: c.email,
            birthDate: c.birthDate,
            cpf: formatCpf(c.cpf),
            address: {
              zipCode: c.address.zipCode,
              street: c.address.street,
              number: c.address.number,
              complement: c.address.complement ?? '',
              neighborhood: c.address.neighborhood,
              city: c.address.city,
              state: c.address.state
            }
          });
          this.lastLookedUpCep = c.address.zipCode.replace(/\D/g, '');
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Cliente não encontrado.' });
          this.router.navigate(['/clientes']);
        }
      });

      this.service.getTotalSpent(this.id).subscribe({
        next: r => this.totalSpent.set(r.totalSpent),
        error: () => this.totalSpent.set(0)
      });
    }
  }

  onCepComplete(): void {
    this.lookupCep();
  }

  onCepBlur(): void {
    this.lookupCep();
  }

  // Consulta ViaCEP quando o campo CEP fica completo (onComplete da mascara)
  // ou quando perde o foco (onBlur), o que vier primeiro. Cache do ultimo CEP
  // consultado evita disparar 2 chamadas seguidas pelos dois eventos.
  private lookupCep(): void {
    const raw = this.form.controls.address.controls.zipCode.value ?? '';
    const digits = raw.replace(/\D/g, '');

    if (digits.length !== 8 || digits === this.lastLookedUpCep) return;

    this.lastLookedUpCep = digits;
    this.cepNotFound.set(false);
    this.cepLoading.set(true);

    this.cepService.lookup(digits).subscribe({
      next: result => {
        this.cepLoading.set(false);
        if (!result) {
          this.cepNotFound.set(true);
          return;
        }
        this.form.controls.address.patchValue({
          street: result.street || this.form.controls.address.controls.street.value,
          neighborhood: result.neighborhood || this.form.controls.address.controls.neighborhood.value,
          city: result.city || this.form.controls.address.controls.city.value,
          state: result.state || this.form.controls.address.controls.state.value
        });
        queueMicrotask(() => this.numeroInput?.nativeElement.focus());
      },
      error: () => {
        this.cepLoading.set(false);
        this.cepNotFound.set(true);
        this.messageService.add({ severity: 'warn', summary: 'CEP', detail: 'Falha ao consultar CEP. Preencha manualmente.' });
      }
    });
  }

  showError(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  showAddressError(field: string): boolean {
    const c = this.form.get(['address', field]);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  errorMessage(field: string): string {
    const c = this.form.get(field);
    if (!c?.errors) return '';
    if (c.errors['required']) return 'Campo obrigatório.';
    if (c.errors['email']) return 'E-mail inválido.';
    if (c.errors['cpfInvalid']) return 'CPF inválido.';
    if (c.errors['minAge']) return `Cliente deve ter pelo menos ${c.errors['minAge'].required} anos.`;
    if (c.errors['maxlength']) return `Máximo de ${c.errors['maxlength'].requiredLength} caracteres.`;
    if (c.errors['pattern']) return 'Formato inválido.';
    return 'Valor inválido.';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Validação', detail: 'Corrija os campos destacados.' });
      return;
    }

    this.saving.set(true);
    const v = this.form.getRawValue();
    const payload: CreateCustomerPayload = {
      name: v.name,
      email: v.email,
      birthDate: v.birthDate,
      cpf: v.cpf.replace(/\D/g, ''),
      address: {
        street: v.address.street,
        number: v.address.number,
        complement: v.address.complement || null,
        neighborhood: v.address.neighborhood,
        city: v.address.city,
        state: v.address.state.toUpperCase(),
        zipCode: v.address.zipCode.replace(/\D/g, '')
      }
    };

    const obs = this.isEditMode
      ? this.service.update(this.id!, payload)
      : this.service.create(payload);

    obs.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.isEditMode ? 'Atualizado' : 'Criado',
          detail: 'Cliente salvo com sucesso.'
        });
        this.router.navigate(['/clientes']);
      },
      error: e => {
        this.saving.set(false);
        // status 0 (conexao caiu) ja e tratado pelo retry.interceptor, que aciona
        // o BackendStatusService - o overlay global reaparece e o usuario apenas
        // espera. Nao mostramos toast aqui para nao poluir.
        if (e?.status === 0) return;
        const detail = e?.error?.detail ?? 'Erro ao salvar cliente.';
        this.messageService.add({ severity: 'error', summary: 'Erro', detail });
      }
    });
  }
}
