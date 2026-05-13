import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { OrderService } from '../../core/services/order.service';
import { Order } from '../../core/models/order.model';
import { formatCurrency } from '../../core/utils/format';

@Component({
  selector: 'app-pedido-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, TableModule, ButtonModule],
  template: `
    <div class="max-w-5xl mx-auto space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-xl font-semibold text-gray-800">Detalhe do Pedido</h1>
        <div class="flex gap-2">
          <button class="btn-secondary" routerLink="/pedidos">
            <i class="pi pi-arrow-left mr-1 text-xs"></i> Voltar
          </button>
          @if (order(); as o) {
            <button class="btn-primary disabled:opacity-50"
                    [disabled]="!o.canBeModified"
                    (click)="edit(o)"
                    [title]="o.canBeModified ? 'Editar' : 'Pedido bloqueado: passou de 24h da criação'">
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
      @if (!loading() && order(); as o) {
        <div class="bg-white rounded shadow-sm border border-gray-200">
          <div class="p-3 md:p-5 grid grid-cols-12 gap-3 md:gap-4 border-b">
            <div class="col-span-12 md:col-span-6">
              <div class="text-[11px] uppercase text-gray-500 tracking-wider">Cliente</div>
              <div class="text-base font-medium text-gray-800">{{ o.customerName }}</div>
            </div>
            <div class="col-span-6 md:col-span-3">
              <div class="text-[11px] uppercase text-gray-500 tracking-wider">Data</div>
              <div class="text-base text-gray-800">{{ o.orderDate | date:'dd/MM/yyyy HH:mm':'-0300' }}</div>
            </div>
            <div class="col-span-6 md:col-span-3">
              <div class="text-[11px] uppercase text-gray-500 tracking-wider">Status</div>
              @if (o.canBeModified) {
                <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">Editável</span>
              } @else {
                <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-medium">Bloqueado (>24h)</span>
              }
            </div>
          </div>

          <div class="p-3 md:p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-3">Itens ({{ o.items.length }})</h2>

            <!--
              Lista em cards, consistente com a tela de edicao. Cabe bem no mobile
              sem scroll horizontal e mostra a distincao tabela/venda quando ha desconto.
              max-h-[55vh] mantém o total e os botoes sempre visiveis em pedidos longos.
            -->
            <div class="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              @for (i of o.items; track i.id) {
                <div class="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-gray-800 truncate">{{ i.productName }}</div>
                    <div class="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                      <span>{{ i.quantity }} <span class="text-gray-400">×</span> <span class="tabular-nums">{{ formatCurrency(i.soldPrice) }}</span></span>
                      @if (i.unitPrice !== i.soldPrice) {
                        <span class="text-yellow-700 inline-flex items-center gap-1" title="Preço de venda difere do tabela">
                          <i class="pi pi-tag text-[10px]"></i>
                          tabela: <span class="tabular-nums">{{ formatCurrency(i.unitPrice) }}</span>
                        </span>
                      }
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="font-semibold text-gray-900 tabular-nums">{{ formatCurrency(i.subtotal) }}</div>
                  </div>
                </div>
              }
            </div>

            <div class="border-t mt-4 pt-3 flex justify-end">
              <div class="text-right">
                <div class="text-xs text-gray-500">Total do pedido</div>
                <div class="text-2xl font-semibold text-brand-primary">{{ formatCurrency(o.totalValue) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="text-xs text-gray-500 flex flex-wrap gap-3 md:gap-6">
          <span>Criado: {{ o.createdAt | date:'dd/MM/yyyy HH:mm':'-0300' }}</span>
          <span>Atualizado: {{ o.updatedAt | date:'dd/MM/yyyy HH:mm':'-0300' }}</span>
        </div>
      }
    </div>
  `
})
export class PedidoDetailComponent implements OnInit {
  @Input() id?: string;

  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(true);
  readonly order = signal<Order | null>(null);
  readonly formatCurrency = formatCurrency;

  ngOnInit(): void {
    if (!this.id) {
      this.router.navigate(['/pedidos']);
      return;
    }
    this.orderService.getById(this.id).subscribe({
      next: o => {
        this.order.set(o);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Pedido não encontrado.' });
        this.router.navigate(['/pedidos']);
      }
    });
  }

  edit(o: Order): void {
    if (!o.canBeModified) return;
    this.router.navigate(['/pedidos', o.id, 'editar']);
  }
}
