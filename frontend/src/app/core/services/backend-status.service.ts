import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

// Acompanha se o backend ja respondeu desde que o app abriu.
//
// Motivacao: o Render free tier hiberna o servico apos 15min sem trafego, e
// acordar o container demora ~30-60s. Em vez de o usuario tomar errors logo
// no boot, esta service faz um polling discreto em /health e expoe o status
// para a UI bloquear interacao enquanto nao for confirmado que esta vivo.
//
// As requests usadas aqui carregam o header X-No-Retry para que o
// retry.interceptor nao retente em paralelo - quem orquestra o retry e este
// service, com mensagens de progresso ao usuario.
@Injectable({ providedIn: 'root' })
export class BackendStatusService {
  private readonly http = inject(HttpClient);

  /** 'starting' | 'ready' | 'failed' */
  readonly status = signal<'starting' | 'ready' | 'failed'>('starting');

  private static readonly MAX_WAIT_MS = 90_000;     // desistencia: 1m30
  private static readonly RETRY_INTERVAL_MS = 3_000; // intervalo entre tentativas

  /** Inicia (ou reinicia, em caso de falha) o probe. Idempotente quando ja pronto. */
  probe(): void {
    if (this.status() === 'ready') return;
    this.status.set('starting');
    this.tryOnce(Date.now());
  }

  private tryOnce(startTime: number): void {
    const headers = new HttpHeaders({ 'X-No-Retry': 'true' });
    this.http.get(`${environment.apiUrl}/health`, { headers, responseType: 'text' as 'json' })
      .subscribe({
        next: () => this.status.set('ready'),
        error: () => {
          if (Date.now() - startTime < BackendStatusService.MAX_WAIT_MS) {
            setTimeout(() => this.tryOnce(startTime), BackendStatusService.RETRY_INTERVAL_MS);
          } else {
            this.status.set('failed');
          }
        }
      });
  }
}
