import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { OrderService } from '../../core/services/order.service';
import { Order } from '../../core/models/order.model';
import { formatCurrency } from '../../core/utils/format';

@Component({
  selector: 'app-pedidos-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, TableModule, ButtonModule, InputTextModule, ProgressSpinnerModule],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-xl font-semibold text-gray-800">Pedidos</h1>
        <button class="btn-primary" routerLink="/pedidos/novo">
          <i class="pi pi-plus mr-1 text-xs"></i> Adicionar
        </button>
      </div>

      <div class="bg-white rounded shadow-sm border border-gray-200">
        <!-- Barra de filtros -->
        <div class="p-3 border-b border-gray-200 grid grid-cols-12 gap-3 items-end">
          <div class="col-span-12 sm:col-span-12 md:col-span-5">
            <label class="form-label">Nome do cliente</label>
            <div class="relative">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              <input pInputText type="text" placeholder="Digite parte do nome..." class="w-full !pl-9"
                     [ngModel]="filters.customerName"
                     (ngModelChange)="onCustomerNameChange($event)" />
            </div>
          </div>
          <div class="col-span-6 md:col-span-2">
            <label class="form-label">De</label>
            <input pInputText type="date" [ngModel]="filters.from" (ngModelChange)="onDateChange('from', $event)" />
          </div>
          <div class="col-span-6 md:col-span-2">
            <label class="form-label">Até</label>
            <input pInputText type="date" [ngModel]="filters.to" (ngModelChange)="onDateChange('to', $event)" />
          </div>
          <div class="col-span-12 md:col-span-3 flex gap-2">
            <button class="btn-primary flex-1 justify-center" (click)="onFilterApply()">
              <i class="pi pi-search mr-1 text-xs"></i> Consultar
            </button>
            <button class="btn-secondary shrink-0" (click)="clearFilters()" title="Limpar filtros">
              <i class="pi pi-times text-xs"></i>
            </button>
          </div>
        </div>

        <!-- Resumo (total filtrado) -->
        <div class="px-3 py-2 border-b border-gray-200 bg-blue-50/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span class="text-gray-600">
            <strong>{{ total() }}</strong> pedido(s) encontrado(s)
            @if (filters.customerName || filters.from || filters.to) {
              com os filtros aplicados
            }
          </span>
          <span class="text-gray-700">
            Total: <strong class="text-brand-primary text-sm">{{ formatCurrency(totalSum()) }}</strong>
          </span>
        </div>

        <div class="overflow-x-auto">
        <p-table
          [value]="orders()"
          [lazy]="true"
          [loading]="loading()"
          [paginator]="true"
          [rows]="pageSize"
          [first]="firstIndex()"
          [totalRecords]="total()"
          [rowsPerPageOptions]="[10, 25, 50]"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="{first} a {last} de {totalRecords}"
          (onLazyLoad)="onLazyLoad($event)">
          <ng-template pTemplate="header">
            <tr>
              <th style="width:160px">Data</th>
              <th>Cliente</th>
              <!-- Itens e Status: ocultos em mobile para priorizar info essencial (data, cliente, valor, ações) -->
              <th class="text-center hidden md:table-cell" style="width:80px">Itens</th>
              <th class="text-right" style="width:140px">Valor Total</th>
              <th class="text-center hidden md:table-cell" style="width:110px">Status</th>
              <th class="text-right" style="width:120px">Ações</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-o>
            <tr>
              <td class="tabular-nums">{{ o.orderDate | date:'dd/MM/yyyy HH:mm':'-0300' }}</td>
              <td class="font-medium text-gray-800">{{ o.customerName }}</td>
              <td class="text-center hidden md:table-cell">{{ o.itemCount }}</td>
              <td class="text-right font-medium tabular-nums">{{ formatCurrency(o.totalValue) }}</td>
              <td class="text-center hidden md:table-cell">
                @if (o.canBeModified) {
                  <span class="inline-block px-2 py-0.5 rounded-full text-[11px] bg-green-100 text-green-700 font-medium">Editável</span>
                } @else {
                  <span class="inline-block px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600 font-medium">Bloqueado</span>
                }
              </td>
              <td class="text-right">
                <button class="text-gray-600 hover:text-gray-900 mr-3" (click)="view(o)" title="Ver detalhe">
                  <i class="pi pi-eye"></i>
                </button>
                <button class="text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                        (click)="edit(o)" [disabled]="!o.canBeModified"
                        [title]="o.canBeModified ? 'Editar' : 'Bloqueado: passou de 24h'">
                  <i class="pi pi-pencil"></i>
                </button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="6" class="p-12 text-center text-gray-500">
                <i class="pi pi-shopping-cart text-3xl mb-2 block"></i>
                Nenhum pedido encontrado.
              </td>
            </tr>
          </ng-template>
        </p-table>
        </div>
      </div>
    </div>
  `
})
export class PedidosListComponent implements OnInit {
  private readonly service = inject(OrderService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly orders = signal<Order[]>([]);
  readonly total = signal(0);
  readonly totalSum = signal(0);
  readonly firstIndex = signal(0);

  pageSize = 10;

  filters: { customerName: string; from: string; to: string } = {
    customerName: '',
    from: '',
    to: ''
  };

  readonly formatCurrency = formatCurrency;
  private readonly filterTrigger$ = new Subject<void>();

  ngOnInit(): void {
    this.filterTrigger$
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.firstIndex.set(0);
        this.loadData();
      });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.firstIndex.set(event.first ?? 0);
    this.pageSize = event.rows ?? 10;
    this.loadData();
  }

  onFilterApply(): void {
    this.filterTrigger$.next();
  }

  onCustomerNameChange(value: string): void {
    this.filters.customerName = value;
    this.filterTrigger$.next();
  }

  onDateChange(field: 'from' | 'to', value: string): void {
    this.filters[field] = value;
    this.filterTrigger$.next();
  }

  clearFilters(): void {
    this.filters = { customerName: '', from: '', to: '' };
    this.onFilterApply();
  }

  view(o: Order): void {
    this.router.navigate(['/pedidos', o.id]);
  }

  edit(o: Order): void {
    if (!o.canBeModified) return;
    this.router.navigate(['/pedidos', o.id, 'editar']);
  }

  private loadData(): void {
    const page = Math.floor(this.firstIndex() / this.pageSize) + 1;
    this.loading.set(true);
    this.service
      .list({
        customerName: this.filters.customerName,
        from: this.filters.from || undefined,
        to: this.filters.to || undefined,
        page,
        pageSize: this.pageSize
      })
      .subscribe({
        next: r => {
          this.orders.set(r.items);
          this.total.set(r.total);
          this.totalSum.set(r.totalSum);
          this.loading.set(false);
        },
        error: e => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Erro',
            detail: e?.error?.detail ?? 'Não foi possível carregar pedidos.'
          });
        }
      });
  }
}
