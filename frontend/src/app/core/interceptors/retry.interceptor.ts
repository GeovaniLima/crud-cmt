import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, throwError } from 'rxjs';
import { BackendStatusService } from '../services/backend-status.service';

// Trata erros de conexao do backend de duas formas:
//
//   1) Em request CANCELADA pelo cliente (AbortError): apenas repassa o erro
//      sem alarme. Sao normais em buscas debounced e navegacao de rotas.
//
//   2) Em request com status 0 / 502 / 503 / 504 (servidor inalcancavel,
//      tipico do cold start do Render free tier): nao retenta dentro do
//      interceptor. Em vez disso, avisa o BackendStatusService.markDown(),
//      que volta o status para 'starting' - o overlay de "Aguardando servidor"
//      reaparece e a UI fica bloqueada ate o probe confirmar que voltou.
//      Sem isto, cada falha geraria 3 retries em cascata e dezenas de erros
//      no console.
//
//   3) Outras falhas (4xx, 5xx esperados): passam direto. O componente
//      decide o que mostrar (toast com a mensagem do ProblemDetails do back).
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const backend = inject(BackendStatusService);

  // Bypass total para callers que orquestram retry proprio (probe do backend).
  if (req.headers.has('X-No-Retry')) {
    return next(req);
  }

  return next(req).pipe(
    tap({
      error: (error: HttpErrorResponse) => {
        const isAbort = error.error?.name === 'AbortError'
          || (typeof error.message === 'string' && error.message.toLowerCase().includes('abort'));
        if (isAbort) return;

        const isConnectionDown = error.status === 0
          || error.status === 502
          || error.status === 503
          || error.status === 504;
        if (isConnectionDown) {
          backend.markDown();
        }
      }
    })
  );
};
