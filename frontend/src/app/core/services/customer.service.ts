import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Customer, CreateCustomerPayload, CustomerListResponse, TotalSpentResponse } from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/customers`;

  list(name?: string, page = 1, pageSize = 20): Observable<CustomerListResponse> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (name?.trim()) params = params.set('name', name.trim());
    return this.http.get<CustomerListResponse>(this.baseUrl, { params });
  }

  getById(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.baseUrl}/${id}`);
  }

  create(payload: CreateCustomerPayload): Observable<Customer> {
    return this.http.post<Customer>(this.baseUrl, payload);
  }

  update(id: string, payload: CreateCustomerPayload): Observable<Customer> {
    return this.http.put<Customer>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getTotalSpent(id: string): Observable<TotalSpentResponse> {
    return this.http.get<TotalSpentResponse>(`${this.baseUrl}/${id}/total-spent`);
  }
}
