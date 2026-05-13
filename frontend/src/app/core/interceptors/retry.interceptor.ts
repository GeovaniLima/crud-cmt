import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

// Retenta automaticamente erros de conexao com o backend.
//
// Motivacao: o Render free tier hiberna o servico apos 15min de inatividade.
// O primeiro acesso depois disso acorda o container (cold start), que demora
// ~30-60s. Durante esse intervalo, requests caem com status 0 (ERR_CONNECTION_CLOSED)
// ou 502/503/504. Sem retry, o usuario veria erro logo de cara mesmo abrindo
// a aplicacao corretamente.
//
// Estrategia:
//   - Maximo 4 tentativas (request original + 3 retries)
//   - Backoff exponencial: 2s, 4s, 8s
//   - So retry para erros de "servidor indisponivel"; nunca para 4xx (validacao,
//     auth, conflito) ou outros erros do app, que sao deterministicos
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Bypass para callers que orquestram o proprio retry com feedback de UI
  // (ex.: BackendStatusService durante o probe de cold start).
  if (req.headers.has('X-No-Retry')) {
    return next(req);
  }

  // Importante: so retentamos metodos idempotentes. Retentar POST/PUT/DELETE
  // pode criar duplicatas ou disparar 409s falsos quando a primeira tentativa
  // chegou no servidor mas a resposta perdeu na rede (cenario classico de
  // cold start: cria o recurso, conexao cai antes do 201 chegar, retry recebe
  // 409 mesmo o create tendo sido feito).
  const idempotent = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  if (!idempotent) {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: 3,
      delay: (error: HttpErrorResponse, retryCount) => {
        // AbortError ocorre quando uma request e cancelada pelo proprio cliente
        // (switchMap em busca debounce, navegacao de rota, etc). Nao tem nada
        // a ver com o servidor estar fora - se retentassemos isto, criariamos
        // mais aborts em cascata.
        const isAbort = error.error?.name === 'AbortError'
          || (typeof error.message === 'string' && error.message.toLowerCase().includes('abort'));
        if (isAbort) {
          return throwError(() => error);
        }

        const isConnectionDown = error.status === 0
          || error.status === 502
          || error.status === 503
          || error.status === 504;
        if (isConnectionDown) {
          return timer(retryCount * 2000);
        }
        return throwError(() => error);
      }
    })
  );
};
