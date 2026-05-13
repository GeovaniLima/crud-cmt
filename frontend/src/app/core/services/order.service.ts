import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order, CreateOrderPayload, UpdateOrderPayload, OrderListResponse } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/orders`;

  list(filters?: { customerId?: string; customerName?: string; from?: string; to?: string; page?: number; pageSize?: number }): Observable<OrderListResponse> {
    let params = new HttpParams()
      .set('page', filters?.page ?? 1)
      .set('pageSize', filters?.pageSize ?? 10);
    if (filters?.customerId) params = params.set('customerId', filters.customerId);
    if (filters?.customerName?.trim()) params = params.set('customerName', filters.customerName.trim());
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    return this.http.get<OrderListResponse>(this.baseUrl, { params });
  }

  getById(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateOrderPayload): Observable<Order> {
    return this.http.post<Order>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateOrderPayload): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/${id}`, payload);
  }
}
