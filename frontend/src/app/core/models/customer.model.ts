export interface Address {
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  birthDate: string;     // ISO date (yyyy-MM-dd)
  age: number;
  cpf: string;
  cpfFormatted: string;
  address: Address;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  name: string;
  email: string;
  birthDate: string;
  cpf: string;
  address: Address;
}

export interface CustomerListResponse {
  page: number;
  pageSize: number;
  total: number;
  items: Customer[];
}

export interface TotalSpentResponse {
  customerId: string;
  totalSpent: number;
}
