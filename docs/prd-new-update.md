# Adobe Editor Dashboard - Product Requirements Document

## Project Overview

**Project Name:** Adobe Editor Client & Invoice Management Dashboard  
**Version:** 1.0  
**Date:** September 2, 2025  
**Document Status:** Draft  

### Executive Summary
A comprehensive web-based dashboard application designed specifically for Adobe editors to manage their client relationships, digital product catalog, and invoice generation workflow. The application streamlines the entire process from client onboarding to payment tracking.

### Target User
Freelance Adobe editors and small creative agencies who need to manage multiple clients, track digital products/services, and generate professional invoices efficiently.

## Core Features & User Stories

### 1. Client Management System

#### User Story
As an Adobe editor, I need to manage detailed client information so that I can maintain professional relationships and generate accurate invoices.

#### Functional Requirements
- **Client Creation & Storage**
  - Full name (first name, last name)
  - Email address (with validation)
  - Dutch KVK (Chamber of Commerce) number
  - Phone number
  - Company name
  - Billing address (street, city, postal code, country)
  - VAT number (if applicable)
  - Client notes/description
  - Preferred communication method
  - Client status (Active/Inactive/Archived)

- **CRUD Operations**
  - Create new clients with form validation
  - View all clients in a sortable, searchable table
  - Edit existing client information
  - Delete clients (with confirmation dialog)
  - Bulk actions (delete multiple, export)

- **Metadata Tracking**
  - Created date (auto-generated)
  - Last edited date (auto-updated)
  - Created by (user tracking)

- **Search & Filter**
  - Search by name, email, company, or KVK
  - Filter by status, creation date range
  - Sort by name, creation date, last edited

### 2. Digital Product Catalog

#### User Story
As an Adobe editor, I need to catalog my digital services and products so that I can quickly add them to invoices with consistent pricing.

#### Functional Requirements
- **Product Information**
  - Product name
  - Detailed description
  - Base price (in EUR)
  - Service category (Video Editing, Photo Editing, Graphic Design, etc.)
  - Estimated delivery time
  - File formats included
  - Revision rounds included
  - Product status (Active/Inactive/Discontinued)

- **CRUD Operations**
  - Create new products with rich text descriptions
  - View all products in grid/list view
  - Edit product details and pricing
  - Delete products (with usage verification)
  - Duplicate products for variations

- **Metadata Tracking**
  - Created date (auto-generated)
  - Last edited date (auto-updated)
  - Usage count (how many times used in invoices)

- **Search & Filter**
  - Search by product name or description
  - Filter by category, price range, status
  - Sort by price, popularity, creation date

### 3. Invoice Management System

#### User Story
As an Adobe editor, I need to view and manage all my invoices in one place so that I can track payments and maintain financial records.

#### Functional Requirements
- **Invoice Overview Display**
  - Invoice date
  - Unique identifier (kenmerk) - auto-generated
  - Client name and company
  - Product(s) included
  - Total amount (including VAT)
  - Payment status (Pending, Paid, Overdue, Cancelled)
  - Due date
  - Payment method

- **List Management**
  - Paginated table view with sorting
  - Search by client name, invoice number, or description
  - Filter by status, date range, amount range
  - Export functionality (CSV, Excel)

- **Invoice Actions**
  - View invoice details
  - Edit draft invoices
  - Delete invoices (with restrictions)
  - Mark as paid/unpaid
  - Send payment reminders

### 4. Invoice Creation Workflow

#### User Story
As an Adobe editor, I need an intuitive invoice creation process that allows me to select clients and products easily while providing a real-time preview of the invoice.

#### Functional Requirements

##### Left Panel - Selection Interface
- **Client Selection**
  - Searchable dropdown with client list
  - Display: Client name, company, email
  - Recent clients quick-access
  - Option to create new client inline

- **Product Selection**
  - Multi-select dropdown for products
  - Display: Product name, description, base price
  - Quantity selector for each product
  - Custom line items option
  - Discount application (percentage or fixed amount)

- **Invoice Settings**
  - Invoice date (default: today)
  - Due date (configurable default: 30 days)
  - Payment terms
  - Invoice notes/description
  - VAT rate selection (21% NL standard, 9% reduced, 0% exempt)

##### Right Panel - Invoice Preview
- **Header Section**
  - Editor's business information
  - Invoice number (auto-generated)
  - Invoice date and due date
  - Client billing information

- **Line Items Table**
  - Product description
  - Quantity
  - Unit price
  - Line total
  - VAT rate per line

- **Summary Section**
  - Subtotal
  - VAT amount (calculated)
  - Total amount
  - Payment instructions

- **Action Buttons**
  - Save as draft
  - Generate PDF preview
  - Send invoice (email integration)
  - Print invoice

## Technical Specifications

### Technology Stack
- **Frontend:** React.js with TypeScript
- **Styling:** Tailwind CSS (following SON design system)
- **State Management:** React Context/Redux Toolkit
- **Database:** Supabase (PostgreSQL with real-time features)
- **Database Connection:** MCP Server for Supabase integration
- **Authentication:** Supabase Auth
- **Backend:** Supabase Edge Functions
- **PDF Generation:** jsPDF or Puppeteer
- **Email Service:** Supabase Email or Nodemailer integration

### Supabase Database Schema

#### MCP Server Configuration
The application will use MCP (Model Context Protocol) Server to connect to Supabase, providing:
- Real-time data synchronization
- Row Level Security (RLS) policies
- Built-in authentication integration
- Edge Functions for server-side logic

#### Clients Table
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company_name VARCHAR(255),
    kvk_number VARCHAR(20),
    vat_number VARCHAR(50),
    street_address VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Netherlands',
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own clients
CREATE POLICY "Users can only access their own clients" ON clients
    FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE
    ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Products Table
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    category VARCHAR(100),
    delivery_time VARCHAR(100),
    file_formats VARCHAR(255),
    revision_rounds INTEGER DEFAULT 2 CHECK (revision_rounds >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own products
CREATE POLICY "Users can only access their own products" ON products
    FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_products_updated_at BEFORE UPDATE
    ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Invoices Table
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    vat_amount DECIMAL(10,2) NOT NULL CHECK (vat_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'pending', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    payment_terms VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure invoice number is unique per user
    UNIQUE(user_id, invoice_number)
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own invoices
CREATE POLICY "Users can only access their own invoices" ON invoices
    FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE
    ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Invoice Items Table
```sql
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    description VARCHAR(500) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    vat_rate DECIMAL(5,2) NOT NULL DEFAULT 21.00 CHECK (vat_rate >= 0 AND vat_rate <= 100),
    line_total DECIMAL(10,2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see invoice items from their own invoices
CREATE POLICY "Users can only access their own invoice items" ON invoice_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.user_id = auth.uid()
        )
    );
```

#### Database Functions and Views
```sql
-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(user_uuid UUID)
RETURNS TEXT AS $
DECLARE
    year_suffix TEXT;
    counter INTEGER;
    invoice_number TEXT;
BEGIN
    year_suffix := TO_CHAR(NOW(), 'YY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)-' || year_suffix) AS INTEGER)), 0) + 1
    INTO counter
    FROM invoices 
    WHERE user_id = user_uuid 
    AND invoice_number ~ ('^INV-\d+-' || year_suffix || '

## UI/UX Requirements

### Design System
- Follow the SON design system (purple primary, teal accents)
- Consistent spacing and typography
- Responsive design for desktop and tablet
- Dark/light theme support

### Navigation Structure
```
Dashboard
├── Klanten (Clients)
│   ├── Alle Klanten (All Clients)
│   └── Klant Toevoegen (Add Client)
├── Producten (Products)
│   ├── Alle Producten (All Products)
│   └── Product Toevoegen (Add Product)
└── Betalingen (Payments)
    ├── Alle Facturen (All Invoices)
    └── Factuur Maken (Create Invoice)
```

### Form Validation Rules
- **Email:** Valid email format, uniqueness check
- **KVK Number:** 8-digit Dutch format validation
- **Phone:** International format support
- **VAT Number:** EU VAT format validation
- **Prices:** Minimum 0.01, maximum 99999.99
- **Required fields:** Clear indication with asterisks

### Error Handling
- Form validation errors with clear messages
- Network error handling with retry options
- Data loss prevention (auto-save drafts)
- Loading states for async operations

## Data Flow & User Journeys

### Client Management Flow
1. User navigates to "Klanten" page
2. Views existing clients in table format
3. Can search, filter, or sort clients
4. Clicks "Klant Toevoegen" to create new client
5. Fills out comprehensive client form
6. System validates and saves client data
7. Returns to client list with success message

### Invoice Creation Flow
1. User navigates to "Factuur Maken" page
2. Left panel: Selects client from dropdown
3. Left panel: Adds products with quantities
4. Right panel: Real-time preview updates
5. User reviews invoice details
6. Can save as draft or generate final invoice
7. Options to print, email, or download PDF

### Product Management Flow
1. User navigates to "Producten" page
2. Views product catalog in grid/list view
3. Can create, edit, or delete products
4. Tracks usage statistics per product
5. Categories help organize services

## Security & Privacy Requirements

### Authentication & Security
- **Authentication:** Supabase Auth with email/password
- **Authorization:** Row Level Security (RLS) policies
- **Data Isolation:** User-specific data access via auth.uid()
- **Session Management:** Supabase handles JWT tokens automatically
- **Input Validation:** Client-side and database-level constraints
- **SQL Injection Prevention:** Parameterized queries via Supabase SDK

### Data Backup & Recovery
- **Supabase Backups:** Automated daily backups via Supabase
- **Point-in-time Recovery:** Available through Supabase dashboard
- **Export Functionality:** CSV/JSON export for data portability
- **Real-time Sync:** Data changes synchronized across devices instantly

## Performance Requirements

### Response Times
- Page load: < 2 seconds
- Form submission: < 1 second
- Search results: < 500ms
- PDF generation: < 3 seconds

### Scalability
- Support up to 1000 clients
- Handle 500 products
- Generate 100 invoices per month
- Optimized database queries

## Acceptance Criteria

### Client Management
- [ ] Create client with all required fields
- [ ] Edit existing client information
- [ ] Delete client (with confirmation)
- [ ] Search clients by name, email, or company
- [ ] Filter clients by status and date
- [ ] Export client list to CSV

### Product Management
- [ ] Create digital product with pricing
- [ ] Edit product details and description
- [ ] Delete unused products
- [ ] Search products by name or category
- [ ] Track product usage in invoices

### Invoice System
- [ ] Create invoice with client and product selection
- [ ] Generate PDF with Dutch formatting
- [ ] Send invoice via email
- [ ] Track invoice status (draft, sent, pending, overdue)
- [ ] Calculate VAT correctly (21% Dutch rate)
- [ ] Auto-generate unique invoice numbers per user
- [ ] Real-time invoice preview with Supabase sync

### General Requirements
- [ ] Responsive design works on desktop and tablet
- [ ] Form validation with clear error messages
- [ ] Data persistence with Supabase real-time sync
- [ ] Fast loading times and smooth interactions
- [ ] Dutch language support in interface
- [ ] User authentication with Supabase Auth
- [ ] Secure multi-user environment with RLS policies

## Future Enhancements (V2.0)

### Advanced Features
- Recurring invoices/subscriptions
- Multi-currency support
- Time tracking integration
- Project management features
- Mobile app companion

### Reporting & Analytics
- Revenue tracking and reports
- Client activity insights
- Product performance metrics
- Tax reporting assistance

### Enhanced Integrations
- Adobe Creative Cloud integration
- File sharing and delivery system
- Advanced email templates
- Calendar integration for deadlines

## Development Phases

### Phase 1 (MVP)
- Supabase project setup with MCP server integration
- User authentication with Supabase Auth
- Client management CRUD with RLS policies
- Product management CRUD
- Basic invoice creation with real-time preview
- PDF generation
- Core navigation and UI

### Phase 2
- Advanced search and filtering with Supabase queries
- Email integration via Supabase Edge Functions
- Data export functionality
- Invoice status tracking
- UI polish and optimizations
- Real-time collaboration features

### Phase 3
- Advanced reporting with Supabase analytics
- Performance optimizations
- Enhanced security features
- User feedback integration
- Mobile responsiveness improvements

---

**Note:** This PRD should be used as a comprehensive guide for developing the Adobe Editor Dashboard application. All features should be implemented following the SON design system specifications provided separately.);
    
    invoice_number := 'INV-' || LPAD(counter::TEXT, 4, '0') || '-' || year_suffix;
    
    RETURN invoice_number;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for invoice summaries with client information
CREATE VIEW invoice_summary AS
SELECT 
    i.id,
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    i.total_amount,
    i.status,
    i.user_id,
    c.first_name || ' ' || c.last_name AS client_name,
    c.company_name,
    c.email AS client_email,
    COUNT(ii.id) AS item_count
FROM invoices i
LEFT JOIN clients c ON i.client_id = c.id
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
GROUP BY i.id, c.first_name, c.last_name, c.company_name, c.email;
```

### MCP Server Integration Setup

#### Environment Variables
```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

#### MCP Server Configuration
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "your-supabase-project-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-supabase-service-role-key"
      }
    }
  }
}
```

## UI/UX Requirements

### Design System
- Follow the SON design system (purple primary, teal accents)
- Consistent spacing and typography
- Responsive design for desktop and tablet
- Dark/light theme support

### Navigation Structure
```
Dashboard
├── Klanten (Clients)
│   ├── Alle Klanten (All Clients)
│   └── Klant Toevoegen (Add Client)
├── Producten (Products)
│   ├── Alle Producten (All Products)
│   └── Product Toevoegen (Add Product)
└── Betalingen (Payments)
    ├── Alle Facturen (All Invoices)
    └── Factuur Maken (Create Invoice)
```

### Form Validation Rules
- **Email:** Valid email format, uniqueness check
- **KVK Number:** 8-digit Dutch format validation
- **Phone:** International format support
- **VAT Number:** EU VAT format validation
- **Prices:** Minimum 0.01, maximum 99999.99
- **Required fields:** Clear indication with asterisks

### Error Handling
- Form validation errors with clear messages
- Network error handling with retry options
- Data loss prevention (auto-save drafts)
- Loading states for async operations

## Data Flow & User Journeys

### Client Management Flow
1. User navigates to "Klanten" page
2. Views existing clients in table format
3. Can search, filter, or sort clients
4. Clicks "Klant Toevoegen" to create new client
5. Fills out comprehensive client form
6. System validates and saves client data
7. Returns to client list with success message

### Invoice Creation Flow
1. User navigates to "Factuur Maken" page
2. Left panel: Selects client from dropdown
3. Left panel: Adds products with quantities
4. Right panel: Real-time preview updates
5. User reviews invoice details
6. Can save as draft or generate final invoice
7. Options to print, email, or download PDF

### Product Management Flow
1. User navigates to "Producten" page
2. Views product catalog in grid/list view
3. Can create, edit, or delete products
4. Tracks usage statistics per product
5. Categories help organize services

## Security & Privacy Requirements

### Data Protection
- GDPR compliance for Dutch clients
- Secure password hashing (bcrypt)
- Session management with JWT tokens
- Input sanitization and validation
- SQL injection prevention

### Access Control
- User authentication system
- Role-based permissions (if multi-user)
- Secure file upload handling
- Rate limiting for API endpoints

### Data Backup
- Automated daily backups
- Export functionality for data portability
- Version control for critical data changes

## Performance Requirements

### Response Times
- Page load: < 2 seconds
- Form submission: < 1 second
- Search results: < 500ms
- PDF generation: < 3 seconds

### Scalability
- Support up to 1000 clients
- Handle 500 products
- Generate 100 invoices per month
- Optimized database queries

## Acceptance Criteria

### Client Management
- [ ] Create client with all required fields
- [ ] Edit existing client information
- [ ] Delete client (with confirmation)
- [ ] Search clients by name, email, or company
- [ ] Filter clients by status and date
- [ ] Export client list to CSV

### Product Management
- [ ] Create digital product with pricing
- [ ] Edit product details and description
- [ ] Delete unused products
- [ ] Search products by name or category
- [ ] Track product usage in invoices

### Invoice System
- [ ] Create invoice with client and product selection
- [ ] Generate PDF with Dutch formatting
- [ ] Send invoice via email
- [ ] Track payment status
- [ ] Calculate VAT correctly (21% Dutch rate)
- [ ] Auto-generate unique invoice numbers

### General Requirements
- [ ] Responsive design works on desktop and tablet
- [ ] Form validation with clear error messages
- [ ] Data persistence across sessions
- [ ] Fast loading times and smooth interactions
- [ ] Dutch language support in interface

## Future Enhancements (V2.0)

### Payment Integration
- Online payment processing (Mollie, Stripe)
- Automatic payment status updates
- Payment reminder automation

### Reporting & Analytics
- Revenue tracking and reports
- Client activity insights
- Product performance metrics
- Tax reporting assistance

### Advanced Features
- Recurring invoices/subscriptions
- Multi-currency support
- Time tracking integration
- Project management features
- Mobile app companion

## Development Phases

### Phase 1 (MVP)
- Client management CRUD
- Product management CRUD
- Basic invoice creation
- PDF generation
- Core navigation and UI

### Phase 2
- Advanced search and filtering
- Email integration
- Data export functionality
- Invoice status tracking
- UI polish and optimizations

### Phase 3
- Payment status management
- Advanced reporting
- Performance optimizations
- Security enhancements
- User feedback integration

---

**Note:** This PRD should be used as a comprehensive guide for developing the Adobe Editor Dashboard application. All features should be implemented following the SON design system specifications provided separately.