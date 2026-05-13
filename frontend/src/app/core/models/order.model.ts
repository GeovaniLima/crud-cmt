export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  /** Preço de tabela (catálogo) no momento da venda. */
  unitPrice: number;
  /** Preço efetivamente cobrado por unidade. */
  soldPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName?: string;
  orderDate: string;
  totalValue: number;
  items: OrderItem[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  canBeModified: boolean;
}

export interface CreateOrderItemPayload {
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  soldPrice: number;
}

export interface CreateOrderPayload {
  customerId: string;
  orderDate: string;
  items: CreateOrderItemPayload[];
}

export interface UpdateOrderPayload {
  orderDate: string;
  items: CreateOrderItemPayload[];
}

export interface OrderListResponse {
  page: number;
  pageSize: number;
  total: number;
  totalSum: number;
  items: Order[];
}
