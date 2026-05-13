import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MessageService, ConfirmationService } from 'primeng/api';

import { routes } from './app.routes';
import { retryInterceptor } from './core/interceptors/retry.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // Sem withFetch() de proposito: o FetchBackend usa window.fetch, que em alguns
    // ambientes esta monkey-patched por extensoes do navegador (ex.: anti-tracking)
    // que abortam requests acima de ~1.5s. XHR (default) nao passa pela extensao
    // e nao tem esse problema. Trade-off: perdemos streaming nativo, irrelevante
    // para este app (so JSON pequeno).
    provideHttpClient(withInterceptors([retryInterceptor])),
    provideAnimations(),
    MessageService,
    ConfirmationService
  ]
};
