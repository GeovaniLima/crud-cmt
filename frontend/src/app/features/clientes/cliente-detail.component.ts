import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { CustomerService } from '../../core/services/customer.service';
import { OrderService } from '../../core/services/order.service';
import { Customer } from '../../core/models/customer.model';
import { Order } from '../../core/models/order.model';
import { formatCpf, formatCurrency } from '../../core/utils/format';

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, TableModule, ButtonModule],
  template: `
    <div class="max-w-5xl mx-auto space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-xl font-semibold text-gray-800">Detalhe do Cliente</h1>
        <div class="flex gap-2">
          <button class="btn-secondary" routerLink="/clientes">
            <i class="pi pi-arrow-left mr-1 text-xs"></i> Voltar
          </button>
          @if (customer(); as c) {
            <button class="btn-movtech" (click)="edit(c)">
              <i class="pi pi-pencil mr-1 text-xs"></i> Editar
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="bg-white rounded shadow-sm border p-12 text-center text-gray-500">
          <i class="pi pi-spin pi-spinner text-2xl"></i>
        </div>
      }
      @if (!loading() && customer(); as c) {
        <!-- Dados pessoais + Endereço -->
        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-12 md:col-span-7">
            <div class="bg-white rounded shadow-sm border border-gray-200 p-5 space-y-3">
              <h2 class="text-sm font-semibold text-gray-700 border-b pb-2">Dados pessoais</h2>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="col-span-2">
                  <div class="text-[11px] uppercase text-gray-500 tracking-wider">Nome</div>
                  <div class="text-base font-medium text-gray-800">{{ c.name }}</div>
                </div>
                <div>
                  <div class="text-[11px] uppercase text-gray-500 tracking-wider">CPF</div>
                  <div class="text-gray-800 tabular-nums">{{ formatCpf(c.cpf) }}</div>
                </div>
                <div>
                  <div class="text-[11px] uppercase text-gray-500 tracking-wider">Idade</div>
                  <div class="text-gray-800">{{ c.age }} anos</div>
                </div>
                <div class="col-span-2">
                  <div class="text-[11px] uppercase text-gray-500 tracking-wider">E-mail</div>
                  <div class="text-gray-800">{{ c.email }}</div>
                </div>
                <div>
                  <div class="text-[11px] uppercase text-gray-500 tracking-wider">Nascimento</div>
                  <div class="text-gray-800">{{ c.birthDate | date:'dd/MM/yyyy':'-0300' }}</div>
                </div>
                <div>
                  <div class="text-[11px] uppercase text-gray-500 tracking-wider">Cadastrado em</div>
                  <div class="text-gray-800">{{ c.createdAt | date:'dd/MM/yyyy HH:mm':'-0300' }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-span-12 md:col-span-5 space-y-4">
            <div class="bg-white rounded shadow-sm border border-gray-200 p-5">
              <h2 class="text-sm font-semibold text-gray-700 border-b pb-2 mb-3">Endereço</h2>
              <div class="text-sm text-gray-800">
                {{ c.address.street }}, {{ c.address.number }}
                @if (c.address.complement) { — {{ c.address.complement }} }
              </div>
              <div class="text-sm text-gray-700">{{ c.address.neighborhood }}</div>
              <div class="text-sm text-gray-700">{{ c.address.city }}/{{ c.address.state }} — CEP {{ c.address.zipCode }}</div>
            </div>

            <div class="bg-gradient-to-br from-movtech-primary to-movtech-primary-light rounded shadow-sm p-5 text-white">
              <div class="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">
                <i class="pi pi-wallet"></i> Total gasto em pedidos
              </div>
              <div class="text-3xl font-semibold mt-1 tabular-nums">{{ formatCurrency(totalSpent()) }}</div>
              <div class="text-xs opacity-80 mt-1">{{ orders().length }} pedido(s) no histórico</div>
            </div>
          </div>
        </div>

        <!-- Pedidos do cliente -->
        <div class="bg-white rounded shadow-sm border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-gray-700">Pedidos deste cliente</h2>
            @if (orders().length > 0) {
              <button class="btn-secondary text-xs" (click)="goToOrdersList(c.name)">
                <i class="pi pi-external-link mr-1 text-xs"></i> Ver na listagem completa
              </button>
            }
          </div>
          @if (orders().length === 0) {
            <div class="p-8 text-center text-gray-500 text-sm">
              <i class="pi pi-shopping-cart text-2xl block mb-2"></i>
              Este cliente ainda não realizou nenhum pedido.
            </div>
          } @else {
            <div class="overflow-x-auto">
            <p-table [value]="orders()">
              <ng-template pTemplate="header">
                <tr>
                  <th style="width:160px">Data</th>
                  <th class="text-center" style="width:80px">Itens</th>
                  <th class="text-right" style="width:140px">Valor Total</th>
                  <th class="text-center" style="width:110px">Status</th>
                  <th class="text-right" style="width:90px">Ações</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-o>
                <tr>
                  <td class="tabular-nums">{{ o.orderDate | date:'dd/MM/yyyy HH:mm':'-0300' }}</td>
                  <td class="text-center">{{ o.itemCount }}</td>
                  <td class="text-right font-medium tabular-nums">{{ formatCurrency(o.totalValue) }}</td>
                  <td class="text-center">
                    @if (o.canBeModified) {
                      <span class="inline-block px-2 py-0.5 rounded-full text-[11px] bg-green-100 text-green-700 font-medium">Editável</span>
                    } @else {
                      <span class="inline-block px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600 font-medium">Bloqueado</span>
                    }
                  </td>
                  <td class="text-right">
                    <button class="text-gray-600 hover:text-gray-900" (click)="viewOrder(o)" title="Ver detalhe do pedido">
                      <i class="pi pi-eye"></i>
                    </button>
                  </td>
                </tr>
              </ng-template>
            </p-table>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class ClienteDetailComponent implements OnInit {
  @Input() id?: string;

  private readonly customerService = inject(CustomerService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(true);
  readonly customer = signal<Customer | null>(null);
  readonly orders = signal<Order[]>([]);
  readonly totalSpent = signal(0);
  readonly formatCpf = formatCpf;
  readonly formatCurrency = formatCurrency;

  ngOnInit(): void {
    if (!this.id) {
      this.router.navigate(['/clientes']);
      return;
    }

    forkJoin({
      customer: this.customerService.getById(this.id),
      total: this.customerService.getTotalSpent(this.id),
      orders: this.orderService.list({ customerId: this.id, pageSize: 50 })
    }).subscribe({
      next: r => {
        this.customer.set(r.customer);
        this.totalSpent.set(r.total.totalSpent);
        this.orders.set(r.orders.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Cliente não encontrado.' });
        this.router.navigate(['/clientes']);
      }
    });
  }

  edit(c: Customer): void {
    this.router.navigate(['/clientes', c.id, 'editar']);
  }

  viewOrder(o: Order): void {
    this.router.navigate(['/pedidos', o.id]);
  }

  goToOrdersList(customerName: string): void {
    this.router.navigate(['/pedidos'], { queryParams: { customerName } });
  }
}
