import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/products`;

  list(name?: string): Observable<Product[]> {
    let params = new HttpParams();
    if (name?.trim()) params = params.set('name', name.trim());
    return this.http.get<Product[]>(this.baseUrl, { params });
  }
}
