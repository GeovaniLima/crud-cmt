import { Injectable, signal } from '@angular/core';

// Estado compartilhado da UI - usado para o menu mobile (hamburger).
// Centralizado num service porque tres componentes precisam ler/escrever:
// topbar (toggle), sidebar (close ao clicar em link), main-layout (backdrop).
@Injectable({ providedIn: 'root' })
export class LayoutService {
  readonly mobileMenuOpen = signal(false);

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
