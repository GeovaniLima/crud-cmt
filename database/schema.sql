-- =====================================================================
-- Desafio Tecnico — Script de criação do banco de dados
-- Banco: PostgreSQL 15+
-- Aplicação: API .NET 8 (DesafioMt) + Frontend Angular
-- =====================================================================
-- Execução: rode este script em um banco PostgreSQL vazio para criar
-- todas as tabelas, constraints, índices e triggers necessários.
-- =====================================================================

-- Extensão para geração de UUIDs (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Tabela: customers
-- ============================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    address_street VARCHAR(200) NOT NULL,
    address_number VARCHAR(20) NOT NULL,
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100) NOT NULL,
    address_city VARCHAR(100) NOT NULL,
    address_state CHAR(2) NOT NULL,
    address_zip_code VARCHAR(9) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT customers_cpf_unique UNIQUE (cpf),
    CONSTRAINT customers_email_unique UNIQUE (email),
    CONSTRAINT customers_cpf_format CHECK (cpf ~ '^[0-9]{11}$'),
    CONSTRAINT customers_state_format CHECK (address_state ~ '^[A-Z]{2}$')
);

CREATE INDEX idx_customers_name_lower ON customers (LOWER(name));
CREATE INDEX idx_customers_email ON customers (email);

COMMENT ON TABLE customers IS 'Cadastro de clientes com dados pessoais e endereço';
COMMENT ON COLUMN customers.cpf IS 'CPF em formato numérico (11 dígitos, sem máscara). Validação de checksum feita na aplicação.';

-- ============================================================
-- Tabela: produtos
-- ============================================================
CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    CONSTRAINT produtos_unit_price_nonneg CHECK (unit_price >= 0)
);

CREATE INDEX idx_produtos_name_lower ON produtos (LOWER(name));

COMMENT ON TABLE produtos IS 'Catálogo de produtos genéricos (nome e valor unitário)';

-- ============================================================
-- Tabela: orders
-- ============================================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT orders_customer_fk FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE RESTRICT,
    CONSTRAINT orders_total_value_nonneg CHECK (total_value >= 0)
);

CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_order_date ON orders (order_date DESC);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);

COMMENT ON TABLE orders IS 'Pedidos vinculados a clientes';
COMMENT ON COLUMN orders.total_value IS 'Valor total calculado pela aplicação (soma dos subtotais dos itens). Nunca aceito do cliente.';

-- ============================================================
-- Tabela: order_items
-- ============================================================
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    product_id UUID NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    sold_price DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    CONSTRAINT order_items_product_fk FOREIGN KEY (product_id) REFERENCES produtos (id) ON DELETE RESTRICT,
    CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT order_items_unit_price_nonneg CHECK (unit_price >= 0),
    CONSTRAINT order_items_sold_price_nonneg CHECK (sold_price >= 0),
    CONSTRAINT order_items_subtotal_match CHECK (subtotal = quantity * sold_price)
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);

COMMENT ON TABLE order_items IS 'Itens de cada pedido. Subtotal = quantity * sold_price.';
COMMENT ON COLUMN order_items.product_id IS 'FK opcional para produtos.id. NULL = item sem referência ao catálogo (histórico ou produto removido).';
COMMENT ON COLUMN order_items.product_name IS 'Snapshot do nome do produto no momento da venda — preserva histórico mesmo se o produto for renomeado.';
COMMENT ON COLUMN order_items.unit_price IS 'Preço unitário de tabela (catálogo) no momento da venda. Snapshot do produtos.unit_price.';
COMMENT ON COLUMN order_items.sold_price IS 'Preço efetivamente cobrado pelo item (pode diferir do unit_price em caso de desconto/acréscimo).';

-- ============================================================
-- Trigger genérico para manter updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_set_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER orders_set_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Fixa search_path da função para evitar search_path injection
ALTER FUNCTION trigger_set_updated_at()
    SET search_path = pg_catalog, public;

-- ============================================================
-- Segurança: RLS habilitado sem políticas
-- ============================================================
-- O backend C# acessa via conexão Postgres direta (Npgsql) usando o role
-- 'postgres', que bypassa RLS. Habilitar RLS sem políticas bloqueia acesso
-- via PostgREST (chave anon) — defesa em profundidade caso a chave vaze.
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
