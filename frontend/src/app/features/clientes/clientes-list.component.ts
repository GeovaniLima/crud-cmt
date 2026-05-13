import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CustomerService } from '../../core/services/customer.service';
import { Customer } from '../../core/models/customer.model';
import { formatCpf } from '../../core/utils/format';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TableModule, ButtonModule, InputTextModule, ProgressSpinnerModule],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-xl font-semibold text-gray-800">Clientes</h1>
        <button class="btn-primary" routerLink="/clientes/novo">
          <i class="pi pi-plus mr-1 text-xs"></i> Adicionar
        </button>
      </div>

      <div class="bg-white rounded shadow-sm border border-gray-200">
        <div class="p-3 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div class="relative flex-1 min-w-[180px] max-w-md">
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
            <input pInputText type="text" placeholder="Buscar por nome..." class="w-full !pl-9"
                   [ngModel]="searchText()" (ngModelChange)="onSearch($event)" />
          </div>
          <span class="text-xs text-gray-500 ml-auto whitespace-nowrap">{{ total() }} registro(s)</span>
        </div>

        <!-- overflow-x-auto: em mobile/tablet a tabela rola horizontalmente em vez de quebrar layout -->
        <div class="overflow-x-auto">
        <p-table
          [value]="customers()"
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
              <th>Nome</th>
              <th>CPF</th>
              <!-- E-mail, Idade e Cidade/UF: ocultos em mobile - prioriza Nome/CPF/Acoes -->
              <th class="hidden md:table-cell">E-mail</th>
              <th class="text-center hidden md:table-cell">Idade</th>
              <th class="hidden md:table-cell">Cidade/UF</th>
              <th class="text-right" style="width:140px">Ações</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-c>
            <tr>
              <td class="font-medium text-gray-800">{{ c.name }}</td>
              <td>{{ formatCpf(c.cpf) }}</td>
              <td class="hidden md:table-cell">{{ c.email }}</td>
              <td class="text-center hidden md:table-cell">{{ c.age }}</td>
              <td class="hidden md:table-cell">{{ c.address.city }}/{{ c.address.state }}</td>
              <td class="text-right">
                <button class="text-gray-600 hover:text-gray-900 mr-3" (click)="view(c)" title="Ver detalhe">
                  <i class="pi pi-eye"></i>
                </button>
                <button class="text-blue-600 hover:text-blue-800 mr-3" (click)="edit(c)" title="Editar">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="text-red-600 hover:text-red-800" (click)="confirmDelete(c)" title="Excluir">
                  <i class="pi pi-trash"></i>
                </button>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="p-12 text-center text-gray-500">
                <i class="pi pi-users text-3xl mb-2 block"></i>
                Nenhum cliente encontrado.
              </td>
            </tr>
          </ng-template>
        </p-table>
        </div>
      </div>
    </div>
  `
})
export class ClientesListComponent implements OnInit {
  private readonly service = inject(CustomerService);
  private readonly messageService = inject(MessageService);
  private readonly confirmService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly total = signal(0);
  readonly searchText = signal('');
  readonly firstIndex = signal(0);

  pageSize = 10;

  private readonly searchTrigger$ = new Subject<void>();
  readonly formatCpf = formatCpf;

  ngOnInit(): void {
    this.searchTrigger$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
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

  onSearch(text: string): void {
    this.searchText.set(text);
    this.searchTrigger$.next();
  }

  view(c: Customer): void {
    this.router.navigate(['/clientes', c.id]);
  }

  edit(c: Customer): void {
    this.router.navigate(['/clientes', c.id, 'editar']);
  }

  confirmDelete(c: Customer): void {
    this.confirmService.confirm({
      message: `Confirma a exclusão do cliente "${c.name}"?`,
      header: 'Excluir cliente',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.delete(c.id)
    });
  }

  private delete(id: string): void {
    this.service.delete(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Excluído', detail: 'Cliente removido.' });
        this.loadData();
      },
      error: e => this.toastError(e)
    });
  }

  private loadData(): void {
    const page = Math.floor(this.firstIndex() / this.pageSize) + 1;
    this.loading.set(true);
    this.service.list(this.searchText(), page, this.pageSize).subscribe({
      next: r => {
        this.customers.set(r.items);
        this.total.set(r.total);
        this.loading.set(false);
      },
      error: e => {
        this.toastError(e);
        this.loading.set(false);
      }
    });
  }

  private toastError(err: any): void {
    const detail = err?.error?.detail ?? err?.message ?? 'Erro inesperado.';
    this.messageService.add({ severity: 'error', summary: 'Erro', detail });
  }
}
