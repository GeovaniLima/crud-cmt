import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="h-12 bg-movtech-sidebar-dark text-white flex items-center shadow-sm">
      <!-- Brand alinhado a coluna do sidebar - somente desktop -->
      <div class="hidden md:flex w-64 h-full bg-movtech-sidebar items-center px-4 gap-2 border-r border-movtech-sidebar-light/40 shrink-0">
        <i class="pi pi-th-large text-blue-300 text-sm"></i>
        <span class="font-semibold text-sm tracking-wide">Movtech</span>
      </div>

      <!-- Hamburger - somente mobile/tablet -->
      <button class="md:hidden h-full px-4 hover:bg-white/10 flex items-center justify-center"
              (click)="layout.toggleMobileMenu()"
              [attr.aria-label]="layout.mobileMenuOpen() ? 'Fechar menu' : 'Abrir menu'">
        <i class="pi" [class.pi-times]="layout.mobileMenuOpen()" [class.pi-bars]="!layout.mobileMenuOpen()"></i>
      </button>

      <!-- Brand condensado mobile/tablet -->
      <div class="md:hidden flex items-center gap-2 px-2">
        <i class="pi pi-th-large text-blue-300 text-sm"></i>
        <span class="font-semibold text-sm tracking-wide">Movtech</span>
      </div>

      <div class="flex-1"></div>

      <div class="flex items-center gap-3 md:gap-4 text-sm pr-3 md:pr-6">
        <span class="px-2 py-1 rounded border border-gray-600 text-xs hidden sm:inline-flex items-center">PT-BR</span>
        <i class="pi pi-window-maximize text-gray-300 cursor-pointer hidden md:inline" title="Tela cheia"></i>
      </div>
    </header>
  `
})
export class TopbarComponent {
  readonly layout = inject(LayoutService);
}
