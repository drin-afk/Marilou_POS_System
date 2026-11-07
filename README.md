# Marilou Sari-Sari Store POS System

A local, single-computer Point-of-Sale (POS) and inventory management web application built for **Marilou Sari-Sari Store** based on the System Planning Document prepared by **Lurdinand D. Luena** and **Charlene D. Palmero**.

---

## 1. System Overview & Features

- **User Authentication & Role-Based Permissions (Rule 1):**
  - **Administrator (Store Owner):** Registers and manages users, adds/edits/deletes products and stock, processes sales, applies discounts, voids mistaken transactions (with automatic stock restoration), views all transaction history, generates sales reports (Day, Week, Month, Year), and exports local SQL backups.
  - **Cashier:** Logs in/out, views products, processes sales and discounts, views on-screen receipts, and reviews their own transaction history.
- **Product & Stock Management (Rule 4 & Rule 5):**
  - Tracks product `name`, `category`, `unit` (`pc`, `pack`, `sachet`, `bottle`, `can`, etc.), optional `barcode`, `price` (`₱`), and `stock_quantity`.
  - Deleting a product that appears in past sales safely archives (soft-deletes) it from active checkout so historical receipts remain intact.
- **Atomic Sales Checkout & Error Recovery (Rules 2, 3, 4):**
  - Supports both **Fixed (`₱`)** and **Percentage (`%`)** cart discounts.
  - Validates `Cash Paid >= Total` and strictly blocks quantities exceeding current stock.
  - If saving fails or connection drops, the cart stays intact on screen with a **Retry** button and no stock is deducted.
- **On-Screen Digital Receipts & Reports:**
  - Displays official digital receipts immediately after checkout and from Transaction History.
  - Summarizes store revenue by **Day, Week, Month, and Year**.

---

## 2. Default Store Login Accounts

| Role | Username | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator (Owner)** | `admin` | `admin123` | Full access (POS, Products, Users, All History, Void, Reports, Backup) |
| **Cashier** | `cashier` | `cashier123` | POS Checkout, On-Screen Receipts, Own Transaction History |
| **Cashier 2** | `lurdinand` | `cashier123` | POS Checkout, On-Screen Receipts, Own Transaction History |

---

## 3. Quick Start (Single-Computer Local POS)

### Prerequisites
1. Make sure **XAMPP MySQL** is running (`127.0.0.1:3306`).
2. Double-click **`start-pos.bat`** in the project root folder, OR run the backend and frontend manually:

#### Manual Start
```powershell
# Terminal 1: Start Laravel API Backend
cd backend
C:\xampp\php\php.exe artisan serve --host=127.0.0.1 --port=8000

# Terminal 2: Start React Vite Frontend
cd frontend
npm run dev
```

Then open **`http://localhost:5173`** in your browser.

---

## 4. Database Backup & Recovery Procedure

### Exporting a Backup
1. Log in as **Administrator (`admin`)**.
2. Go to **Sales Reports** and click **Export Local DB Backup (`.sql`)** in the top-right corner.
3. Save the downloaded `marilou_pos_backup_YYYYMMDD.sql` file to a local backup folder and a USB flash drive.

### Restoring a Backup
```powershell
C:\xampp\mysql\bin\mysql.exe -u root marilou_pos < path\to\marilou_pos_backup_YYYYMMDD.sql
```

---

## 5. Running Automated Tests

```powershell
cd backend
C:\xampp\php\php.exe artisan test
```
