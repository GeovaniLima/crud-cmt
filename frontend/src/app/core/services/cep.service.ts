import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface CepLookupResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CepService {
  private readonly http = inject(HttpClient);

  lookup(cep: string): Observable<CepLookupResult | null> {
    const digits = (cep ?? '').replace(/\D/g, '');
    if (digits.length !== 8) {
      return of(null);
    }

    return this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${digits}/json/`).pipe(
      map(r => {
        if (r.erro) return null;
        return {
          street: r.logradouro ?? '',
          neighborhood: r.bairro ?? '',
          city: r.localidade ?? '',
          state: (r.uf ?? '').toUpperCase(),
          complement: r.complemento ?? ''
        } satisfies CepLookupResult;
      }),
      catchError(() => throwError(() => new Error('Falha ao consultar CEP.')))
    );
  }
}
