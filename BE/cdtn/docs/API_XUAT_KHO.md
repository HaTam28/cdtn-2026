# API Xuất Kho – Goods Issue

> **Base URL:** `http://localhost:8080`  
> **Base path:** `/api/goods-issues`  
> **Auth:** Mọi request cần header `Authorization: Bearer <token>` (lấy từ `POST /api/auth/login`).

---

## Mục lục

1. [Tổng quan & luồng trạng thái](#1-tổng-quan--luồng-trạng-thái)
2. [Danh sách endpoint](#2-danh-sách-endpoint)
3. [Tạo / Cập nhật phiếu nháp](#3-tạo--cập-nhật-phiếu-nháp)
4. [Xác nhận phiếu xuất](#4-xác-nhận-phiếu-xuất)
5. [Từ chối phiếu xuất](#5-từ-chối-phiếu-xuất)
6. [Hủy phiếu](#6-hủy-phiếu)
7. [API hỗ trợ chọn vị trí / lô hàng](#7-api-hỗ-trợ-chọn-vị-trí--lô-hàng)
8. [Phiếu xuất điều chỉnh từ kiểm kê](#8-phiếu-xuất-điều-chỉnh-từ-kiểm-kê)
9. [Bảng lỗi thường gặp](#9-bảng-lỗi-thường-gặp)

---

## 1. Tổng quan & luồng trạng thái

```
DRAFT ──(chỉnh sửa tùy ý)──► confirm ──► CONFIRMED  (tồn kho được trừ)
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
| `GET` | `/api/goods-issues` | Danh sách phiếu xuất | ADMIN, MANAGER, STAFF |
| `GET` | `/api/goods-issues/{id}` | Chi tiết phiếu xuất | ADMIN, MANAGER, STAFF |
| `POST` | `/api/goods-issues` | Tạo phiếu nháp | ADMIN, MANAGER, STAFF |
| `PUT` | `/api/goods-issues/{id}` | Sửa phiếu DRAFT | ADMIN, MANAGER, STAFF |
| `POST` | `/api/goods-issues/{id}/confirm` | Xác nhận → trừ tồn kho | ADMIN, MANAGER |
| `POST` | `/api/goods-issues/{id}/cancel` | Hủy phiếu DRAFT | ADMIN, MANAGER |
| `POST` | `/api/goods-issues/{id}/reject` | Từ chối phiếu xuất | ADMIN, MANAGER |
| `GET` | `/api/goods-issues/available-locations?itemId=` | Vị trí đang có hàng | ADMIN, MANAGER, STAFF |
| `GET` | `/api/goods-issues/suggest-split?itemId=&quantity=` | Gợi ý phân bổ nhiều vị trí | ADMIN, MANAGER, STAFF |

### Lọc theo người tạo

```
GET /api/goods-issues?userId={userId}
Authorization: Bearer <token>
```

- `userId` (optional): lọc phiếu do user đó tạo.
- `STAFF` chỉ được xem phiếu của chính mình — gửi `userId` khác sẽ bị từ chối (403).
- `ADMIN`, `MANAGER`: có thể xem phiếu của bất kỳ `userId` nào.

---

## 3. Tạo / Cập nhật phiếu nháp

### 3.1 Khái niệm quan trọng: mỗi lô = một dòng chi tiết

Mỗi mã lô (`batchId`) được chọn ở FE = **một dòng chi tiết riêng** trong `details[]`.  
FE có thể bỏ trống `locationId` — BE tự xác định từ lô đã chọn (`batch.receiptDetail.location`).  
Nếu FE gửi `locationId`, giá trị đó được ưu tiên.

### 3.2 Tạo phiếu nháp

**Endpoint:** `POST /api/goods-issues`  
**Quyền:** ADMIN, MANAGER, STAFF

**Request body:**
```json
{
  "docno": "PX-2026-001",
  "doctype": "NORMAL",
  "docDate": "2026-05-05",
  "description": "Xuất hàng đơn đặt hàng #123",
  "customerId": 3,
  "details": [
    {
      "itemId": 5,
      "batchId": 1,
      "quantity": 20,
      "unitprice": 55000
    },
    {
      "itemId": 5,
      "batchId": 2,
      "quantity": 30,
      "unitprice": 55000
    }
  ]
}
```

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `docno` | ❌ | BE tự sinh `PX-01`, `PX-02`, ... nếu không gửi |
| `doctype` | ❌ | Mặc định `NORMAL`; khi có `inventoryAuditId`, BE luôn ghi đè thành `ADJUSTMENT` |
| `docDate` | ❌ | Ngày xuất (yyyy-MM-dd) |
| `description` | ❌ | Ghi chú |
| `customerId` | ❌ | ID khách hàng/đối tượng nhận hàng |
| `details[].itemId` | ✅ | ID hàng hóa |
| `details[].batchId` | Khuyến nghị ✅ | ID mã lô; BE tự xác định `locationId` từ lô nếu không gửi |
| `details[].locationId` | ❌ | ID vị trí (nếu gửi, ưu tiên hơn vị trí của lô) |
| `details[].quantity` | ✅ | Số lượng xuất |
| `details[].unitprice` | ❌ | Đơn giá |

**Validation mã lô (BE thực hiện khi lưu DRAFT):**

| # | Kiểm tra | Lỗi trả về |
|---|----------|-----------|
| 1 | Lô tồn tại | `"Không tìm thấy lô hàng id: {id}"` |
| 2 | Lô thuộc đúng mặt hàng | `"Lô '{batchCode}' không thuộc mặt hàng '{itemCode}'"` |
| 3 | Không trùng `batchId` trong cùng phiếu | `"Phiếu xuất có mã lô bị trùng lặp. Mỗi mã lô chỉ được chọn một lần."` |
| 4 | Số lượng ≤ `quantityRemaining` của lô | `"Số lượng xuất ({qty}) vượt quá tồn khả dụng của lô '{batchCode}' (còn lại: {remaining})"` |

**Response thành công (`200`):**
```json
{
  "success": true,
  "message": "Tạo phiếu xuất thành công",
  "data": {
    "id": 5,
    "docno": "PX-05",
    "docDate": "2026-05-05",
    "description": "Xuất hàng đơn đặt hàng #123",
    "docstatus": "DRAFT",
    "doctype": "NORMAL",
    "customerId": 3,
    "customerName": "Công ty ABC",
    "createdByUsername": "staff01",
    "createdByFullname": "Nhân viên kho",
    "actionByUsername": null,
    "actionByFullname": null,
    "approvedAt": null,
    "rejectReason": null,
    "details": [
      {
        "id": 12,
        "itemId": 5,
        "itemcode": "SP001",
        "itemname": "Sản phẩm A",
        "unitof": "Cái",
        "quantity": 20,
        "unitprice": 55000,
        "amount": 1100000,
        "locationId": 3,
        "locationcode": "A1-01",
        "locationname": "Kệ A1, tầng 1",
        "batchId": 1,
        "batchCode": "SP001-20260415",
        "inventoryAuditDetailId": null
      },
      {
        "id": 13,
        "itemId": 5,
        "itemcode": "SP001",
        "itemname": "Sản phẩm A",
        "unitof": "Cái",
        "quantity": 30,
        "unitprice": 55000,
        "amount": 1650000,
        "locationId": 4,
        "locationcode": "B1-02",
        "locationname": "Kệ B1, tầng 2",
        "batchId": 2,
        "batchCode": "SP001-20260501",
        "inventoryAuditDetailId": null
      }
    ]
  }
}
```

### 3.3 Cập nhật phiếu nháp

**Endpoint:** `PUT /api/goods-issues/{id}`  
**Quyền:** ADMIN, MANAGER, STAFF  
**Điều kiện:** Phiếu phải đang ở trạng thái `DRAFT`.

Request body giống `POST`. BE thay thế toàn bộ `details[]` hiện có.

---

## 4. Xác nhận phiếu xuất

**Endpoint:** `POST /api/goods-issues/{id}/confirm`  
**Quyền:** ADMIN, MANAGER  
**Body:** Không cần body.

**BE thực hiện khi confirm:**
1. Kiểm tra tất cả dòng đã có `locationId`.
2. Kiểm tra `ItemLocation` tại vị trí đó có đủ `quantity`.
3. Kiểm tra `InventoryBalance` tổng không âm sau khi trừ.
4. Trừ `quantity` tại `ItemLocation`; tự động set `isActive = false` khi về 0.
5. Trừ `quantity` tại `InventoryBalance`.
6. Nếu dòng có `batchId`: kiểm tra và trừ `quantityRemaining` của lô tương ứng (xử lý theo từng lô riêng biệt).
7. Set `docstatus = CONFIRMED`.

**Luồng end-to-end:**
```
1. GET  /api/goods-issues/available-locations?itemId=  → lấy vị trí có hàng + batches
2. Người dùng chọn mã lô, nhập số lượng (mỗi lô = 1 dòng trong details[])
3. POST /api/goods-issues         → tạo DRAFT (BE validate batch, xác định locationId)
4. POST /api/goods-issues/{id}/confirm  → confirm
5. GET  /api/goods-issues/{id}    → lấy phiếu đã confirm
```

**Response thành công:**
```json
{
  "success": true,
  "message": "Xác nhận phiếu xuất thành công",
  "data": {
    "id": 5,
    "docno": "PX-05",
    "docstatus": "CONFIRMED",
    "actionByUsername": "manager01",
    "actionByFullname": "Trưởng kho",
    "approvedAt": "2026-05-05T10:30:00",
    "details": [
      {
        "id": 12,
        "itemId": 5,
        "itemcode": "SP001",
        "quantity": 20,
        "locationId": 3,
        "locationcode": "A1-01",
        "batchId": 1,
        "batchCode": "SP001-20260415"
      }
    ]
  }
}
```

**Lỗi có thể trả về:**

| Thông báo | Nguyên nhân |
|-----------|-------------|
| `"Phiếu xuất không có dòng chi tiết nào"` | `details` rỗng |
| `"Không tìm thấy tồn kho của 'SP001' tại vị trí 'A1-01'"` | Không có tồn kho tại vị trí |
| `"Tồn kho tại vị trí 'A1-01' không đủ số lượng để xuất (cần 50, hiện có 20)"` | Tồn tại vị trí không đủ |
| `"Tồn kho tổng của 'SP001' không đủ số lượng để xuất"` | Tồn kho tổng không đủ |
| `"Số lượng của lô 'LITEM00120260506' không đủ để xuất (cần 50, còn lại 30)"` | `quantityRemaining` lô không đủ |

---

## 5. Từ chối phiếu xuất

**Endpoint:** `POST /api/goods-issues/{id}/reject`  
**Quyền:** ADMIN, MANAGER

**Request body:**
```json
{
  "reason": "Đơn hàng bị huỷ"
}
```

BE set `docstatus = REJECTED`, lưu `rejectReason`. Creator (STAFF) nhận thông báo `REJECTED`.

**Response:**
```json
{
  "success": true,
  "message": "Từ chối phiếu xuất thành công",
  "data": {
    "id": 9,
    "docno": "PX-09",
    "docstatus": "REJECTED",
    "rejectReason": "Đơn hàng bị huỷ",
    "actionByUsername": "manager01",
    "actionByFullname": "Trưởng kho",
    "approvedAt": "2026-05-31T10:30:00"
  }
}
```

**Lỗi:**
- `"Phiếu xuất đã ở trạng thái CONFIRMED/CANCELLED/REJECTED, không thể từ chối"`

---

## 6. Hủy phiếu

**Endpoint:** `POST /api/goods-issues/{id}/cancel`  
**Quyền:** ADMIN, MANAGER  
**Điều kiện:** Chỉ phiếu `DRAFT` mới hủy được.  
**Body:** Không cần body.

---

## 7. API hỗ trợ chọn vị trí / lô hàng

### 7.1 Danh sách vị trí đang có hàng

**Endpoint:** `GET /api/goods-issues/available-locations?itemId={id}`

Liệt kê vị trí có `quantity > 0` cho mặt hàng `itemId`, sắp xếp tồn giảm dần.  
Mỗi vị trí trả kèm tất cả hàng đang chứa, danh sách lô với `quantityRemaining`.

**Response:**
```json
[
  {
    "locationId": 3,
    "locationcode": "A1-01",
    "locationname": "Kệ A1, tầng 1",
    "capacity": 100,
    "usedCapacity": 40,
    "remainingCapacity": 60,
    "type": "HAS_STOCK",
    "itemCodes": ["SP001"],
    "items": [
      {
        "itemId": 5,
        "itemcode": "SP001",
        "itemname": "Sản phẩm A",
        "unitof": "Cái",
        "quantity": 40,
        "batchCodes": ["SP001-20260415"],
        "batches": [
          {
            "batchId": 123,
            "batchCode": "SP001-20260415",
            "quantityRemaining": 40,
            "locationId": 3,
            "locationcode": "A1-01"
          }
        ]
      }
    ]
  }
]
```

> **FE sử dụng `batches`** để hiển thị dropdown chọn mã lô và nhập số lượng xuất. Mỗi lô được chọn = một dòng trong `details[]` của request.

> `itemCodes` — danh sách mã vật tư (unique) có mặt tại vị trí, dùng cho UI lọc nhanh.

### 7.2 Gợi ý phân bổ nhiều vị trí

**Endpoint:** `GET /api/goods-issues/suggest-split?itemId={id}&quantity={qty}`

Dùng khi cần xuất số lượng lớn từ nhiều vị trí; ưu tiên vị trí tồn nhiều nhất.

**Response:**
```json
[
  {
    "locationId": 3,
    "locationcode": "A1-01",
    "capacity": 100,
    "currentQuantity": 40,
    "availableSpace": 40,
    "type": "HAS_STOCK",
    "suggestedQuantity": 20
  }
]
```

---

## 8. Phiếu xuất điều chỉnh từ kiểm kê

Khi phiếu kiểm kê trả về `PROCESSED` và có `diffquantity < 0` (thiếu hàng), FE tạo phiếu xuất điều chỉnh.

**Endpoint:** `POST /api/goods-issues`

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
      "quantity": 40,
      "unitprice": 50000,
      "inventoryAuditDetailId": 102
    }
  ]
}
```

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `inventoryAuditId` | ✅ | ID phiếu kiểm kê nguồn; BE tự set `doctype = ADJUSTMENT` |
| `details[].batchId` | ✅ | ID mã lô từ dòng kiểm kê |
| `details[].locationId` | ✅ | Vị trí tồn kho cần điều chỉnh |
| `details[].inventoryAuditDetailId` | ✅ | ID dòng kiểm kê nguồn (chống tạo trùng) |
| `details[].quantity` | ✅ | `Math.abs(diffquantity)` |

> **Lưu ý:** FE không cần gửi `customerId`. BE không kiểm tra sức chứa cho phiếu xuất điều chỉnh, chỉ kiểm tra lô/vị trí/tồn kho hợp lệ.

**Gợi ý FE auto-fill khi tạo từ màn kiểm kê:**
```javascript
const detail = {
  itemId: auditDetail.itemId,
  batchId: auditDetail.batchId,
  locationId: auditDetail.locationId,
  quantity: Math.abs(auditDetail.diffquantity),
  inventoryAuditDetailId: auditDetail.id
};
```

**Validation BE:**

| Lỗi | Nguyên nhân |
|-----|-------------|
| `"Phiếu xuất điều chỉnh phải liên kết chi tiết phiếu kiểm kê"` | Thiếu `inventoryAuditDetailId` |
| `"Chi tiết phiếu kiểm kê không thuộc phiếu kiểm kê đã chọn"` | `inventoryAuditDetailId` không khớp `inventoryAuditId` |
| `"Mã lô không khớp với chi tiết phiếu kiểm kê"` | `batchId` không khớp |
| `"Vị trí không khớp với mã lô"` | `locationId` không khớp lô |
| `"Chi tiết phiếu kiểm kê đã được tạo phiếu điều chỉnh"` | Đã tạo điều chỉnh cho dòng này |

---

## 9. Bảng lỗi thường gặp

| HTTP Status | Thông báo | Xử lý FE |
|-------------|-----------|----------|
| `400` | `"Phiếu xuất không có dòng chi tiết nào"` | Bắt buộc thêm ít nhất 1 dòng |
| `400` | `"Phiếu xuất có mã lô bị trùng lặp..."` | Mỗi lô chỉ chọn 1 lần |
| `400` | `"Số lượng xuất ({qty}) vượt quá tồn khả dụng..."` | Kiểm tra `quantityRemaining` trước khi submit |
| `400` | `"Tồn kho tại vị trí không đủ..."` | Chọn lại vị trí/lô khác |
| `400` | `"Phiếu xuất đã ở trạng thái CONFIRMED..."` | Không cho sửa/hủy phiếu đã xác nhận |
| `401` | — | Token hết hạn → chuyển về trang đăng nhập |
| `403` | — | Không đủ quyền → xóa token cũ, đăng nhập lại |
| `409` | `"Dữ liệu đã tồn tại..."` | Trùng unique (docno, ...) |
| `500` | `"Lỗi hệ thống: <chi tiết>"` | Hiển thị thông báo lỗi chung |

---

*Tài liệu này chỉ bao gồm module **Xuất kho**. Xem [API_NHAP_KHO.md](./API_NHAP_KHO.md) và [API_KIEM_KE.md](./API_KIEM_KE.md) cho các module tương ứng.*
