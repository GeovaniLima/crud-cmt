import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <!--
      Mobile/tablet (< md): position fixed, slide-in da esquerda. Comeca abaixo da topbar (top-12).
      Desktop (>= md): static no flow flex, sempre visivel - md:!translate-x-0 forca a posicao
      independente do signal mobileMenuOpen.
    -->
    <aside
      [class.translate-x-0]="layout.mobileMenuOpen()"
      [class.-translate-x-full]="!layout.mobileMenuOpen()"
      class="w-64 bg-brand-sidebar text-gray-200 flex flex-col overflow-y-auto
             fixed top-12 bottom-0 left-0 z-40 transition-transform duration-200
             md:!translate-x-0 md:static md:top-auto md:bottom-auto md:h-full md:shrink-0 md:transition-none">
      <div class="px-4 py-4 border-b border-brand-sidebar-light/60 hidden md:block">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded bg-brand-sidebar-active flex items-center justify-center font-bold text-white text-sm">M</div>
          <div>
            <div class="text-sm font-semibold text-white">Sistema</div>
            <div class="text-[10px] uppercase tracking-wider text-gray-400">(1) Matriz</div>
          </div>
        </div>
      </div>

      <nav class="flex-1 py-3 text-sm">
        <a class="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-brand-sidebar-hover cursor-default opacity-70">
          <i class="pi pi-home text-xs"></i> Início
        </a>

        <div class="mt-3 px-4 py-1 text-[10px] uppercase text-gray-500 tracking-widest font-medium">Cadastros</div>
        <a routerLink="/clientes"
           routerLinkActive="bg-brand-sidebar-active border-l-[3px] border-blue-400 text-white"
           [routerLinkActiveOptions]="{ exact: false }"
           (click)="layout.closeMobileMenu()"
           class="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-brand-sidebar-hover border-l-[3px] border-transparent">
          <i class="pi pi-users text-xs"></i> Clientes
        </a>

        <div class="mt-3 px-4 py-1 text-[10px] uppercase text-gray-500 tracking-widest font-medium">Vendas</div>
        <a routerLink="/pedidos"
           routerLinkActive="bg-brand-sidebar-active border-l-[3px] border-blue-400 text-white"
           [routerLinkActiveOptions]="{ exact: false }"
           (click)="layout.closeMobileMenu()"
           class="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-brand-sidebar-hover border-l-[3px] border-transparent">
          <i class="pi pi-shopping-cart text-xs"></i> Pedidos
        </a>
      </nav>

      <div class="p-4 border-t border-brand-sidebar-light/60 text-[11px] text-gray-500">
        Desafio Técnico · 2026
      </div>
    </aside>
  `
})
export class SidebarComponent {
  readonly layout = inject(LayoutService);
}
