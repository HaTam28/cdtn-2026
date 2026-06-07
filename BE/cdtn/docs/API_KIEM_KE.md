# API Kiểm Kê – Inventory Audit

> **Base URL:** `http://localhost:8080`  
> **Base path:** `/api/inventory-audits`  
> **Auth:** Mọi request cần header `Authorization: Bearer <token>` (lấy từ `POST /api/auth/login`).

---

## Mục lục

1. [Tổng quan & luồng trạng thái](#1-tổng-quan--luồng-trạng-thái)
2. [Danh sách endpoint](#2-danh-sách-endpoint)
3. [Lấy dữ liệu tồn kho theo lô (chuẩn bị tạo phiếu)](#3-lấy-dữ-liệu-tồn-kho-theo-lô-chuẩn-bị-tạo-phiếu)
4. [Tạo phiếu kiểm kê](#4-tạo-phiếu-kiểm-kê)
5. [STAFF cập nhật kết quả kiểm kê](#5-staff-cập-nhật-kết-quả-kiểm-kê)
6. [STAFF gửi kết quả cho Manager](#6-staff-gửi-kết-quả-cho-manager)
7. [Xác nhận phiếu kiểm kê](#7-xác-nhận-phiếu-kiểm-kê)
8. [Từ chối phiếu kiểm kê](#8-từ-chối-phiếu-kiểm-kê)
9. [Hủy phiếu kiểm kê](#9-hủy-phiếu-kiểm-kê)
10. [Tạo phiếu nhập/xuất điều chỉnh sau kiểm kê](#10-tạo-phiếu-nhậpxuất-điều-chỉnh-sau-kiểm-kê)
11. [Bảng trạng thái & hiển thị FE](#11-bảng-trạng-thái--hiển-thị-fe)
12. [Bảng lỗi thường gặp](#12-bảng-lỗi-thường-gặp)

---

## 1. Tổng quan & luồng trạng thái

### Quy trình chuẩn

```
Manager tạo phiếu → gán STAFF (sendToStaff = true)
  ↓
REQUESTED ──(STAFF cập nhật lần đầu)──► IN_PROGRESS
  ↓
IN_PROGRESS ──(STAFF submit)──► SUBMITTED (diff=0) / PENDING_PROCESS (diff≠0)
  ↓
SUBMITTED / PENDING_PROCESS ──(Manager confirm)──► CONFIRMED / PROCESSED
                            └──(Manager reject) ──► REJECTED
DRAFT ──(Manager cancel)──► CANCELLED
Bất kỳ trạng thái chưa hoàn tất + quá endDate ──► OVERDUE
```

> **Quan trọng:** Manager **không** tự nhập `actualquantity` khi tạo phiếu giao cho STAFF. BE sẽ chặn hành vi này.  
> Quy trình chuẩn: **Manager tạo & gán → STAFF thực hiện & submit → Manager confirm/reject**.

### Trạng thái phiếu

| `docstatus` | Hiển thị FE | Badge | Ý nghĩa |
|-------------|-------------|-------|---------|
| `DRAFT` | Nháp | Xám | Manager lưu nháp (tự nhập, chưa giao STAFF) |
| `REQUESTED` | Đã giao | Vàng | Manager đã giao cho STAFF |
| `IN_PROGRESS` | Đang kiểm kê | Xanh dương | STAFF đã bắt đầu cập nhật |
| `SUBMITTED` | Chờ duyệt | Cam | STAFF gửi, không có chênh lệch |
| `PENDING_PROCESS` | Có chênh lệch | Cam đậm | STAFF gửi, có ít nhất 1 dòng chênh lệch |
| `CONFIRMED` | Đã xác nhận | Xanh | Manager confirm, toàn bộ diff=0 |
| `PROCESSED` | Đã xử lý | Xanh đậm | Manager confirm, có chênh lệch, đã cập nhật InventoryBalance |
| `REJECTED` | Bị từ chối | Đỏ đậm | Manager từ chối |
| `CANCELLED` | Đã hủy | Đỏ | Chỉ hủy được DRAFT |
| `OVERDUE` | Quá hạn | Đỏ | Quá `endDate` và chưa hoàn tất |

> **Khi `CONFIRMED` hoặc `PROCESSED`:** Chỉ `InventoryBalance` (tồn kho tổng) được cập nhật — **`ItemLocation` (tồn theo vị trí) KHÔNG thay đổi**. Nếu cần điều chỉnh tồn theo vị trí, FE tạo phiếu nhập/xuất điều chỉnh (xem mục 10).

---

## 2. Danh sách endpoint

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| `GET` | `/api/inventory-audits` | Danh sách tất cả phiếu kiểm kê | ADMIN, MANAGER, STAFF |
| `GET` | `/api/inventory-audits/{id}` | Chi tiết phiếu kiểm kê | ADMIN, MANAGER, STAFF |
| `GET` | `/api/inventory-audits/stock-rows?itemId=&locationId=` | Tồn kho theo từng mã lô/vị trí (chuẩn bị tạo phiếu) | ADMIN, MANAGER, STAFF |
| `POST` | `/api/inventory-audits` | Tạo phiếu kiểm kê | ADMIN, MANAGER |
| `PUT` | `/api/inventory-audits/{id}` | Sửa phiếu DRAFT (Manager tự nhập) | ADMIN, MANAGER, STAFF |
| `POST` | `/api/inventory-audits/{id}/confirm` | Xác nhận → cập nhật InventoryBalance | ADMIN, MANAGER |
| `POST` | `/api/inventory-audits/{id}/reject` | Từ chối duyệt (kèm lý do) | ADMIN, MANAGER |
| `POST` | `/api/inventory-audits/{id}/cancel` | Hủy phiếu (chỉ DRAFT) | ADMIN, MANAGER |
| `GET` | `/api/inventory-audits/assigned` | Phiếu đang giao cho STAFF đăng nhập (REQUESTED, IN_PROGRESS) | STAFF |
| `GET` | `/api/inventory-audits/assigned/pending` | Alias của `/assigned` | STAFF |
| `GET` | `/api/inventory-audits/assigned/done` | Phiếu STAFF đã làm xong | STAFF |
| `PUT` | `/api/inventory-audits/{id}/assigned` | STAFF cập nhật `actualquantity` | STAFF |
| `POST` | `/api/inventory-audits/{id}/submit` | STAFF gửi kết quả cho Manager | STAFF |

---

## 3. Lấy dữ liệu tồn kho theo lô (chuẩn bị tạo phiếu)

**Endpoint:** `GET /api/inventory-audits/stock-rows?itemId={id}&locationId={id}`

`itemId` và `locationId` đều **optional**. Nếu không gửi, BE trả tất cả dòng tồn theo **vật tư + mã lô + vị trí** (không gộp lô).

FE dùng endpoint này để render bảng danh sách kiểm kê khi tạo phiếu.

**Response:**
```json
{
  "success": true,
  "message": "Lấy dữ liệu kiểm kê theo mã lô thành công",
  "data": [
    {
      "itemId": 5,
      "itemcode": "SP001",
      "itemname": "Sản phẩm A",
      "unitof": "Cái",
      "batchId": 123,
      "batchCode": "SP001-20260415",
      "locationId": 3,
      "locationcode": "A1-01",
      "locationname": "Kệ A1, tầng 1",
      "bookquantity": 100
    },
    {
      "itemId": 5,
      "itemcode": "SP001",
      "itemname": "Sản phẩm A",
      "unitof": "Cái",
      "batchId": 124,
      "batchCode": "SP001-20260501",
      "locationId": 4,
      "locationcode": "B1-02",
      "locationname": "Kệ B1, tầng 2",
      "bookquantity": 50
    }
  ]
}
```

> `bookquantity` trong phiếu kiểm kê là **snapshot tại thời điểm tạo phiếu** — không thay đổi dù tồn thực tế sau đó có biến động.

---

## 4. Tạo phiếu kiểm kê

**Endpoint:** `POST /api/inventory-audits`  
**Quyền:** ADMIN, MANAGER

Có hai chế độ tạo phiếu:

### Chế độ 1 – Manager gán cho STAFF (`sendToStaff = true`) *(Khuyến nghị)*

FE gửi từng dòng snapshot theo `itemId`, `batchId`, `locationId`. **Không gửi `actualquantity`**.  
BE tự lấy `bookquantity` từ `batch.quantityRemaining` tại thời điểm tạo phiếu.

**Request body:**
```json
{
  "docno": "PKK-01",
  "docDate": "2026-05-05",
  "startDate": "2026-05-05",
  "endDate": "2026-05-07",
  "description": "Kiểm kê kho tháng 5",
  "assignedUserId": 12,
  "sendToStaff": true,
  "details": [
    { "itemId": 5, "batchId": 123, "locationId": 3, "description": "Khu vực A" },
    { "itemId": 5, "batchId": 124, "locationId": 4 }
  ]
}
```

→ Kết quả: `docstatus = REQUESTED`, `actualquantity = null`, `diffquantity = null`.

### Chế độ 2 – Manager tự nhập kết quả (`sendToStaff = false` hoặc bỏ trống)

`actualquantity` là **bắt buộc** cho mọi dòng chi tiết. Phiếu sẽ ở trạng thái `DRAFT`.

**Request body:**
```json
{
  "docDate": "2026-05-05",
  "startDate": "2026-05-05",
  "endDate": "2026-05-05",
  "description": "Kiểm kê nhanh",
  "details": [
    { "itemId": 5, "batchId": 123, "locationId": 3, "actualquantity": 95, "description": "Đếm thực tế" },
    { "itemId": 5, "batchId": 124, "locationId": 4, "actualquantity": 30 }
  ]
}
```

→ Kết quả: `docstatus = DRAFT`, `bookquantity` và `diffquantity` đã được BE tính sẵn.

### Bảng trường request

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `docno` | ❌ | BE tự sinh `PKK-01`, `PKK-02`, ... nếu không gửi |
| `docDate` | ❌ | Ngày kiểm kê (yyyy-MM-dd) |
| `startDate` | ❌ | Ngày bắt đầu (yyyy-MM-dd) |
| `endDate` | ❌ | Ngày kết thúc; nếu gửi phải `>= startDate` |
| `description` | ❌ | Ghi chú phiếu |
| `assignedUserId` | ❌ | ID nhân viên được giao |
| `sendToStaff` | ❌ | `true` → gán Staff; `false`/null → Manager tự nhập |
| `details[].itemId` | ✅ | ID hàng hóa |
| `details[].batchId` | Khuyến nghị ✅ | ID mã lô cần kiểm kê |
| `details[].locationId` | Khuyến nghị ✅ | ID vị trí của lô |
| `details[].bookquantity` | ❌ | Fallback nếu không gửi `batchId`; với `batchId`, BE tự snapshot |
| `details[].actualquantity` | ✅ (nếu không giao STAFF) | Số đếm thực tế |
| `details[].description` | ❌ | Ghi chú dòng |

**Response thành công:**
```json
{
  "success": true,
  "message": "Tạo phiếu kiểm kê thành công",
  "data": {
    "id": 1,
    "docno": "PKK-01",
    "docDate": "2026-05-05",
    "startDate": "2026-05-05",
    "endDate": "2026-05-07",
    "description": "Kiểm kê kho tháng 5",
    "docstatus": "REQUESTED",
    "createdAt": "2026-05-05T09:00:00",
    "createdByUsername": "manager01",
    "createdByFullname": "Trưởng kho",
    "assignedToUserId": 12,
    "assignedToUsername": "staff01",
    "assignedToFullname": "Nhân viên kho",
    "auditorUserId": 12,
    "auditorUsername": "staff01",
    "auditorFullname": "Nhân viên kho",
    "approverUserId": null,
    "approverUsername": null,
    "approverFullname": null,
    "modifiedAt": null,
    "modifiedBy": null,
    "rejectReason": null,
    "adjustmentCreated": false,
    "totalBookquantity": 100,
    "totalActualquantity": 0,
    "totalDiffquantity": 0,
    "details": [
      {
        "id": 1,
        "itemId": 5,
        "itemcode": "SP001",
        "itemname": "Sản phẩm A",
        "unitof": "Cái",
        "batchId": 123,
        "batchCode": "SP001-20260415",
        "locationId": 3,
        "locationcode": "A1-01",
        "locationname": "Kệ A1, tầng 1",
        "bookquantity": 100,
        "actualquantity": null,
        "diffquantity": null,
        "processingSuggestion": "Khớp sổ sách",
        "description": "Khu vực A"
      }
    ]
  }
}
```

> `auditor*`: nhân viên thực hiện kiểm kê; nếu không gán STAFF thì là người tạo phiếu.  
> `approver*`: người duyệt, được ghi nhận sau khi confirm/reject.  
> `adjustmentCreated`: `true` nếu đã có phiếu nhập/xuất điều chỉnh từ phiếu này (dùng để ẩn nút tạo điều chỉnh trên FE).

---

## 5. STAFF cập nhật kết quả kiểm kê

**Endpoint:** `PUT /api/inventory-audits/{id}/assigned`  
**Quyền:** STAFF (chỉ STAFF được giao phiếu này)

**Điều kiện:**
- Phiếu ở trạng thái `REQUESTED` hoặc `IN_PROGRESS`.
- Người gọi phải là `assignedUser` của phiếu.

Khi STAFF cập nhật lần đầu, `REQUESTED` tự động chuyển sang `IN_PROGRESS`.

`actualquantity` là **bắt buộc** cho mọi dòng.  
FE nên gửi `details[].id` (lấy từ response chi tiết phiếu); nếu không có `id`, phải gửi đủ `itemId + batchId + locationId`.

**Request body:**
```json
{
  "details": [
    {
      "id": 1,
      "itemId": 5,
      "batchId": 123,
      "locationId": 3,
      "actualquantity": 95,
      "description": "Đếm thực tế"
    },
    {
      "id": 2,
      "itemId": 5,
      "batchId": 124,
      "locationId": 4,
      "actualquantity": 30
    }
  ]
}
```

BE tự tính: `diffquantity = actualquantity - bookquantity` và trả về trong response.

**Validation:**
- Không được thiếu dòng kiểm kê so với snapshot đã tạo.
- `actualquantity` không được âm.
- `batchId` phải tồn tại, thuộc đúng `itemId`, đúng `locationId`.
- BE tự tính lại `diffquantity`, **không dùng giá trị FE gửi**.

**Response:**
```json
{
  "success": true,
  "message": "Cập nhật kết quả kiểm kê thành công",
  "data": {
    "id": 1,
    "docno": "PKK-01",
    "docstatus": "IN_PROGRESS",
    "details": [
      {
        "id": 1,
        "itemId": 5,
        "itemcode": "SP001",
        "bookquantity": 100,
        "actualquantity": 95,
        "diffquantity": -5,
        "processingSuggestion": "Đề xuất phiếu xuất"
      },
      {
        "id": 2,
        "itemId": 5,
        "itemcode": "SP001",
        "bookquantity": 50,
        "actualquantity": 30,
        "diffquantity": -20,
        "processingSuggestion": "Đề xuất phiếu xuất"
      }
    ]
  }
}
```

**`processingSuggestion` mapping:**

| Giá trị | Ý nghĩa |
|---------|---------|
| `"Khớp sổ sách"` | `diffquantity = 0` |
| `"Đề xuất phiếu nhập"` | `diffquantity > 0` (thừa hàng) |
| `"Đề xuất phiếu xuất"` | `diffquantity < 0` (thiếu hàng) |

---

## 6. STAFF gửi kết quả cho Manager

**Endpoint:** `POST /api/inventory-audits/{id}/submit`  
**Quyền:** STAFF (chỉ STAFF được giao phiếu này)  
**Body:** Không cần body.

**Điều kiện:** Phiếu ở `REQUESTED` hoặc `IN_PROGRESS`. Tất cả dòng phải có `actualquantity`.

| Kết quả | `docstatus` sau submit |
|---------|----------------------|
| Toàn bộ `diffquantity = 0` | `SUBMITTED` |
| Có ít nhất 1 `diffquantity ≠ 0` | `PENDING_PROCESS` |

BE tự động gửi thông báo `APPROVAL_REQUIRED` đến Manager/người tạo phiếu.

**Lỗi có thể trả về:**

| Thông báo | Nguyên nhân |
|-----------|-------------|
| `"Chưa nhập số lượng thực tế cho hàng hóa 'SP001'"` | Còn dòng chưa có `actualquantity` |
| `"Phiếu kiểm kê không có dòng chi tiết nào"` | `details` rỗng |
| `"Không được thiếu dòng kiểm kê"` | Thiếu dòng so với snapshot |
| `"Mã lô không thuộc đúng hàng hóa"` | `batchId` không khớp `itemId` |
| `"Mã lô không thuộc đúng vị trí"` | `batchId` không khớp `locationId` |

---

## 7. Xác nhận phiếu kiểm kê

**Endpoint:** `POST /api/inventory-audits/{id}/confirm`  
**Quyền:** ADMIN, MANAGER  
**Body:** Không cần body.

**Điều kiện:** Phiếu ở trạng thái `DRAFT`, `SUBMITTED` hoặc `PENDING_PROCESS`.

**BE thực hiện:**
1. Kiểm tra tất cả dòng đã có `actualquantity`.
2. Với mỗi dòng có `diffquantity ≠ 0`, cập nhật `InventoryBalance` tổng kho:
   - `diff > 0` (thừa): **cộng** tồn kho tổng.
   - `diff < 0` (thiếu): **trừ** tồn kho tổng (lỗi nếu kết quả âm).
3. Ghi nhận `approver` = user đang đăng nhập.

| Kết quả sau confirm | `docstatus` |
|---------------------|-------------|
| Toàn bộ `diffquantity = 0` | `CONFIRMED` |
| Có ít nhất 1 `diffquantity ≠ 0` | `PROCESSED` |

> **FE nên hiển thị bảng `diffquantity` trước khi confirm:**
> - `diff < 0` → đỏ (thiếu hàng)
> - `diff > 0` → xanh (thừa hàng)
> - `diff = 0` → xám (khớp)
>
> **Nếu phiếu trả về `PROCESSED`**: hiển thị gợi ý tạo phiếu nhập/xuất điều chỉnh (xem mục 10).

**Lỗi có thể trả về:**

| Thông báo | Nguyên nhân |
|-----------|-------------|
| `"Chỉ có thể xác nhận phiếu ở trạng thái DRAFT, SUBMITTED hoặc PENDING_PROCESS"` | Sai trạng thái |
| `"Phiếu kiểm kê không có dòng chi tiết nào"` | `details` rỗng |
| `"Chưa nhập số lượng thực tế cho hàng hóa 'SP001'"` | Còn dòng chưa có `actualquantity` |
| `"Tồn kho tổng của 'SP001' không đủ sau kiểm kê (tổng: X, chênh lệch: Y)"` | Tồn kho âm sau khi trừ |

---

## 8. Từ chối phiếu kiểm kê

**Endpoint:** `POST /api/inventory-audits/{id}/reject`  
**Quyền:** ADMIN, MANAGER

**Điều kiện:** Phiếu ở trạng thái `SUBMITTED` hoặc `PENDING_PROCESS`.

**Request body:**
```json
{
  "reason": "Số liệu không khớp, cần kiểm tra lại khu vực A"
}
```

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `reason` | ✅ | Lý do từ chối (không được để trống) |

Response trả về `docstatus = REJECTED` và `rejectReason`. BE tự động gửi thông báo `REJECTED` đến STAFF được giao.

**Lỗi:**
- `"Chỉ có thể từ chối phiếu ở trạng thái SUBMITTED hoặc PENDING_PROCESS"`

---

## 9. Hủy phiếu kiểm kê

**Endpoint:** `POST /api/inventory-audits/{id}/cancel`  
**Quyền:** ADMIN, MANAGER  
**Điều kiện:** Chỉ phiếu `DRAFT` mới hủy được. Không hủy được phiếu đã giao cho STAFF.  
**Body:** Không cần body.

---

## 10. Tạo phiếu nhập/xuất điều chỉnh sau kiểm kê

Sau khi phiếu kiểm kê được confirm (`CONFIRMED` hoặc `PROCESSED`):
- `InventoryBalance` (tồn kho tổng) đã được cập nhật tự động.
- `ItemLocation` (tồn theo từng vị trí) **chưa thay đổi** — nếu cần đồng bộ tồn theo vị trí, FE tạo phiếu nhập/xuất điều chỉnh.

| `diffquantity` | Loại phiếu cần tạo | Endpoint |
|----------------|-------------------|----------|
| `> 0` (thừa hàng) | Phiếu nhập điều chỉnh | `POST /api/goods-receipts` |
| `< 0` (thiếu hàng) | Phiếu xuất điều chỉnh | `POST /api/goods-issues` |
| `= 0` | Không cần tạo phiếu | — |

### Gợi ý hiển thị FE

Sau khi phiếu chuyển sang `PROCESSED`, hiển thị bảng chi tiết với:
- Cột **Chênh lệch** (`diffquantity`):
  - `diff > 0` → badge xanh: "Nhập điều chỉnh +{diff}"
  - `diff < 0` → badge đỏ: "Xuất điều chỉnh {diff}"
  - `diff = 0` → badge xám: "Không cần điều chỉnh"
- Nút **"Tạo phiếu nhập điều chỉnh"** (khi có ít nhất 1 dòng `diff > 0`)
- Nút **"Tạo phiếu xuất điều chỉnh"** (khi có ít nhất 1 dòng `diff < 0`)

> **Ẩn nút sau khi đã tạo:** Kiểm tra `auditResponse.adjustmentCreated === true` (server-side) để ẩn/disable các nút — đây là nguồn đáng tin cậy nhất. Bổ sung `localStorage` để ẩn ngay khi người dùng vừa tạo phiếu (trước khi refresh).

### Auto-fill payload từ kết quả kiểm kê

```javascript
// Tạo phiếu nhập điều chỉnh (diff > 0)
const receiptPayload = {
  docDate: new Date().toISOString().split('T')[0],
  description: `Điều chỉnh từ kiểm kê ${auditDocno}`,
  inventoryAuditId: auditId,
  details: auditDetails
    .filter(d => d.diffquantity > 0)
    .map(d => ({
      itemId: d.itemId,
      batchId: d.batchId,
      locationId: d.locationId,        // chọn vị trí nhận
      quantity: Math.abs(d.diffquantity),
      unitprice: 0,
      inventoryAuditDetailId: d.id
    }))
};

// Tạo phiếu xuất điều chỉnh (diff < 0)
const issuePayload = {
  docDate: new Date().toISOString().split('T')[0],
  description: `Điều chỉnh từ kiểm kê ${auditDocno}`,
  inventoryAuditId: auditId,
  details: auditDetails
    .filter(d => d.diffquantity < 0)
    .map(d => ({
      itemId: d.itemId,
      batchId: d.batchId,
      locationId: d.locationId,
      quantity: Math.abs(d.diffquantity),
      inventoryAuditDetailId: d.id
    }))
};
```

### localStorage flow (bổ trợ)

```javascript
// Sau khi tạo Receipt/Issue điều chỉnh thành công
if (response.status === 200 && response.data?.inventoryAuditId) {
  localStorage.setItem(`audit_adj_receipt_${auditId}`, '1');
  // hoặc audit_adj_issue_${auditId}
}

// Khi hiển thị AuditDetailPage
const serverHidden = auditResponse?.adjustmentCreated === true;
const clientHidden =
  localStorage.getItem(`audit_adj_receipt_${auditId}`) === '1' ||
  localStorage.getItem(`audit_adj_issue_${auditId}`) === '1';
const hideAdjustButton = serverHidden || clientHidden;
```

### Payload mẫu – phiếu nhập điều chỉnh (`diffquantity > 0`)

```json
{
  "docDate": "2026-06-06",
  "description": "Điều chỉnh từ kiểm kê PKK-2026-001",
  "inventoryAuditId": 10,
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

### Payload mẫu – phiếu xuất điều chỉnh (`diffquantity < 0`)

```json
{
  "docDate": "2026-06-06",
  "description": "Điều chỉnh từ kiểm kê PKK-2026-001",
  "inventoryAuditId": 10,
  "details": [
    {
      "itemId": 5,
      "batchId": 22,
      "locationId": 3,
      "quantity": 40,
      "inventoryAuditDetailId": 102
    }
  ]
}
```

---

## 11. Bảng trạng thái & hiển thị FE

### Luồng theo vai trò

**Manager (ADMIN/MANAGER):**
1. Gọi `GET /stock-rows` để lấy danh sách tồn kho theo lô.
2. Tạo phiếu `POST /api/inventory-audits` với `sendToStaff = true`, gán `assignedUserId`.
3. Theo dõi phiếu qua `GET /api/inventory-audits`.
4. Khi nhận thông báo `APPROVAL_REQUIRED`: xem phiếu và `confirm` hoặc `reject`.
5. Nếu phiếu `PROCESSED`: hiển thị bảng chênh lệch, tạo phiếu điều chỉnh nếu cần.

**STAFF:**
1. Vào `GET /api/inventory-audits/assigned` để xem phiếu được giao.
2. Mở phiếu `GET /api/inventory-audits/{id}` để xem danh sách mặt hàng cần kiểm.
3. Nhập `actualquantity` cho từng dòng và gọi `PUT /api/inventory-audits/{id}/assigned`.
4. Khi hoàn tất, gọi `POST /api/inventory-audits/{id}/submit`.
5. Xem phiếu đã làm xong ở `GET /api/inventory-audits/assigned/done`.

### Mapping badge màu cho `diffquantity`

```javascript
const getDiffColor = (diff) => {
  if (diff === null) return 'gray';    // chưa kiểm
  if (diff > 0) return 'green';       // thừa
  if (diff < 0) return 'red';         // thiếu
  return 'gray';                       // khớp
};

const getDiffLabel = (diff) => {
  if (diff === null) return '—';
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
};
```

---

## 12. Bảng lỗi thường gặp

| HTTP Status | Thông báo | Xử lý FE |
|-------------|-----------|----------|
| `400` | `"Phiếu kiểm kê không có dòng chi tiết nào"` | Bắt buộc thêm ít nhất 1 dòng |
| `400` | `"Chưa nhập số lượng thực tế cho hàng hóa 'X'"` | Bắt buộc nhập `actualquantity` trước khi submit/confirm |
| `400` | `"Không được thiếu dòng kiểm kê"` | Gửi đủ tất cả dòng trong snapshot |
| `400` | `"actualquantity không được âm"` | Kiểm tra validate FE trước khi gửi |
| `400` | `"Mã lô không thuộc đúng hàng hóa"` | `batchId` không khớp `itemId` |
| `400` | `"Tồn kho tổng của 'X' không đủ sau kiểm kê"` | Chênh lệch âm vượt tồn kho |
| `400` | `"Chỉ có thể xác nhận phiếu ở trạng thái DRAFT, SUBMITTED hoặc PENDING_PROCESS"` | Sai trạng thái khi confirm |
| `400` | `"Chỉ có thể từ chối phiếu ở trạng thái SUBMITTED hoặc PENDING_PROCESS"` | Sai trạng thái khi reject |
| `401` | — | Token hết hạn → chuyển về trang đăng nhập |
| `403` | — | Không đủ quyền → xóa token cũ, đăng nhập lại |
| `500` | `"Lỗi hệ thống: <chi tiết>"` | Hiển thị thông báo lỗi chung |

---

*Tài liệu này chỉ bao gồm module **Kiểm kê**. Xem [API_NHAP_KHO.md](./API_NHAP_KHO.md) và [API_XUAT_KHO.md](./API_XUAT_KHO.md) cho các module tương ứng.*
