import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { LayoutService } from '../../core/services/layout.service';
import { BackendStatusService } from '../../core/services/backend-status.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ToastModule, ConfirmDialogModule],
  template: `
    <div class="flex flex-col h-screen bg-gray-50">
      <app-topbar />
      <div class="flex flex-1 overflow-hidden relative">
        <app-sidebar />

        <!--
          Backdrop do menu mobile. Aparece atras do sidebar (z-30) cobrindo o conteudo.
          Click fecha o menu. Em desktop nao existe (md:hidden).
        -->
        @if (layout.mobileMenuOpen()) {
          <div class="md:hidden fixed inset-0 top-12 bg-black/50 z-30"
               (click)="layout.closeMobileMenu()"
               aria-hidden="true"></div>
        }

        <main class="flex-1 overflow-y-auto min-w-0">
          <div class="bg-white border-b border-gray-200 px-4 md:px-6 py-3 sticky top-0 z-10">
            <div class="text-sm flex items-center gap-2 overflow-x-auto whitespace-nowrap">
              @for (crumb of breadcrumb(); let i = $index, last = $last; track crumb) {
                <span [class]="last ? 'text-gray-900 font-medium' : 'text-gray-500'">{{ crumb }}</span>
                @if (!last) { <span class="text-gray-400">/</span> }
              }
            </div>
          </div>
          <div class="p-3 md:p-6">
            <router-outlet />
          </div>
        </main>
      </div>
    </div>
    <p-toast position="top-right"></p-toast>
    <p-confirmDialog acceptLabel="Confirmar" rejectLabel="Cancelar"
                     acceptButtonStyleClass="p-button-danger p-button-sm"
                     rejectButtonStyleClass="p-button-text p-button-sm">
    </p-confirmDialog>

    <!--
      Overlay de cold start. Bloqueia interacao enquanto o backend nao responde.
      z-[100] fica acima de tudo (incluindo toast/confirmDialog). Como o overlay
      cobre toda a viewport com inset-0, cliques ficam contidos no painel central -
      o resto da UI fica naturalmente inacessivel.
    -->
    @if (backend.status() === 'starting') {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl p-6 md:p-8 max-w-md text-center">
          <i class="pi pi-spin pi-spinner text-4xl text-brand-primary mb-4 block"></i>
          <h2 class="text-lg font-semibold text-gray-800 mb-2">Iniciando o servidor</h2>
          <p class="text-sm text-gray-600">
            O backend está em plano gratuito e hiberna após 15 minutos sem uso.
            Pode levar até <strong>1 minuto</strong> para ficar disponível na primeira abertura.
            A aplicação será liberada automaticamente assim que estiver pronta.
          </p>
        </div>
      </div>
    }
    @if (backend.status() === 'failed') {
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-xl p-6 md:p-8 max-w-md text-center">
          <i class="pi pi-exclamation-triangle text-4xl text-red-600 mb-4 block"></i>
          <h2 class="text-lg font-semibold text-gray-800 mb-2">Servidor indisponível</h2>
          <p class="text-sm text-gray-600 mb-4">
            Não foi possível conectar ao backend após várias tentativas. Verifique sua conexão e tente novamente.
          </p>
          <button class="btn-primary" (click)="backend.probe()">
            <i class="pi pi-refresh mr-2 text-xs"></i> Tentar novamente
          </button>
        </div>
      </div>
    }
  `
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly layout = inject(LayoutService);
  readonly backend = inject(BackendStatusService);

  readonly breadcrumb = signal<string[]>([]);

  constructor() {
    // Dispara o probe assim que o layout monta - antes do usuario interagir.
    this.backend.probe();

    this.updateBreadcrumb();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.updateBreadcrumb();
        // Fecha o menu mobile apos navegacao (selecionou um item ou seguiu link interno).
        this.layout.closeMobileMenu();
      });
  }

  private updateBreadcrumb(): void {
    let route = this.route.snapshot;
    while (route.firstChild) route = route.firstChild;
    this.breadcrumb.set((route.data['breadcrumb'] as string[]) ?? []);
  }
}
