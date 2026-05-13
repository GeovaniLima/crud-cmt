import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { LayoutService } from '../../core/services/layout.service';

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
  `
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly layout = inject(LayoutService);

  readonly breadcrumb = signal<string[]>([]);

  constructor() {
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
