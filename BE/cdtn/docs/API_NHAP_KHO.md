# API Nhập Kho – Goods Receipt

> **Base URL:** `http://localhost:8080`  
> **Base path:** `/api/goods-receipts`  
> **Auth:** Mọi request cần header `Authorization: Bearer <token>` (lấy từ `POST /api/auth/login`).

---

## Mục lục

1. [Tổng quan & luồng trạng thái](#1-tổng-quan--luồng-trạng-thái)
2. [Danh sách endpoint](#2-danh-sách-endpoint)
3. [Tạo / Cập nhật phiếu nháp](#3-tạo--cập-nhật-phiếu-nháp)
4. [Xác nhận phiếu nhập](#4-xác-nhận-phiếu-nhập)
5. [Từ chối phiếu nhập](#5-từ-chối-phiếu-nhập)
6. [Hủy phiếu](#6-hủy-phiếu)
7. [API hỗ trợ chọn vị trí](#7-api-hỗ-trợ-chọn-vị-trí)
8. [Lưu ý về lô hàng (Batch)](#8-lưu-ý-về-lô-hàng-batch)
9. [Phiếu nhập điều chỉnh từ kiểm kê](#9-phiếu-nhập-điều-chỉnh-từ-kiểm-kê)
10. [Bảng lỗi thường gặp](#10-bảng-lỗi-thường-gặp)

---

## 1. Tổng quan & luồng trạng thái

```
DRAFT ──(chỉnh sửa tùy ý)──► confirm ──► CONFIRMED  (tồn kho được cộng)
      └──────────────────────► cancel ──► CANCELLED   (tồn kho không đổi)
      └──────────────────────► reject ──► REJECTED
```

| `docstatus` | Hiển thị FE | Badge |
|-------------|-------------|-------|
| `DRAFT` | Nháp | Xám |
| `CONFIRMED` | Đã xác nhận | Xanh |
| `CANCELLED` | Đã hủy | Đỏ |
| `REJECTED` | Bị từ chối | Đỏ đậm |

> **Lưu ý:** Phiếu đã `CONFIRMED` hoặc `CANCELLED` **không thể sửa**. BE sẽ trả lỗi nếu gọi PUT trên các phiếu này.

---

## 2. Danh sách endpoint

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| `GET` | `/api/goods-receipts` | Danh sách phiếu nhập | ADMIN, MANAGER, STAFF |
| `GET` | `/api/goods-receipts/{id}` | Chi tiết phiếu nhập | ADMIN, MANAGER, STAFF |
| `POST` | `/api/goods-receipts` | Tạo phiếu nháp | ADMIN, MANAGER, STAFF |
| `PUT` | `/api/goods-receipts/{id}` | Sửa phiếu DRAFT | ADMIN, MANAGER, STAFF |
| `POST` | `/api/goods-receipts/{id}/confirm` | Xác nhận → cộng tồn kho | ADMIN, MANAGER |
| `POST` | `/api/goods-receipts/{id}/cancel` | Hủy phiếu DRAFT | ADMIN, MANAGER |
| `POST` | `/api/goods-receipts/{id}/reject` | Từ chối phiếu nhập | ADMIN, MANAGER |
| `GET` | `/api/goods-receipts/available-locations?itemId=` | Vị trí còn chỗ | ADMIN, MANAGER, STAFF |
| `GET` | `/api/goods-receipts/suggest-locations?itemId=&quantity=` | Gợi ý vị trí đủ số lượng | ADMIN, MANAGER, STAFF |
| `GET` | `/api/goods-receipts/suggest-split?itemId=&quantity=` | Gợi ý phân bổ nhiều vị trí | ADMIN, MANAGER, STAFF |

### Lọc theo người tạo

```
GET /api/goods-receipts?userId={userId}
Authorization: Bearer <token>
```

- `userId` (optional): lọc phiếu do user đó tạo.
- `STAFF` chỉ được xem phiếu của chính mình — gửi `userId` khác sẽ bị từ chối (403).
- `ADMIN`, `MANAGER`: có thể xem phiếu của bất kỳ `userId` nào.

---

## 3. Tạo / Cập nhật phiếu nháp

### 3.1 Tạo phiếu nháp

**Endpoint:** `POST /api/goods-receipts`  
**Quyền:** ADMIN, MANAGER, STAFF

**Request body:**
```json
{
  "docno": "PN-2026-001",
  "invoiceNumber": "INV-20260505-01",
  "doctype": "NORMAL",
  "docDate": "2026-05-05",
  "description": "Nhập hàng tháng 5",
  "customerId": 2,
  "details": [
    {
      "itemId": 5,
      "locationId": 3,
      "quantity": 100,
      "unitprice": 50000
    },
    {
      "itemId": 6,
      "locationId": null,
      "quantity": 50,
      "unitprice": 30000
    }
  ]
}
```

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `docno` | ❌ | BE tự sinh `PN-01`, `PN-02`, ... nếu không gửi |
| `invoiceNumber` | ❌ | Số hóa đơn/chứng từ từ nhà cung cấp |
| `doctype` | ✅ | Loại phiếu: `NORMAL` hoặc `ADJUSTMENT` |
| `docDate` | ❌ | Ngày nhập (yyyy-MM-dd) |
| `description` | ❌ | Ghi chú |
| `customerId` | ❌ | ID nhà cung cấp |
| `details[].itemId` | ✅ | ID hàng hóa |
| `details[].locationId` | ❌ | ID vị trí (có thể `null` khi tạo DRAFT; phải gán trước khi confirm) |
| `details[].quantity` | ✅ | Số lượng nhập |
| `details[].unitprice` | ❌ | Đơn giá |

**Response thành công (`200`):**
```json
{
  "success": true,
  "message": "Tạo phiếu nhập thành công",
  "data": {
    "id": 1,
    "docno": "PN-2026-001",
    "invoiceNumber": "INV-20260505-01",
    "doctype": "NORMAL",
    "docDate": "2026-05-05",
    "description": "Nhập hàng tháng 5",
    "docstatus": "DRAFT",
    "customerId": 2,
    "customerName": "Công ty ABC",
    "customerTaxcode": "123456789",
    "createdAt": "2026-05-05T08:30:00",
    "createdByUsername": "admin",
    "createdByFullname": "Admin hệ thống",
    "actionByUsername": null,
    "actionByFullname": null,
    "approvedAt": null,
    "rejectReason": null,
    "details": [
      {
        "id": 1,
        "itemId": 5,
        "itemcode": "SP001",
        "itemname": "Sản phẩm A",
        "unitof": "Cái",
        "quantity": 100,
        "unitprice": 50000,
        "amount": 5000000,
        "locationId": 3,
        "locationcode": "A1-01",
        "locationname": "Kệ A1, tầng 1",
        "batchId": null,
        "batchCode": null,
        "inventoryAuditDetailId": null
      }
    ]
  }
}
```

> `batchId` / `batchCode` chỉ xuất hiện sau khi phiếu được **CONFIRMED**. FE không cần gọi `POST /api/batches` — BE tự động tạo lô khi xác nhận.

### 3.3 Cập nhật phiếu nháp

**Endpoint:** `PUT /api/goods-receipts/{id}`  
**Quyền:** ADMIN, MANAGER, STAFF  
**Điều kiện:** Phiếu phải đang ở trạng thái `DRAFT`.

Request body giống `POST`. FE gửi toàn bộ `details[]` (BE sẽ thay thế toàn bộ dòng chi tiết hiện có).

---

## 3.4 Validation khi lưu nháp vs. xác nhận

> Đây là điểm khác biệt cốt lõi giữa **Lưu nháp** và **Xác nhận**. FE cần hiểu rõ để hiển thị đúng trạng thái form.

### Phiếu nhập NORMAL

| Trường / Quy tắc | Lưu nháp (`POST`/`PUT`) | Xác nhận (`confirm`) |
|------------------|------------------------|----------------------|
| `details[].itemId` | ✅ Bắt buộc | ✅ Bắt buộc |
| `details[].quantity` | ✅ Bắt buộc (> 0) | ✅ Bắt buộc |
| `details[].locationId` | ❌ Tùy chọn | ✅ Bắt buộc (mọi dòng) |
| `details[].unitprice` | ❌ Tùy chọn | ❌ Tùy chọn |
| `customerId` | ❌ Tùy chọn | ❌ Tùy chọn |
| `invoiceNumber` | ❌ Tùy chọn | ❌ Tùy chọn |
| Kiểm tra capacity vị trí | ❌ Không kiểm tra | ✅ Kiểm tra |
| Cộng tồn kho (`InventoryBalance`) | ❌ Không | ✅ Có |
| Tạo mã lô (`Batch`) | ❌ Không | ✅ Có |

### Phiếu nhập điều chỉnh ADJUSTMENT (từ kiểm kê)

| Trường / Quy tắc | Lưu nháp (`POST`/`PUT`) | Xác nhận (`confirm`) |
|------------------|------------------------|----------------------|
| `inventoryAuditId` (header) | ✅ Bắt buộc | ✅ Bắt buộc |
| `details[].itemId` | ✅ Bắt buộc | ✅ Bắt buộc |
| `details[].quantity` | ✅ Bắt buộc (> 0) | ✅ Bắt buộc |
| `details[].inventoryAuditDetailId` | ✅ Bắt buộc | ✅ Bắt buộc |
| `details[].batchId` | ❌ Tùy chọn (auto-fill từ auditDetail) | ✅ Bắt buộc (phải khớp lô kiểm kê) |
| `details[].locationId` | ❌ Tùy chọn | ✅ Bắt buộc |
| Kiểm tra trùng `inventoryAuditDetailId` | ✅ Kiểm tra | ✅ Kiểm tra |
| Kiểm tra auditDetail thuộc đúng audit | ✅ Kiểm tra | — (đã kiểm tra lúc lưu) |
| Kiểm tra capacity vị trí | ❌ Không kiểm tra | ✅ Kiểm tra |
| Cộng tồn kho + cập nhật batch | ❌ Không | ✅ Có |

> **Gợi ý UX FE:**
> - Nút **"Lưu nháp"**: enabled ngay khi có ít nhất 1 dòng `details` hợp lệ (`itemId` + `quantity`).
> - Nút **"Xác nhận"**: chỉ enabled khi tất cả dòng đã có `locationId`. FE có thể validate client-side trước khi gọi confirm để tránh lỗi 400.
> - Phiếu DRAFT hiển thị badge cảnh báo nếu có dòng thiếu `locationId`: *"Còn {n} dòng chưa được gán vị trí"*.

---

## 4. Xác nhận phiếu nhập

**Endpoint:** `POST /api/goods-receipts/{id}/confirm`  
**Quyền:** ADMIN, MANAGER  
**Body:** Không cần body.

**BE thực hiện khi confirm:**
1. Kiểm tra tất cả dòng đã có `locationId`.
2. Kiểm tra capacity từng vị trí còn đủ chỗ.
3. Cộng `quantity` vào `ItemLocation` (tạo mới nếu chưa có).
4. Cộng `quantity` vào `InventoryBalance` (tồn kho tổng).
5. Tự động tạo/cập nhật lô (batch) theo từng dòng chi tiết gắn vị trí:
   - **Sinh mã lô mới:** `batchCode = ITEMCODE-YYYYMMDD` (ngày từ `docDate`); thêm hậu tố `-01`, `-02`, ... khi trùng.
   - **Ghi đè batch đã có:** nếu batch cho dòng đó đã tồn tại, ghi đè `quantity` và `quantityRemaining`.
6. Set `docstatus = CONFIRMED`, lưu `actionByUsername`.

**Luồng end-to-end:**
```
1. POST /api/goods-receipts          → tạo DRAFT
2. GET  /available-locations         → chọn locationId cho từng dòng
3. PUT  /api/goods-receipts/{id}     → cập nhật locationId (nếu cần)
4. POST /api/goods-receipts/{id}/confirm → confirm
5. GET  /api/goods-receipts/{id}     → lấy phiếu đã confirm (có batchId, batchCode)
```

**Response thành công:**
```json
{
  "success": true,
  "message": "Xác nhận phiếu nhập thành công",
  "data": {
    "id": 1,
    "docno": "PN-2026-001",
    "docstatus": "CONFIRMED",
    "actionByUsername": "manager01",
    "actionByFullname": "Trưởng kho",
    "approvedAt": "2026-05-05T10:00:00",
    "details": [
      {
        "id": 1,
        "itemId": 5,
        "itemcode": "SP001",
        "quantity": 100,
        "locationId": 3,
        "locationcode": "A1-01",
        "batchId": 1,
        "batchCode": "SP001-20260505"
      }
    ]
  }
}
```

**Lỗi có thể trả về:**
| Thông báo | Nguyên nhân |
|-----------|-------------|
| `"Phiếu nhập không có dòng chi tiết nào"` | `details` rỗng |
| `"Dòng chi tiết với mã hàng 'X' chưa được gán vị trí"` | Có dòng chưa có `locationId` |
| `"Vị trí 'A1-01' không đủ sức chứa. Còn trống: 20, cần nhập: 100"` | Vị trí hết chỗ |
| `"Vị trí không đủ sức chứa."` | Lỗi capacity chung |

---

## 5. Từ chối phiếu nhập

**Endpoint:** `POST /api/goods-receipts/{id}/reject`  
**Quyền:** ADMIN, MANAGER

**Request body:**
```json
{
  "reason": "Hóa đơn không hợp lệ"
}
```

BE set `docstatus = REJECTED`, lưu `rejectReason`. Creator (STAFF) nhận thông báo `REJECTED`.

**Response:**
```json
{
  "success": true,
  "message": "Từ chối phiếu nhập thành công",
  "data": {
    "id": 12,
    "docno": "PN-12",
    "docstatus": "REJECTED",
    "rejectReason": "Hóa đơn không hợp lệ",
    "actionByUsername": "manager01",
    "actionByFullname": "Trưởng kho",
    "approvedAt": "2026-05-31T10:30:00"
  }
}
```

**Lỗi:**
- `"Phiếu nhập đã ở trạng thái CONFIRMED/CANCELLED/REJECTED, không thể từ chối"`

---

## 6. Hủy phiếu

**Endpoint:** `POST /api/goods-receipts/{id}/cancel`  
**Quyền:** ADMIN, MANAGER  
**Điều kiện:** Chỉ phiếu `DRAFT` mới hủy được.  
**Body:** Không cần body.

---

## 7. API hỗ trợ chọn vị trí

### 7.1 Danh sách vị trí còn chỗ

**Endpoint:** `GET /api/goods-receipts/available-locations?itemId={id}`

Trả về danh sách vị trí sắp xếp: `EXISTING` → `EMPTY` → `PARTIAL`.

**Response:**
```json
[
  {
    "locationId": 3,
    "locationcode": "A1-01",
    "locationname": "Kệ A1, tầng 1",
    "rackno": "A1",
    "floorno": "1",
    "columnno": "1",
    "capacity": 100,
    "usedCapacity": 40,
    "remainingCapacity": 60,
    "type": "EXISTING",
    "items": [
      {
        "itemId": 5,
        "itemcode": "SP001",
        "itemname": "Sản phẩm A",
        "unitof": "Cái",
        "quantity": 40,
        "batchCodes": ["SP001-20260415"]
      }
    ]
  }
]
```

> **Cấu trúc `items`:** Mỗi phần tử là 1 dòng theo mã hàng (không phân tách theo lô). `quantity` = tổng tồn của mã hàng đó tại vị trí; `batchCodes` = tất cả mã lô của mã hàng đó tại vị trí.

| `type` | Ý nghĩa |
|--------|---------|
| `EXISTING` | Vị trí đã có mặt hàng này (ưu tiên cao nhất) |
| `EMPTY` | Vị trí trống hoàn toàn |
| `PARTIAL` | Vị trí còn chỗ nhưng chứa mặt hàng khác |

### 7.2 Gợi ý vị trí đủ số lượng

**Endpoint:** `GET /api/goods-receipts/suggest-locations?itemId={id}&quantity={qty}`

Trả về danh sách vị trí đủ sức chứa `quantity` (không phân bổ nhiều vị trí).

### 7.3 Gợi ý phân bổ nhiều vị trí

**Endpoint:** `GET /api/goods-receipts/suggest-split?itemId={id}&quantity={qty}`

Dùng khi `quantity` lớn hơn sức chứa 1 vị trí. Trả thêm `suggestedQuantity` cho từng vị trí.

**Response:**
```json
[
  {
    "locationId": 3,
    "locationcode": "A1-01",
    "locationname": "Kệ A1",
    "capacity": 100,
    "currentQuantity": 40,
    "availableSpace": 60,
    "type": "EXISTING",
    "suggestedQuantity": 60
  },
  {
    "locationId": 7,
    "locationcode": "B2-01",
    "locationname": "Kệ B2",
    "capacity": 100,
    "currentQuantity": 0,
    "availableSpace": 100,
    "type": "EMPTY",
    "suggestedQuantity": 40
  }
]
```

---

## 8. Lưu ý về lô hàng (Batch)

- **FE không cần gọi `POST /api/batches`** trong luồng nhập kho thông thường.
- Batch được **BE tự động tạo** khi confirm phiếu, theo từng dòng chi tiết gắn vị trí.
- `batchCode` được sinh theo mẫu `ITEMCODE-YYYYMMDD` + hậu tố `-01`, `-02`, ... khi trùng.
- `batchCode` / `batchId` chỉ xuất hiện trong response sau khi phiếu `CONFIRMED`.
- Nếu phiếu bị `CANCELLED` hoặc dòng detail bị xóa (PUT cập nhật DRAFT), batch liên kết sẽ bị xóa theo.

---

## 9. Phiếu nhập điều chỉnh từ kiểm kê

Khi phiếu kiểm kê trả về `PROCESSED` và có `diffquantity > 0` (thừa hàng), FE tạo phiếu nhập điều chỉnh.

**Endpoint:** `POST /api/goods-receipts`

**Payload mẫu:**
```json
{
  "docDate": "2026-06-06",
  "description": "Điều chỉnh từ kiểm kê KK-2026-001",
  "inventoryAuditId": 10,
  "adjustmentFlags": [true, false, true],
  "details": [
    {
      "itemId": 5,
      "batchId": 22,
      "locationId": 3,
      "quantity": 100,
      "unitprice": 50000,
      "inventoryAuditDetailId": 101
    }
  ]
}
```

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `inventoryAuditId` | ✅ | ID phiếu kiểm kê nguồn; BE tự set `doctype = ADJUSTMENT` |
| `details[].batchId` | ✅ | ID mã lô auto-fill từ dòng kiểm kê |
| `details[].locationId` | ✅ | Vị trí nhận hàng (không bắt buộc trùng vị trí gốc của lô) |
| `details[].inventoryAuditDetailId` | ✅ | ID dòng kiểm kê nguồn (chống tạo trùng) |
| `inventoryAuditId`, `customerId`, `invoiceNumber` | ❌ | FE không cần gửi các trường hóa đơn/đối tượng |

**Khi confirm phiếu điều chỉnh:** BE cộng số lượng vào batch hiện có, **không sinh batchCode mới**.

**Validation BE:**
| Lỗi | Nguyên nhân |
|-----|-------------|
| `"Phiếu nhập điều chỉnh phải liên kết chi tiết phiếu kiểm kê"` | Thiếu `inventoryAuditDetailId` |
| `"Phiếu nhập điều chỉnh phải có mã lô"` | Thiếu `batchId` |
| `"Mã lô không khớp với chi tiết phiếu kiểm kê"` | `batchId` không khớp |
| `"Chi tiết phiếu kiểm kê đã được tạo phiếu điều chỉnh"` | Dòng kiểm kê đã có phiếu điều chỉnh |
| `"Vị trí không đủ sức chứa."` | Capacity không đủ |

---

## 10. Bảng lỗi thường gặp

| HTTP Status | Thông báo | Xử lý FE |
|-------------|-----------|----------|
| `400` | `"Phiếu nhập không có dòng chi tiết nào"` | Bắt buộc thêm ít nhất 1 dòng |
| `400` | `"Dòng chi tiết với mã hàng 'X' chưa được gán vị trí"` | Gán `locationId` trước khi confirm |
| `400` | `"Vị trí 'A1-01' không đủ sức chứa..."` | Chọn vị trí khác hoặc phân bổ nhiều vị trí |
| `400` | `"Phiếu nhập đã ở trạng thái CONFIRMED..."` | Không cho sửa/hủy phiếu đã xác nhận |
| `401` | — | Token hết hạn → chuyển về trang đăng nhập |
| `403` | — | Không đủ quyền → xóa token cũ, đăng nhập lại |
| `409` | `"Dữ liệu đã tồn tại..."` | Trùng unique (docno, ...) |
| `500` | `"Lỗi hệ thống: <chi tiết>"` | Hiển thị thông báo lỗi chung |

---

*Tài liệu này chỉ bao gồm module **Nhập kho**. Xem [API_XUAT_KHO.md](./API_XUAT_KHO.md) và [API_KIEM_KE.md](./API_KIEM_KE.md) cho các module tương ứng.*
