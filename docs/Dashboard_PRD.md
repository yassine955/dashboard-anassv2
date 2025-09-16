---
title: Product Requirements Document (PRD)
---

# 1. Introduction

This PRD describes the requirements for a dashboard application tailored
for an Adobe editor. The application allows the editor to manage
clients, digital products, and payments (invoices). It includes CRUD
(Create, Read, Update, Delete) functionalities across different modules.

# 2. Goals

\- Provide a centralized dashboard for managing clients, products, and
invoices.\
- Ensure all modules support CRUD operations.\
- Provide detailed records with created_date and edited_date for
tracking changes.\
- Enable invoice generation with clear PDF previews and sending
capabilities.

# 3. Clients Page

The Clients page allows the editor to manage his clients. It includes
the following features and fields:\
- Name\
- Lastname\
- Email\
- KVK (Dutch Chamber of Commerce number)\
- Other private information (address, phone number, etc.)\
- Created Date\
- Edited Date\
\
Functionalities:\
- Add new clients\
- Update client information\
- Delete clients\
- View clients

# 4. Products Page

The Products page lists all the digital products the editor sells. Each
product should include:\
- Name\
- Price\
- Description\
- General information (type, license details, etc.)\
- Created Date\
- Edited Date\
\
Functionalities:\
- Add new products\
- Update product information\
- Delete products\
- View products

# 5. Payments Page

The Payments page shows all invoices created. It includes:\
- Date\
- Unique Kenmerk (identifier)\
- Description\
- Client\
- Product\
- Price\
\
This acts as an overview of all invoices.

# 6. Invoice Creation Page

The Invoice Creation page allows the editor to create invoices by
selecting clients and products. Features include:\
- Dropdown list to select client\
- Dropdown list to select product\
- Option to specify product quantity\
\
UI Layout:\
- Left side: Client and product selection with quantity.\
- Right side: Invoice preview with:\
\* Selected client\
\* Selected product\
\* Quantity\
\* Price calculation\
\* Payment due date\
\* Download invoice as PDF\
\* Send invoice button

# 7. Technical Requirements

\- CRUD operations for Clients, Products, and Invoices.\
- PDF generation for invoices.\
- Clear overview and filtering capabilities for each module.\
- Responsive design for desktop use.
