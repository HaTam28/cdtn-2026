# T�i li?u ch?c nang h? th?ng Qu?n l� Kho (CDTN)

> C?p nh?t: 2026-05-05

---

## M?c l?c

1. [X�c th?c & Ngu?i d�ng](#1-x�c-th?c--ngu?i-d�ng)
2. [Qu?n l� H�ng h�a (Item)](#2-qu?n-l�-h�ng-h�a-item)
3. [Qu?n l� Kh�ch h�ng / Nh� cung c?p (Customer)](#3-qu?n-l�-kh�ch-h�ng--nh�-cung-c?p-customer)
4. [Qu?n l� V? tr� kho (Location)](#4-qu?n-l�-v?-tr�-kho-location)
5. [Nh?p kho (GoodsReceipt)](#5-nh?p-kho-goodsreceipt)
6. [L� h�ng (Batch)](#6-l�-h�ng-batch)
7. [Xu?t kho (GoodsIssue)](#7-xu?t-kho-goodsissue)
8. [Ki?m k� kho (InventoryAudit)](#8-ki?m-k�-kho-inventoryaudit)
9. [Quan h? th?c th? t?ng qu�t](#9-quan-h?-th?c-th?-t?ng-qu�t)
10. [Tr?ng th�i chung (DocStatus enum)](#10-tr?ng-th�i-chung-docstatus-enum)

---

## 1. X�c th?c & Ngu?i d�ng

**Base URL:** `/api/auth`, `/api/users`

| Method | Endpoint | M� t? | Quy?n |
|--------|----------|-------|-------|
| POST | `/api/auth/login` | �ang nh?p, tr? v? JWT token | Public |
| POST | `/api/auth/register` | �ang k� t�i kho?n m?i | Public |
| POST | `/api/auth/forgot-password` | Y�u c?u d?t l?i m?t kh?u | Public |
| PUT | `/api/auth/update-password` | �?i m?t kh?u | Authenticated |
| GET | `/api/users` | Danh s�ch ngu?i d�ng | ADMIN |
| GET | `/api/users/{id}` | Chi ti?t ngu?i d�ng | ADMIN, STAFF |
| PUT | `/api/users/{id}` | C?p nh?t th�ng tin ngu?i d�ng | ADMIN |
| DELETE | `/api/users/{id}` | X�a ngu?i d�ng | ADMIN |

**Entity li�n quan:** `User`, `Role` (enum: ADMIN, MANAGER, STAFF)

---

## 2. Qu?n l� H�ng h�a (Item)

**Base URL:** `/api/items`

| Method | Endpoint | M� t? | Quy?n |
|--------|----------|-------|-------|
| GET | `/api/items` | Danh s�ch t?t c? h�ng h�a | ADMIN, STAFF |
| GET | `/api/items/{id}` | Chi ti?t h�ng h�a | ADMIN, STAFF |
| POST | `/api/items` | T?o m?i h�ng h�a | ADMIN, STAFF |
| PUT | `/api/items/{id}` | C?p nh?t h�ng h�a | ADMIN, STAFF |
| DELETE | `/api/items/{id}` | X�a h�ng h�a | ADMIN |

**Entity:** `Item`

| Tru?ng | Ki?u | M� t? |
|--------|------|-------|
| id | SERIAL | Kh�a ch�nh |
| itemcode | VARCHAR(50) | M� h�ng (unique) |
| barcode | VARCHAR(100) | M� v?ch |
| itemname | VARCHAR(200) | T�n h�ng |
| invoicename | VARCHAR(200) | T�n tr�n h�a don |
| description | TEXT | M� t? |
| itemtype | VARCHAR(50) | Lo?i h�ng |
| unitof | VARCHAR(30) | �on v? t�nh |
| itemcatg | VARCHAR(100) | Danh m?c |
| minstocklevel | INT | M?c t?n t?i thi?u |
| isActive | BOOLEAN | �ang ho?t d?ng |
| createdAt | TIMESTAMP | Th?i di?m t?o |

**B?ng ph? tr?:**
- `InventoryBalance`: T?ng t?n kho theo h�ng h�a (`itemId`, `quantity`, `lastUpdated`)
- `ItemLocation`: T?n kho theo v? tr� (`itemId`, `locationId`, `quantity`, `isActive`)

---

## 3. Qu?n l� Kh�ch h�ng / Nh� cung c?p (Customer)

**Base URL:** `/api/customers`

| Method | Endpoint | M� t? | Quy?n |
|--------|----------|-------|-------|
| GET | `/api/customers` | Danh s�ch kh�ch h�ng | ADMIN, STAFF |
| GET | `/api/customers/{id}` | Chi ti?t kh�ch h�ng | ADMIN, STAFF |
| POST | `/api/customers` | T?o m?i | ADMIN, STAFF |
| PUT | `/api/customers/{id}` | C?p nh?t | ADMIN, STAFF |
| DELETE | `/api/customers/{id}` | X�a | ADMIN |

**Entity:** `Customer`

| Tru?ng | Ki?u | M� t? |
|--------|------|-------|
| id | SERIAL | Kh�a ch�nh |
| customercode | VARCHAR(50) | M� kh�ch h�ng (unique) |
| customername | VARCHAR(200) | T�n kh�ch h�ng |
| taxcode | VARCHAR(30) | M� s? thu? |
| address | TEXT | �?a ch? |
| email | VARCHAR(150) | Email |
| mobile | VARCHAR(20) | S? di?n tho?i |
| bankaccount | VARCHAR(50) | S? t�i kho?n ng�n h�ng |
| bankname | VARCHAR(100) | T�n ng�n h�ng |

---

## 4. Qu?n l� V? tr� kho (Location)

**Base URL:** `/api/locations`

| Method | Endpoint | M� t? | Quy?n |
|--------|----------|-------|-------|
| GET | `/api/locations` | Danh s�ch t?t c? v? tr� | ADMIN, STAFF |
| GET | `/api/locations/{id}` | Chi ti?t v? tr� | ADMIN, STAFF |
| POST | `/api/locations` | T?o v? tr� m?i | ADMIN, STAFF |
| PUT | `/api/locations/{id}` | C?p nh?t v? tr� | ADMIN, STAFF |
| DELETE | `/api/locations/{id}` | X�a v? tr� | ADMIN |

**Entity:** `Location`

| Tru?ng | Ki?u | M� t? |
|--------|------|-------|
| id | SERIAL | Kh�a ch�nh |
| locationcode | VARCHAR(50) | M� v? tr� (unique) |
| locationname | VARCHAR(200) | T�n v? tr� |
| rackno | VARCHAR(30) | K? |
| floorno | VARCHAR(10) | T?ng |
| columnno | VARCHAR(10) | C?t |
| capacity | INT | S?c ch?a t?i da (NULL = kh�ng gi?i h?n) |
| isActive | BOOLEAN | �ang ho?t d?ng |

---

## 5. Nh?p kho (GoodsReceipt)

**Base URL:** `/api/goods-receipts`

| Method | Endpoint | M� t? | Quy?n |
|--------|----------|-------|-------|
| GET | `/api/goods-receipts` | Danh s�ch phi?u nh?p | ADMIN, STAFF |
| GET | `/api/goods-receipts/{id}` | Chi ti?t phi?u nh?p | ADMIN, STAFF |
| POST | `/api/goods-receipts` | T?o phi?u nh?p nh�p (DRAFT) | ADMIN, STAFF |
| PUT | `/api/goods-receipts/{id}` | C?p nh?t phi?u DRAFT | ADMIN, STAFF |
| POST | `/api/goods-receipts/{id}/confirm` | X�c nh?n ? c?ng t?n kho | ADMIN, STAFF |
| POST | `/api/goods-receipts/{id}/cancel` | H?y phi?u (ch? DRAFT) | ADMIN, STAFF |
| GET | `/api/goods-receipts/available-locations?itemId=` | Li?t k� v? tr� c�n ch? | ADMIN, STAFF |
| GET | `/api/goods-receipts/suggest-locations?itemId=&quantity=` | G?i � v? tr� ph� h?p | ADMIN, STAFF |
| GET | `/api/goods-receipts/suggest-split?itemId=&quantity=` | G?i � ph�n b? nhi?u v? tr� | ADMIN, STAFF |

**Trang thai phieu (DocStatus):** `DRAFT` -> `CONFIRMED` | `CANCELLED`

**Entity:** `GoodsReceipt`, `GoodsReceiptDetail`

| Tru?ng | Ki?u | M� t? |
|--------|------|-------|
| id | SERIAL | Kh�a ch�nh |
| docno | VARCHAR(50) | M� phi?u (unique) |
| docDate | DATE | Ng�y phi?u |
| description | TEXT | Ghi ch� |
| docstatus | DocStatus | Tr?ng th�i |
| customerId | FK ? Customer | Nh� cung c?p |
| taxcode | VARCHAR(30) | MST t?i th?i di?m l?p phi?u (snapshot) |
| userId | FK ? User | Ngu?i t?o |
| approverId | FK ? User | Ngu?i duy?t / h?y |
| createdAt | TIMESTAMP | Th?i di?m t?o |

**Y�u c?u khi t?o phi?u nh?p:**
- M?i d�ng chi ti?t ph?i c� `itemId` v� `quantity`.
- `locationId` l� b?t bu?c khi x�c nh?n phi?u nh?p.
- `quantity` ph?i > 0.
- FE n�n ki?m tra `quantity <= remainingCapacity` c?a v? tr� tru?c khi g?i.

**M?u request t?o phi?u nh?p:**
```json
{
  "docno": "PN-2026-001",
  "docDate": "2026-05-05",
  "description": "Nh?p h�ng th�ng 5",
  "customerId": 2,
  "details": [
    {
      "itemId": 5,
      "locationId": 3,
      "quantity": 100,
      "unitprice": 50000
    }
  ]
}
```

**X�c nh?n phi?u nh?p:**
- FE g?i `/api/goods-receipts/{id}/confirm`.
- BE ki?m tra location c� d? capacity v� g�n s? lu?ng.
- Khi confirm th�nh c�ng, BE c?p nh?t `ItemLocation` v� `InventoryBalance`.

---

## 6. L� h�ng (Batch)

**M?c d�ch:** Qu?n l� l� h�ng ph?c v? xu?t kho theo quy t?c **FIFO** (First In � First Out).

**Entity:** `Batch`

| Tru?ng | Ki?u | M� t? |
|--------|------|-------|
| id | SERIAL | Kh�a ch�nh |
| batchCode | VARCHAR(50) | M� l� (unique, do BE sinh t? d?ng) |
| itemId | FK ? Item | V?t tu / h�ng h�a thu?c l� |
| nameBatch | VARCHAR(100) | T�n l� |
| receiptDetailId | FK ? GoodsReceiptDetail | D�ng phi?u nh?p t?o ra l� n�y |
| manufactureDate | DATE | Ng�y s?n xu?t |
| expiryDate | DATE | H?n s? d?ng |
| unitCost | NUMERIC(18,5) | Gi� nh?p c?a l� |
| quantity | NUMERIC(16,5) | S? lu?ng ban d?u |
| quantityRemaining | NUMERIC(16,5) | S? lu?ng c�n l?i |
| createdAt | TIMESTAMP | Th?i di?m t?o l� |

**API:**

| Method | Endpoint | M� t? | Quy?n |
|--------|----------|-------|-------|
| GET | `/api/batches` | Danh s�ch l� h�ng | ADMIN, STAFF |
| GET | `/api/batches/{id}` | Chi ti?t l� h�ng | ADMIN, STAFF |
| POST | `/api/batches` | T?o l� m?i, BE t? sinh `batchCode` | ADMIN, STAFF |

**Quy tac sinh `batchCode`:**
- Mau: `ITEMCODE-YYYYMMDD`.
- `ITEMCODE` lay tu `itemId`.
- `YYYYMMDD` lay tu `manufactureDate`; neu khong co thi dung ngay tao lo.
- Neu trung ma cung ngay, BE them hau to thu tu:
  - `SP001-20260505`
  - `SP001-20260505-01`
  - `SP001-20260505-02`

**Quy tac sinh `nameBatch`:**
- Dinh dang: `Lo {tenVatTu} dot {YYYYMMDD}`

**Y�u c?u khi t?o l�:**
- `itemId` t?n t?i.
- `receiptDetailId` t?n t?i v� thu?c d�ng nh?p kho h?p l?.
- `quantity` > 0.
- `unitCost` > 0.

**M?u request t?o l�:**
```json
{
  "itemId": 5,
  "receiptDetailId": 7,
  "manufactureDate": "2026-05-01",
  "expiryDate": "2027-05-01",
  "unitCost": 15000.12345,
  "quantity": 200
}
```

**M?u response th�nh c�ng:**
```json
{
  "success": true,
  "message": "T?o l� h�ng th�nh c�ng",
  "data": {
    "id": 12,
    "batchCode": "SP001-20260501",
    "itemId": 5,
    "itemcode": "SP001",
    "itemname": "S?n ph?m A",
    "nameBatch": "Lo San pham A dot 20260501",
    "receiptDetailId": 7,
    "manufactureDate": "2026-05-01",
    "expiryDate": "2027-05-01",
    "unitCost": 15000.12345,
    "quantity": 200,
    "quantityRemaining": 200,
    "createdAt": "2026-05-05T10:00:00"
  }
}
```

**Ghi ch� cho FE:**
- FE ch? g?i th�ng tin l�, BE sinh `batchCode` va `nameBatch` t? d?ng.
- FE c� th? hi?n th? `batchCode` trong m�n h�nh chi ti?t l�.
- Batch d�ng d? qu?n l� xu?t kho theo FIFO, d?c bi?t khi nhi?u l� c�ng item.

---

## 7. Xu?t kho (GoodsIssue)

**Base URL:** `/api/goods-issues`

| Method | Endpoint | M� t? | Quy?n |
|--------|----------|-------|-------|
| GET | `/api/goods-issues` | Danh s�ch phi?u xu?t | ADMIN, STAFF |
| GET | `/api/goods-issues/{id}` | Chi ti?t phi?u xu?t | ADMIN, STAFF |
| POST | `/api/goods-issues` | T?o phi?u xu?t nh�p (DRAFT) | ADMIN, STAFF |
| PUT | `/api/goods-issues/{id}` | C?p nh?t phi?u DRAFT | ADMIN, STAFF |
| POST | `/api/goods-issues/{id}/confirm` | X�c nh?n ? tr? t?n kho | ADMIN, STAFF |
| POST | `/api/goods-issues/{id}/cancel` | H?y phi?u (ch? DRAFT) | ADMIN, STAFF |
| GET | `/api/goods-issues/available-locations?itemId=` | Li?t k� v? tr� c� h�ng | ADMIN, STAFF |
| GET | `/api/goods-issues/suggest-split?itemId=&quantity=` | G?i � ph�n b? nhi?u v? tr� | ADMIN, STAFF |

**Trang thai phieu (DocStatus):** `DRAFT` -> `REQUESTED` -> `IN_PROGRESS` -> `SUBMITTED` -> `PENDING_PROCESS` -> `PROCESSED` -> `CONFIRMED` | `CANCELLED`

**Entity:** `GoodsIssue`, `GoodsIssueDetail`

**Y�u c?u khi t?o phi?u xu?t:**
- M?i d�ng chi ti?t ph?i c� `itemId`, `locationId`, `quantity`.
- `quantity` ph?i > 0.
- FE n�n ki?m tra t?n kho `ItemLocation` t?i `locationId` tru?c khi g?i.

**M?u request t?o phi?u xu?t:**
```json
{
  "docno": "PX-2026-001",
  "docDate": "2026-05-05",
  "description": "Xu?t don h�ng #123",
  "customerId": 3,
  "details": [
    {
      "itemId": 5,
      "locationId": 3,
      "quantity": 20,
      "unitprice": 55000
    }
  ]
}
```

**X�c nh?n phi?u xu?t:**
- FE g?i `/api/goods-issues/{id}/confirm`.
- BE ki?m tra t?n kho t?i m?i v? tr�.
- Tr? s? lu?ng kh?i `ItemLocation` v� `InventoryBalance`.

---

## 8. Ki?m k� kho (InventoryAudit)

**Base URL:** `/api/inventory-audits`

| Method | Endpoint | M� t? | Quy?n |
|--------|----------|-------|-------|
| GET | `/api/inventory-audits` | Danh s�ch phi?u ki?m k� | ADMIN, STAFF |
| GET | `/api/inventory-audits/{id}` | Chi ti?t phi?u ki?m k� | ADMIN, STAFF |
| POST | `/api/inventory-audits` | T?o phi?u ki?m k� nh�p (DRAFT) | ADMIN, STAFF |
| PUT | `/api/inventory-audits/{id}` | C?p nh?t phi?u DRAFT | ADMIN, STAFF |
| POST | `/api/inventory-audits/{id}/confirm` | X�c nh?n ? di?u ch?nh t?n kho | ADMIN, STAFF |
| POST | `/api/inventory-audits/{id}/cancel` | H?y phi?u (ch? DRAFT) | ADMIN, STAFF |

**Trang thai phieu (DocStatus):** `DRAFT` -> `REQUESTED` -> `IN_PROGRESS` -> `SUBMITTED` -> `PENDING_PROCESS` -> `PROCESSED` -> `CONFIRMED` | `CANCELLED`

**Entity:** `InventoryAudit`, `InventoryAuditDetail`

| Tru?ng | Ki?u | M� t? |
|--------|------|-------|
| id | SERIAL | Kh�a ch�nh |
| docno | VARCHAR(50) | M� phi?u (unique) |
| docDate | DATE | Ng�y ki?m k� |
| description | TEXT | Ghi ch� |
| docstatus | DocStatus | Tr?ng th�i |
| locationId | FK ? Location | V? tr� ki?m k� |
| userId | FK ? User | Ngu?i t?o |
| createdAt | TIMESTAMP | Th?i di?m t?o |

**InventoryAuditDetail:**

| Tru?ng | Ki?u | M� t? |
|--------|------|-------|
| id | SERIAL | Kh�a ch�nh |
| auditId | FK ? InventoryAudit | Phi?u ki?m k� |
| itemId | FK ? Item | H�ng h�a |
| unitof | VARCHAR(30) | �on v? t�nh |
| bookquantity | NUMERIC(18,4) | T?n s? s�ch (l?y t? ItemLocation khi t?o) |
| actualquantity | NUMERIC(18,4) | T?n th?c t? (nh?p tay) |
| diffquantity | NUMERIC(18,4) | Ch�nh l?ch = actual - book |
| description | TEXT | Ghi ch� d�ng |

**Y�u c?u khi ki?m k�:**
- FE ch? g?i `actualquantity` cho t?ng d�ng.
- `bookquantity` v� `diffquantity` do BE t�nh t? d?ng.
- `diffquantity = actualquantity - bookquantity`.

**M?u request t?o ki?m k�:**
```json
{
  "docno": "KIEMKE-2026-001",
  "docDate": "2026-05-05",
  "description": "Ki?m k� v? tr� A1-01",
  "locationId": 3,
  "details": [
    {
      "itemId": 5,
      "actualquantity": 95,
      "description": "Ki?m k� th?c t?"
    }
  ]
}
```

**Khi x�c nh?n ki?m k�:**
- `diff > 0`: c?ng t?n kho `ItemLocation` v� `InventoryBalance`.
- `diff < 0`: tr? t?n kho, kh�ng d? k?t qu? �m.
- `diff = 0`: kh�ng thay d?i.

---

## 9. Quan h? th?c th? t?ng qu�t

```
User ----- GoodsReceipt ---- GoodsReceiptDetail ----- Item ---- InventoryBalance
       �                                           +-- Location -- ItemLocation
       +-- GoodsIssue ------ GoodsIssueDetail ----+
       +-- InventoryAudit -- InventoryAuditDetail

GoodsReceiptDetail ?-- Batch --? Item
```

---

## 10. Tr?ng th�i chung (DocStatus enum)

| Gi� tr? | � nghia |
|---------|---------|
| `DRAFT` | Phi?u nh�p, cho ph�p s?a/h?y |
| `CONFIRMED` | �� x�c nh?n, d� t�c d?ng t?n kho |
| `CANCELLED` | �� h?y, kh�ng t�c d?ng t?n kho |
