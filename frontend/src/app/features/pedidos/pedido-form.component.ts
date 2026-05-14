import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { firstValueFrom, forkJoin } from 'rxjs';
import { CustomerService } from '../../core/services/customer.service';
import { OrderService } from '../../core/services/order.service';
import { ProductService } from '../../core/services/product.service';
import { BackendStatusService } from '../../core/services/backend-status.service';
import { Customer } from '../../core/models/customer.model';
import { Product } from '../../core/models/product.model';
import { CreateOrderPayload, UpdateOrderPayload } from '../../core/models/order.model';
import { formatCurrency } from '../../core/utils/format';

@Component({
  selector: 'app-pedido-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    InputTextModule, ButtonModule, DropdownModule, InputNumberModule, DialogModule
  ],
  template: `
    <div class="max-w-5xl mx-auto space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-xl font-semibold text-gray-800">
          {{ isEditMode ? 'Editar Pedido' : 'Novo Pedido' }}
        </h1>
        <button class="btn-secondary" routerLink="/pedidos">
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
            <section>
              <h2 class="text-sm font-semibold text-gray-700 mb-2">Dados do pedido</h2>
              <div class="grid grid-cols-12 gap-3">
                <div class="col-span-12 md:col-span-8">
                  <label class="form-label">Cliente *</label>
                  <p-dropdown formControlName="customerId" [options]="customers()" optionValue="id"
                              optionLabel="name" placeholder="Selecione o cliente"
                              [filter]="true" filterBy="name,cpf" styleClass="w-full">
                    <ng-template let-c pTemplate="item">
                      <div class="flex flex-col">
                        <span class="text-sm">{{ c.name }}</span>
                        <span class="text-xs text-gray-500">{{ c.cpfFormatted }}</span>
                      </div>
                    </ng-template>
                  </p-dropdown>
                  @if (showError('customerId')) {
                    <p class="form-error">Cliente é obrigatório.</p>
                  }
                </div>
                <div class="col-span-12 md:col-span-4">
                  <label class="form-label">Data do pedido *</label>
                  <input pInputText type="datetime-local" formControlName="orderDate" />
                  @if (showError('orderDate')) {
                    <p class="form-error">Data é obrigatória.</p>
                  }
                </div>
              </div>
            </section>

            <section class="border-t pt-3">
              <div class="flex items-center justify-between mb-2">
                <h2 class="text-sm font-semibold text-gray-700">Itens do pedido</h2>
                <button type="button" class="btn-secondary text-xs" (click)="openAddItem()">
                  <i class="pi pi-plus mr-1 text-xs"></i> Adicionar item
                </button>
              </div>

              @if (items.length === 0) {
                <div class="border border-dashed border-gray-300 rounded-lg p-8 text-center text-sm text-gray-500 bg-gray-50">
                  <i class="pi pi-shopping-cart text-2xl block mb-2"></i>
                  Nenhum item adicionado. Clique em "Adicionar item" para começar.
                </div>
              } @else {
                <!--
                  Lista de itens em cards: cabe em telas estreitas sem scroll lateral,
                  e mostra o essencial (nome, qty x preco, subtotal). Detalhes/edicao
                  abrem em modal via "openEditItem(i)". max-h-[55vh] limita a area
                  para nao empurrar o total e o botao "Salvar" para fora da tela.
                -->
                <div class="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  @for (item of items.controls; track $index; let i = $index) {
                    <div class="border border-gray-200 rounded-lg p-3 flex items-center gap-3 hover:border-gray-300 hover:bg-blue-50/20 transition-colors">
                      <div class="flex-1 min-w-0">
                        <div class="font-medium text-gray-800 truncate">{{ productNameOf(i) || '(sem produto)' }}</div>
                        <div class="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span>{{ quantityOf(i) }} <span class="text-gray-400">×</span> <span class="tabular-nums">{{ formatCurrency(soldPriceOf(i)) }}</span></span>
                          @if (hasDiscount(i)) {
                            <span class="text-yellow-700 inline-flex items-center gap-1" title="Preço de venda difere do tabela">
                              <i class="pi pi-tag text-[10px]"></i>
                              tabela: <span class="tabular-nums">{{ formatCurrency(unitPriceOf(i)) }}</span>
                            </span>
                          }
                        </div>
                      </div>
                      <div class="text-right shrink-0">
                        <div class="font-semibold text-gray-900 tabular-nums">{{ formatCurrency(subtotal(i)) }}</div>
                      </div>
                      <div class="flex gap-1 shrink-0">
                        <button type="button"
                                class="w-8 h-8 inline-flex items-center justify-center rounded text-blue-600 hover:bg-blue-50"
                                (click)="openEditItem(i)" title="Editar item">
                          <i class="pi pi-pencil text-sm"></i>
                        </button>
                        <button type="button"
                                class="w-8 h-8 inline-flex items-center justify-center rounded text-red-600 hover:bg-red-50"
                                (click)="removeItem(i)" title="Remover">
                          <i class="pi pi-trash text-sm"></i>
                        </button>
                      </div>
                    </div>
                  }
                </div>

                <div class="mt-3 flex flex-wrap justify-end items-end gap-4">
                  <div class="text-xs text-gray-500">{{ items.length }} item(ns)</div>
                  <div class="text-right">
                    <div class="text-xs text-gray-500">Total do pedido</div>
                    <div class="text-2xl font-semibold text-brand-primary tabular-nums">{{ formatCurrency(total()) }}</div>
                  </div>
                </div>
              }
            </section>
          </div>

          <!--
            Rodapé com os botoes principais: fica sticky no bottom em mobile/tablet
            (sempre acessivel mesmo rolando o conteudo) e estatico no desktop.
            z-10 evita que cards de itens passem por cima.
          -->
          <div class="border-t bg-gray-50 px-4 py-3 flex justify-end gap-2
                      sticky bottom-0 z-10 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]
                      md:static md:shadow-none">
            <button type="button" class="btn-secondary" routerLink="/pedidos">Cancelar</button>
            <button type="submit" class="btn-primary" [disabled]="saving() || items.length === 0">
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

    <!--
      Modal de adicionar/editar item. Usa um FormGroup independente (itemDialogForm)
      para nao mexer no FormArray do pedido ate o usuario confirmar - assim "Cancelar"
      nao deixa metade de uma alteracao no estado do pedido.
    -->
    <p-dialog [visible]="itemDialogOpen()"
              (visibleChange)="onDialogVisibleChange($event)"
              [modal]="true"
              [draggable]="false"
              [closable]="true"
              [dismissableMask]="true"
              [header]="editingItemIndex() !== null ? 'Editar item' : 'Adicionar item'"
              [style]="{ width: '480px' }"
              styleClass="!max-w-[92vw]">
      <form [formGroup]="itemDialogForm" (ngSubmit)="confirmItem()" class="space-y-3 pt-1">
        <div>
          <label class="form-label">Produto *</label>
          <p-dropdown formControlName="productId" [options]="dialogProductOptions()" optionValue="id"
                      optionLabel="name" placeholder="Buscar produto..."
                      [filter]="true" filterBy="name" styleClass="w-full" appendTo="body">
            <ng-template let-p pTemplate="item">
              <div class="flex justify-between items-center w-full gap-3">
                <span class="text-sm truncate">{{ p.name }}</span>
                <span class="text-xs text-gray-500 whitespace-nowrap">{{ formatCurrency(p.unitPrice) }}</span>
              </div>
            </ng-template>
          </p-dropdown>
          @if (showDialogError('productId')) {
            <p class="form-error">Selecione um produto.</p>
          }
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Quantidade *</label>
            <p-inputNumber formControlName="quantity" [min]="1" [showButtons]="true"
                           buttonLayout="horizontal" decrementButtonClass="p-button-secondary p-button-sm"
                           incrementButtonClass="p-button-secondary p-button-sm"
                           incrementButtonIcon="pi pi-plus" decrementButtonIcon="pi pi-minus"
                           inputStyleClass="text-center" styleClass="w-full"></p-inputNumber>
            @if (showDialogError('quantity')) {
              <p class="form-error">Quantidade deve ser maior que zero.</p>
            }
          </div>
          <div>
            <label class="form-label">Preço Venda *</label>
            <p-inputNumber formControlName="soldPrice" mode="currency" currency="BRL" locale="pt-BR"
                           [min]="0" [minFractionDigits]="2" [maxFractionDigits]="2"
                           inputStyleClass="text-right" styleClass="w-full"></p-inputNumber>
            @if (showDialogError('soldPrice')) {
              <p class="form-error">Preço inválido.</p>
            }
          </div>
        </div>

        <!-- Painel resumo: tabela vs venda + subtotal calculado -->
        <div class="bg-gray-50 rounded border border-gray-200 px-3 py-2 text-sm">
          <div class="flex items-center justify-between text-gray-600 text-xs">
            <span>Preço de tabela</span>
            <span class="tabular-nums">{{ formatCurrency(dialogUnitPrice()) }}</span>
          </div>
          @if (dialogHasDiscount()) {
            <div class="flex items-center justify-between text-yellow-700 text-xs mt-1">
              <span><i class="pi pi-tag text-[10px] mr-1"></i>{{ dialogDiscountLabel() }}</span>
              <span class="tabular-nums">{{ formatCurrency(dialogUnitPrice() - dialogSoldPrice()) }}</span>
            </div>
          }
          <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
            <span class="text-xs text-gray-500">Subtotal</span>
            <span class="text-lg font-semibold text-brand-primary tabular-nums">{{ formatCurrency(dialogSubtotal()) }}</span>
          </div>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <button type="button" class="btn-secondary" (click)="closeItemDialog()">Cancelar</button>
        <button type="button" class="btn-primary" (click)="confirmItem()">
          <i class="pi pi-check mr-1 text-xs"></i>
          {{ editingItemIndex() !== null ? 'Atualizar' : 'Adicionar' }}
        </button>
      </ng-template>
    </p-dialog>
  `
})
export class PedidoFormComponent implements OnInit {
  @Input() id?: string;

  private readonly fb = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly orderService = inject(OrderService);
  private readonly productService = inject(ProductService);
  private readonly backend = inject(BackendStatusService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly saving = signal(false);
  readonly loading = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly products = signal<Product[]>([]);
  readonly formatCurrency = formatCurrency;

  // Estado do modal de item. dialogExtra guarda um produto "sintetico" usado quando
  // editamos um item de pedido legado cujo produto nao existe no catalogo atual -
  // assim o dropdown ainda mostra o nome correto.
  readonly itemDialogOpen = signal(false);
  readonly editingItemIndex = signal<number | null>(null);
  readonly dialogExtra = signal<Product | null>(null);

  readonly form = this.fb.nonNullable.group({
    customerId: ['', Validators.required],
    orderDate: [this.nowLocalISO(), Validators.required],
    items: this.fb.nonNullable.array<FormGroup>([])
  });

  // FormGroup independente do FormArray principal - so vira commit no FormArray
  // quando o usuario clica Adicionar/Atualizar no modal.
  readonly itemDialogForm = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    productName: [''],
    unitPrice: [0],
    soldPrice: [0, [Validators.required, Validators.min(0)]],
    quantity: [1, [Validators.required, Validators.min(1)]]
  });

  readonly itemsValue = toSignal(this.form.controls.items.valueChanges, { initialValue: [] as any[] });
  readonly dialogValue = toSignal(this.itemDialogForm.valueChanges, { initialValue: this.itemDialogForm.getRawValue() });

  readonly total = computed(() =>
    this.itemsValue().reduce((s: number, item: any) => s + (Number(item.quantity) || 0) * (Number(item.soldPrice) || 0), 0)
  );

  readonly dialogSubtotal = computed(() => {
    const v = this.dialogValue();
    return (Number(v.quantity) || 0) * (Number(v.soldPrice) || 0);
  });

  readonly dialogProductOptions = computed(() => {
    const products = this.products();
    const extra = this.dialogExtra();
    return extra ? [extra, ...products] : products;
  });

  get items(): FormArray {
    return this.form.controls.items;
  }

  get isEditMode(): boolean {
    return !!this.id;
  }

  constructor() {
    // Quando o usuario seleciona um produto no dropdown do modal, preenchemos nome
    // e os dois precos (tabela + venda) automaticamente. Em edicao, isso so dispara
    // se o usuario REALMENTE mudar o produto - o openEditItem usa { emitEvent: false }
    // para nao sobrescrever os valores carregados.
    this.itemDialogForm.controls.productId.valueChanges.subscribe(id => {
      if (!id) return;
      const all = [...this.products(), ...(this.dialogExtra() ? [this.dialogExtra()!] : [])];
      const product = all.find(p => p.id === id);
      if (product) {
        this.itemDialogForm.patchValue(
          { productName: product.name, unitPrice: product.unitPrice, soldPrice: product.unitPrice },
          { emitEvent: true }
        );
      }
    });
  }

  ngOnInit(): void {
    this.loading.set(true);

    const sources = forkJoin({
      customers: this.customerService.list(undefined, 1, 200),
      products: this.productService.list()
    });

    sources.subscribe({
      next: ({ customers, products }) => {
        this.customers.set(customers.items);
        this.products.set(products);

        if (this.isEditMode && this.id) {
          this.loadOrder();
        } else {
          this.loading.set(false);
        }
      },
      error: (e: any) => {
        this.loading.set(false);
        // status 0 = conexao caiu (cold start). Overlay global cuida.
        if (e?.status === 0) return;
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar dados.' });
      }
    });
  }

  private loadOrder(): void {
    this.orderService.getById(this.id!).subscribe({
      next: order => {
        // Checagem cliente-side - poupa o usuario de preencher tudo e tomar 409 do servidor.
        // A regra real continua no dominio (Order.Update lanca DomainConflictException).
        if (!order.canBeModified) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Bloqueado',
            detail: 'Este pedido passou de 24h e não pode mais ser editado.'
          });
          this.router.navigate(['/pedidos', this.id]);
          return;
        }
        this.form.patchValue({
          customerId: order.customerId,
          orderDate: this.utcToBrtInput(order.orderDate)
        });
        for (const it of order.items) {
          const matched = this.products().find(p => p.name === it.productName);
          const productId = matched ? matched.id : `custom-${this.items.length}-${Date.now()}`;
          this.items.push(this.buildItemGroup(productId, it.productName, it.quantity, it.unitPrice, it.soldPrice));
        }
        this.loading.set(false);
      },
      error: (e: any) => {
        this.loading.set(false);
        // status 0 = conexao caiu (cold start). Overlay global cuida.
        if (e?.status === 0) return;
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Pedido não encontrado.' });
        this.router.navigate(['/pedidos']);
      }
    });
  }

  // ===== Modal de item =====

  openAddItem(): void {
    this.editingItemIndex.set(null);
    this.dialogExtra.set(null);
    this.itemDialogForm.reset(
      { productId: '', productName: '', unitPrice: 0, soldPrice: 0, quantity: 1 },
      { emitEvent: false }
    );
    this.itemDialogOpen.set(true);
  }

  openEditItem(i: number): void {
    const c = this.items.at(i);
    const productId = c.get('productId')?.value as string;
    const productName = c.get('productName')?.value;
    const unitPrice = c.get('unitPrice')?.value;
    const soldPrice = c.get('soldPrice')?.value;
    const quantity = c.get('quantity')?.value;

    // Se for um produto fora do catalogo (id sintetico "custom-*" ou produto removido),
    // injeta como extra no dropdown so para esta edicao.
    const isCustom = typeof productId === 'string' && productId.startsWith('custom-');
    const inCatalog = this.products().some(p => p.id === productId);
    if (productId && (isCustom || !inCatalog)) {
      this.dialogExtra.set({ id: productId, name: productName, unitPrice });
    } else {
      this.dialogExtra.set(null);
    }

    this.editingItemIndex.set(i);
    // emitEvent:false evita que a subscription do productId sobrescreva
    // soldPrice/unitPrice carregados do item (caso o item tenha desconto custom).
    this.itemDialogForm.reset(
      { productId, productName, unitPrice, soldPrice, quantity },
      { emitEvent: false }
    );
    this.itemDialogOpen.set(true);
  }

  closeItemDialog(): void {
    this.itemDialogOpen.set(false);
    this.editingItemIndex.set(null);
    this.dialogExtra.set(null);
  }

  // PrimeNG dispara visibleChange para os dois sentidos (open e close);
  // tratamos so o close para fazer cleanup.
  onDialogVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closeItemDialog();
    } else {
      this.itemDialogOpen.set(true);
    }
  }

  confirmItem(): void {
    if (this.itemDialogForm.invalid) {
      this.itemDialogForm.markAllAsTouched();
      return;
    }
    const v = this.itemDialogForm.getRawValue();
    const editingIndex = this.editingItemIndex();

    if (editingIndex !== null) {
      // Atualiza item existente no FormArray
      this.items.at(editingIndex).patchValue({
        productId: v.productId,
        productName: v.productName,
        unitPrice: v.unitPrice,
        soldPrice: v.soldPrice,
        quantity: v.quantity
      });
    } else {
      this.items.push(this.buildItemGroup(v.productId, v.productName, v.quantity, v.unitPrice, v.soldPrice));
    }

    this.closeItemDialog();
  }

  showDialogError(field: string): boolean {
    const c = this.itemDialogForm.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  dialogUnitPrice(): number {
    return Number(this.itemDialogForm.controls.unitPrice.value) || 0;
  }

  dialogSoldPrice(): number {
    return Number(this.itemDialogForm.controls.soldPrice.value) || 0;
  }

  dialogHasDiscount(): boolean {
    const u = this.dialogUnitPrice();
    const s = this.dialogSoldPrice();
    return u > 0 && Math.abs(u - s) > 0.001;
  }

  dialogDiscountLabel(): string {
    const u = this.dialogUnitPrice();
    const s = this.dialogSoldPrice();
    if (s < u) return 'Desconto';
    if (s > u) return 'Acréscimo';
    return 'Diferença';
  }

  // ===== Lista =====

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  productNameOf(index: number): string {
    return this.items.at(index).get('productName')?.value ?? '';
  }

  quantityOf(index: number): number {
    return Number(this.items.at(index).get('quantity')?.value) || 0;
  }

  soldPriceOf(index: number): number {
    return Number(this.items.at(index).get('soldPrice')?.value) || 0;
  }

  unitPriceOf(index: number): number {
    return Number(this.items.at(index).get('unitPrice')?.value) || 0;
  }

  subtotal(index: number): number {
    return this.quantityOf(index) * this.soldPriceOf(index);
  }

  hasDiscount(index: number): boolean {
    const unit = this.unitPriceOf(index);
    const sold = this.soldPriceOf(index);
    return unit > 0 && Math.abs(unit - sold) > 0.001;
  }

  showError(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  // ===== Submit =====

  async submit(): Promise<void> {
    if (this.items.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Validação', detail: 'Pedido deve conter pelo menos um item.' });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const detail = this.buildValidationMessage();
      this.messageService.add({ severity: 'warn', summary: 'Validação', detail });
      return;
    }

    this.saving.set(true);

    const v = this.form.getRawValue();
    // IDs "custom-*" sao sinteticos (legacy edit) - viram null no payload.
    const itemsPayload = v.items.map((i: any) => ({
      productId: typeof i.productId === 'string' && i.productId.startsWith('custom-') ? null : (i.productId || null),
      productName: i.productName,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      soldPrice: Number(i.soldPrice)
    }));

    // Trata o valor do datetime-local como horario de Brasilia, independente do TZ do browser.
    const orderDateIso = new Date(`${v.orderDate}:00-03:00`).toISOString();

    // Auto-retry loop: em cold start do Render free tier a primeira request
    // pode dar status 0 (CONNECTION_CLOSED). O retry.interceptor chama
    // markDown() que dispara o probe; aqui o proximo waitForReady aguarda o
    // probe responder antes de tentar de novo. Sem este loop, o usuario teria
    // que clicar Salvar duas vezes (primeiro para acordar, segundo para salvar).
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const ready = await this.backend.waitForReady();
      if (!ready) {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Servidor indisponível',
          detail: 'Não foi possível conectar ao servidor. Tente novamente em instantes.'
        });
        return;
      }

      try {
        const obs = this.isEditMode
          ? this.orderService.update(this.id!, { orderDate: orderDateIso, items: itemsPayload } as UpdateOrderPayload)
          : this.orderService.create({ customerId: v.customerId, orderDate: orderDateIso, items: itemsPayload } as CreateOrderPayload);
        await firstValueFrom(obs);
        this.onSaveSuccess(this.isEditMode ? 'Atualizado' : 'Criado');
        return;
      } catch (err: any) {
        // status 0 = cold start em curso. Continua o loop: o markDown ja foi
        // chamado pelo interceptor e o waitForReady do proximo iteration espera
        // o probe confirmar que voltou.
        if (err?.status === 0 && attempt < MAX_ATTEMPTS) continue;
        this.onSaveError(err);
        return;
      }
    }
  }

  private buildValidationMessage(): string {
    if (this.form.controls.customerId.invalid) return 'Selecione o cliente.';
    const items = this.items.controls;
    const missingProduct = items.some(c => c.get('productId')?.invalid);
    if (missingProduct) return 'Selecione um produto em cada linha do pedido.';
    const invalidQty = items.some(c => c.get('quantity')?.invalid);
    if (invalidQty) return 'A quantidade deve ser maior que zero em todos os itens.';
    return 'Corrija os campos destacados em vermelho.';
  }

  private onSaveSuccess(action: string): void {
    this.messageService.add({ severity: 'success', summary: action, detail: 'Pedido salvo com sucesso.' });
    this.router.navigate(['/pedidos']);
  }

  private onSaveError(err: any): void {
    this.saving.set(false);
    // status 0 = conexao caiu. Overlay global ja comunica - sem toast.
    if (err?.status === 0) return;
    const detail = err?.error?.detail ?? 'Erro ao salvar pedido.';
    this.messageService.add({ severity: 'error', summary: 'Erro', detail });
  }

  private buildItemGroup(productId: string, productName: string, quantity: number, unitPrice: number, soldPrice: number): FormGroup {
    return this.fb.nonNullable.group({
      productId: [productId, Validators.required],
      productName: [productName, [Validators.required, Validators.maxLength(200)]],
      quantity: [quantity, [Validators.required, Validators.min(1)]],
      unitPrice: [unitPrice, [Validators.required, Validators.min(0)]],
      soldPrice: [soldPrice, [Validators.required, Validators.min(0)]]
    });
  }

  /** Data/hora atual em Brasília (UTC-3), formato YYYY-MM-DDTHH:MM para datetime-local. */
  private nowLocalISO(): string {
    const brt = new Date(Date.now() - 3 * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${brt.getUTCFullYear()}-${pad(brt.getUTCMonth() + 1)}-${pad(brt.getUTCDate())}T${pad(brt.getUTCHours())}:${pad(brt.getUTCMinutes())}`;
  }

  /** Converte ISO UTC do servidor em string YYYY-MM-DDTHH:MM em horário de Brasília. */
  private utcToBrtInput(utcIso: string): string {
    const utc = new Date(utcIso);
    const brt = new Date(utc.getTime() - 3 * 3600 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${brt.getUTCFullYear()}-${pad(brt.getUTCMonth() + 1)}-${pad(brt.getUTCDate())}T${pad(brt.getUTCHours())}:${pad(brt.getUTCMinutes())}`;
  }
}
