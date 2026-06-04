# API FE DOC CHUẨN
**Tài liệu API cho FE (tóm tắt & hướng dẫn)**

- Mục lục: xem phần 'Mục lục' bên dưới.
- Ghi chú quan trọng: phần chi tiết về `Item` và import CSV/XLSX được gom vào **5. Mặt hàng (Item)** — bao gồm endpoints import, mapping trường, validation và ví dụ curl.
- Default behavior: khi tạo một `Item` (qua API hoặc import), nếu không gửi `minStockLevel` / `maxStockLevel` thì BE sẽ gán mặc định `minStockLevel = 50` và `maxStockLevel = 500`. `PUT` vẫn cho phép cập nhật hai trường này sau khi tạo.

---

## 5. Mặt hàng (Item)

### 5.1 Import danh mục vật tư hàng hóa (CSV / XLSX) — Hợp đồng API cho FE

- Mục đích: FE gửi file CSV hoặc XLSX để BE parse (preview) và/hoặc persist (upsert) danh sách vật tư.

- Endpoints
  - `POST /api/import/items/csv`
    - Content-Type: `multipart/form-data`
    - Form field: `file` — file CSV (UTF-8 encoded), header ở dòng đầu
    - Query param: `preview` (optional, boolean, default `true`)
    - Query param: `sampleSize` (optional, integer) — số lượng sample trả về cho FE. Default `50`. Max `1000`.
  - `POST /api/import/items/xlsx`
    - Content-Type: `multipart/form-data`
    - Form field: `file` — file XLSX (first sheet will be read)
    - Query param: `preview` (optional, boolean, default `true`)
    - Query param: `sampleSize` (optional, integer) — số lượng sample trả về cho FE. Default `50`. Max `1000`.

- Authentication: mọi request đều cần header `Authorization: Bearer <token>` (trừ endpoint auth).

- Preview vs Persist
  - `preview=true` (mặc định): BE chỉ parse file, validate, và trả về kết quả mẫu (không ghi DB).
  - `preview=false`: BE sẽ upsert vào DB (tạo mới nếu không tồn tại, cập nhật nếu đã có `Mã vật tư`).

- Yêu cầu file
  - CSV: UTF-8 encoding bắt buộc.
  - XLSX: đọc sheet đầu tiên; header phải nằm ở dòng đầu của sheet (hoặc dòng đầu không rỗng).

- Danh sách header bắt buộc (có dấu, khuyến nghị chính xác):
  1. `Mã vật tư`
  2. `Tên vật tư hàng hóa`
  3. `Loại vật tư`
  4. `Mô tả/ Thông số kỹ thuật`
  5. `Tên trên hóa đơn`
  6. `Đơn vị tính`
  7. `Tồn tối thiểu`
  8. `Tồn tối đa`

  - FE có thể gửi thêm cột nhưng chỉ những cột khớp (sau normalize nội bộ) mới được parse và trả về trong `sample`.

- Validation chính
  - Bắt buộc: `Mã vật tư` (nếu thiếu -> row error).
  - `Tồn tối thiểu` / `Tồn tối đa` nếu có phải là số nguyên (integer).
  - Các dòng rỗng sẽ bị bỏ qua.

- Lưu ý về default fields
  - Khi tạo item (qua import hoặc API), nếu không có giá trị cho `Tồn tối thiểu` / `Tồn tối đa`, BE sẽ gán mặc định: `minStockLevel = 50`, `maxStockLevel = 500`.
  - FE vẫn có thể cập nhật (`PUT /api/items/{id}`) để thay đổi hai trường này.

- Mappings (keys trả về trong `sample` và DTO):
  - `Mã vật tư` -> `itemCode`
  - `Tên vật tư hàng hóa` -> `itemName`
  - `Loại vật tư` -> `itemType`
  - `Mô tả/ Thông số kỹ thuật` -> `description`
  - `Tên trên hóa đơn` -> `invoiceName`
  - `Đơn vị tính` -> `unitOf`
  - `Tồn tối thiểu` -> `minStockLevel`
  - `Tồn tối đa` -> `maxStockLevel`

- Response (200) — shape

```json
{
  "total": 12,
  "created": 8,
  "updated": 4,
  "errors": [ { "rowIndex": 3, "messages": ["Missing required field: Mã vật tư"] } ],
  "sample": [
    { "itemCode": "A001", "itemName": "Bút bi" , "unitOf": "Cái" },
    { "itemCode": "A002", "itemName": "Tập vở", "minStockLevel": 10 }
  ]

 - `sample` là `List<Map<String,Object>>` và mỗi object chỉ chứa các key tương ứng những header thực sự xuất hiện trong file (`presentFields`). Không có các key có giá trị null.

- HTTP error codes
  - `400 Bad Request` — file thiếu, sai format, hoặc validation lỗi (ví dụ: header không đúng hoặc thiếu `Mã vật tư`).
  - `401 Unauthorized` — thiếu/không hợp lệ JWT.
  - `403 Forbidden` — user không có quyền import.
  - `500 Internal Server Error` — lỗi server (IO, DB...)

- Ví dụ curl
```bash
curl -X POST "http://localhost:8080/api/import/items/csv?preview=true&sampleSize=50" \
  -F "file=@/path/to/items.csv;type=text/csv"
```
Persist CSV (upsert):
```bash
curl -X POST "http://localhost:8080/api/import/items/csv?preview=false&sampleSize=50" \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/items.csv;type=text/csv"
```

Preview XLSX:
```bash
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/items.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```
Persist XLSX:
```bash
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/items.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```

---
- Vì dữ liệu là tiếng Việt, các *header* và các giá trị quan trọng (như `Mã vật tư`) phải giữ dấu (ví dụ: **"Mã vật tư"**, **"Tên hàng"**) — không dùng phiên bản không dấu (ví dụ **"Ma vat tu"**).
- FE phải gửi file ở encoding **UTF-8** để đảm bảo dấu được truyền đúng.
- Ví dụ: đúng = `Mã vật tư`; sai = `Ma vat tu` — nếu header không có dấu, hệ thống có thể không map được vào trường `itemCode` và sẽ báo lỗi dòng thiếu `itemCode`.
**Validation rules (recommended)**
- Bắt buộc: `itemcode` (không rỗng). Nếu thiếu -> row error.
- `minstocklevel` phải là integer nếu có giá trị.
- `itemcode` phải là duy nhất: kiểm tra tồn tại trong DB trước khi insert. Quy tắc: nếu `itemcode` tồn tại => cập nhật record (upsert) hoặc báo lỗi tuỳ cấu hình.
- Loại/ĐVT/Danh mục: hiện hệ thống lưu free-text (`unitof`, `itemcatg` là chuỗi). Nếu muốn mapping sang reference table, cần bổ sung kiểm tra tồn tại.
- Bỏ qua dòng rỗng.

**Behavior & Responses**
- Preview mode (khuyến nghị): endpoint hỗ trợ `?preview=true` để chỉ parse và trả về danh sách rows + lỗi, không lưu.
- Kết quả trả về nên bao gồm: tổng dòng, số dòng ghi thành công, số dòng cập nhật, danh sách lỗi theo row (index + message), sample of parsed DTOs.

**Readiness check (hiện trạng code)**
  - `XlsxImportService` implemented: [src/main/java/hoshimoto/cdtn/service/XlsxImportService.java](src/main/java/hoshimoto/cdtn/service/XlsxImportService.java) — streaming XLSX read.
- DTOs: `ImportItemDto`, `ImportResult`, `RowError` exist: [src/main/java/hoshimoto/cdtn/dto/](src/main/java/hoshimoto/cdtn/dto/).
- Controller: `ImportController` implemented with endpoints `/api/import/items/csv` and `/api/import/items/xlsx` (supports `preview` param). See [src/main/java/hoshimoto/cdtn/controller/ImportController.java](src/main/java/hoshimoto/cdtn/controller/ImportController.java).
- Import pipeline: `ImportService` implemented — validates required `itemCode`, supports `preview=true`, performs upsert (create/update) within a transaction. See [src/main/java/hoshimoto/cdtn/service/ImportService.java](src/main/java/hoshimoto/cdtn/service/ImportService.java).

Status: basic import flow (parse -> validate minimal -> upsert) is implemented and the application builds and runs locally. The endpoint is usable for manual imports. See "How to use" below.

**Gaps / next hardening steps**
1. Improve validation: currently only `itemCode` required and `minStockLevel` numeric checked — add stricter header validation, length checks, allowed values for `itemtype` if any.
2. Integration tests: add MockMvc/embedded DB tests that upload sample CSV/XLSX and assert DB changes.
3. Large-file handling: configure max file size, chunking or background job for very large imports.
4. Error reporting UX: include CSV/XLSX cell coordinate in errors, and provide downloadable error report.
5. Security & auditing: record operator user who performed import, and restrict endpoint to users with import permission.

Completed: controller and import service are implemented in the codebase.

Recommended next steps to harden for production:
- Add integration tests (MockMvc + H2) to verify end-to-end import, preview, and upsert behavior.
- Add OpenAPI/Swagger annotations on `ImportController` for FE documentation.
- Add file size limits in `application.properties` (`spring.servlet.multipart.max-file-size`, `max-request-size`) and reject too-large files.
- Implement background job/queue for heavy imports (e.g., >50k rows), expose import-job status endpoints.
- Add audit log: who imported, when, filename, and error report storage.

If you want, I can implement OpenAPI annotations and an example integration test next.

---

## How to use (examples)
curl -v -F "file=@items.csv" "http://localhost:8080/api/import/items/csv?preview=true" \
```bash
```
3) Preview XLSX:


Response (200) example:

```json
{
  "total": 12,
  "created": 8,
  "updated": 4,
  "errors": [ { "rowIndex": 3, "message": "Missing required itemCode" } ],
- `400 Bad Request` — invalid file / missing multipart field / preview parse errors.
- `403 Forbidden` — user lacks import permission.
- `500 Internal Server Error` — unexpected server error (DB, IO, or constraint violation).

## Prerequisites & quick checks before running import
- Ensure DB is reachable and migrations applied (table `item` exists). `itemcode` has unique constraint.
- Ensure `application.properties` contains DB connection and `spring.servlet.multipart.max-file-size` configured.
- Ensure the user calling the endpoint has appropriate role (token present). For local testing you can disable security or use generated dev password.
- Run `mvn -DskipTests package` then `mvn spring-boot:run` to start the app.

## Quick verification steps
1. Start app locally.
2. Call `/api/import/items/csv?preview=true` with a small sample CSV — expect parsed rows and no DB changes.
3. Call `/api/import/items/csv` to persist — check DB table `item` for created/updated rows.

---

If you want, I can implement the controller + import pipeline and tests next. Reply "Tiếp tục implement" (or choose specific steps).

> URL cơ sở: `http://localhost:8080`

## Tổng quan

- Dữ liệu gửi/nhận dạng JSON.
- FE cần kiểm tra các trường bắt buộc trước khi gửi.
- Các trường thời gian (`createdAt`, `modifiedAt`) thường do BE sinh tự động.
- Tất cả API yêu cầu JWT token trong header `Authorization: Bearer <token>` trừ các endpoint auth.
- Cấu trúc response chung:
```json
{
```

1. [Ràng buộc chung](#1-ràng-buộc-chung)
2. [Xác thực](#2-authentication)
3. [Người dùng](#3-user)
5. [Mặt hàng](#5-item)
6. [Vị trí](#6-location)
7. [Goods Receipt – Nhập kho](#7-goods-receipt--nhập-kho)
8. [Goods Issue – Xuất kho](#8-goods-issue--xuất-kho)
9. [Inventory Audit – Kiểm kê](#9-inventory-audit--kiểm-kê)
10. [Batch – Lô hàng](#10-batch--lô-hàng)
11. [Lưu ý chung cho FE](#11-lưu-ý-chung-cho-fe)
12. [Thông báo](#12-notifications--thông-báo)

---

## 1. Ràng buộc chung

### Trường bắt buộc khi tạo/sửa

| Module | Bắt buộc |
|--------|----------|
| Customer | `customercode`, `customername`, ít nhất 1 trong `issupplier` / `iscustomer` phải `true` |
| Item | `itemcode`, `itemname`, `unitof`, `itemtype`, `isActive` |
| Location | `locationcode`, `locationname`, `isActive` |
| User | `usercode`, `fullname`, `username`, `password` (khi tạo mới), `role`, `isActive` |
| GoodsReceipt | `doctype`, mỗi detail cần `itemId`, `quantity` ( `docno` do BE tự sinh nếu không gửi ) |
| GoodsIssue | mỗi detail cần `itemId`, `quantity`, `locationId` ( `docno` do BE tự sinh nếu không gửi ) |
| InventoryAudit | mỗi detail cần `itemId` (số thực tế chỉ bắt buộc khi STAFF cập nhật) ( `docno` do BE tự sinh nếu không gửi ) |
| Batch | `itemId`, `receiptDetailId`, `unitCost`, `quantity` |

### Unique

- Customer: `customercode`, `email`
- Item: `itemcode`, `barcode`
- Location: `locationcode`
- User: `usercode`, `username`, `email`
- GoodsReceipt / GoodsIssue / InventoryAudit: `docno`
- Batch: `batchCode` (BE tự sinh, FE không gửi)

---

**Changelog (backend):**
- Thêm cột `rejectreason` (TEXT) cho bảng `goodsreceipt` và `goodsissue` trong migration: `src/main/resources/db/migration/V6__add_rejectreason_to_receipt_and_issue.sql`.
- Response DTOs `GoodsReceiptResponse` và `GoodsIssueResponse` hiện có trường `rejectReason` (string). FE có thể hiển thị lý do từ chối khi `docstatus = REJECTED`.


### Ràng buộc logic

- Customer: nếu `iscustomer=false` thì phải có `issupplier=true`, và ngược lại.
- User: `role` chỉ nhận `ADMIN`, `MANAGER` hoặc `STAFF`. Quy tắc tạo: **ADMIN** có thể tạo `MANAGER` hoặc `STAFF` (không tạo được `ADMIN`); **MANAGER** chỉ tạo được `STAFF`.
- Phiếu nhập/xuất/kiểm kê: chỉ `DRAFT` mới được sửa hoặc hủy khi chưa gửi/đã xác nhận; không thể sửa sau khi `CONFIRMED` hoặc `CANCELLED`.
- Quy trình kiểm kê (mới): Manager **gán** phiếu cho `STAFF` → `REQUESTED`. Staff cập nhật lần đầu → `IN_PROGRESS`. Staff **gửi** → `SUBMITTED` (không chênh lệch) hoặc `PENDING_PROCESS` (có chênh lệch). Manager `confirm` → **`CONFIRMED`** (không chênh lệch) hoặc **`PROCESSED`** (có chênh lệch, đã cập nhật `InventoryBalance`); Manager `reject` → `REJECTED`; `cancel` → chỉ DRAFT.
- Trạng thái phiếu kiểm kê (`docstatus`): `DRAFT` → `REQUESTED` → `IN_PROGRESS` → `SUBMITTED` / `PENDING_PROCESS` → `CONFIRMED` / `PROCESSED` / `REJECTED` / `CANCELLED`.

### Ngày giờ

- FE không cần gửi `createdAt`, `batchCode`, `nameBatch`, `quantityRemaining`; BE tự sinh.
- Định dạng ngày: `yyyy-MM-dd` (ví dụ: `"2026-05-05"`).
- Định dạng datetime: ISO 8601 (ví dụ: `"2026-05-05T08:30:00"`).

---

## 2. Xác thực

### 2.1 Đăng nhập

**Endpoint:** `POST /api/auth/login`

**Request body:**
```json
{
  "username": "admin",
  "password": "your_password"
}
```

**Response thành công:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "id": 1,
    "usercode": "admin01",
    "fullname": "Admin hệ thống",
    "username": "admin",
    "email": "admin@example.com",
    "department": "KHO",
    "role": "ADMIN",
    "isActive": true
  }
}
```

> FE lưu `token` vào localStorage/sessionStorage và gửi kèm header `Authorization: Bearer <token>` với mọi request tiếp theo. Token chứa `role` của người dùng — nếu nhận 403 sau khi server cập nhật, **xóa token cũ và đăng nhập lại** để lấy token mới.

---

### 2.2 Đăng ký

**Endpoint:** `POST /api/auth/register`

**Request body:**
```json
{
  "usercode": "admin01",
  "fullname": "Admin hệ thống",
  "username": "admin",
  "email": "admin@example.com",
  "password": "your_password",
  "department": "KHO"
}
```

---

### 2.3 Quên mật khẩu

**Endpoint:** `POST /api/auth/forgot-password`

**Request body:**
```json
{
  "username": "admin",
  "email": "admin@example.com"
}
```

Sau khi gọi endpoint này, BE sẽ tạo mã OTP (6 chữ số), lưu vào DB với TTL 5 phút và gửi mã OTP vào email đã cung cấp.
FE hiển thị màn hình nhập mã OTP và mật khẩu mới.

Thay đổi luồng (xác minh trước rồi mới cập nhật):
- FE gọi `POST /api/auth/forgot-password` để yêu cầu gửi mã OTP.
- FE hiển thị form nhập `OTP` và gọi `POST /api/auth/verify-otp` với payload `{ username, otp }`.
- Nếu xác minh thành công, FE cho phép người dùng nhập mật khẩu mới và gọi `POST /api/auth/update-password` với payload `{ username, newPassword }` (không cần gửi `otp` trong bước này).

Detailed behavior:
- If `username` and `email` match an existing user, server: 1) deletes any previous tokens for that user, 2) generates a 6-digit numeric OTP, 3) saves it in `password_reset_tokens` with `expiresAt = now + 5 minutes`, 4) sends an email containing the OTP to the provided `email`, 5) returns `200 OK` with a success message.
- If user not found or email mismatch, server returns `400 Bad Request` with message `"Tài khoản hoặc email không đúng"`.
- If email sending fails (SMTP misconfiguration or provider error), server returns `500 Internal Server Error` (or `400` depending on implementation) — FE should surface a friendly error and offer retry.

Success response (200):
```json
{
  "success": true,
  "message": "Mã OTP đã được gửi tới email, có hiệu lực 5 phút",
  "data": null
}
```

Error examples:
- `404 Not Found` — user/email không khớp:
```json
{ "success": false, "message": "Tài khoản hoặc email không đúng", "data": null }
```
- `500 Internal Server Error` — lỗi gửi email:
```json
{ "success": false, "message": "Không thể gửi email. Vui lòng thử lại sau.", "data": null }
```

Hướng dẫn FE cho `forgot-password`:
- Kiểm tra bắt buộc và định dạng của `username` và `email` trước khi gọi API.
- Sau khi gọi thành công, hiển thị form gồm: `OTP (6 chữ số)`, `Mật khẩu mới`, `Xác nhận mật khẩu`.
- Thêm nút "Gửi lại mã" gọi lại `forgot-password` và vô hiệu hóa trong 60s để tránh lạm dụng.


---

### 2.4 Cập nhật mật khẩu mới

**Endpoint:** `POST /api/auth/update-password`

**Request body:**
```json
{
  "username": "admin",
  "newPassword": "your_new_password"
}
```

FE must first verify OTP via `POST /api/auth/verify-otp` before calling this endpoint. `update-password` will only succeed if a previously-verified, un-used OTP exists for the user and has not expired.

Detailed behavior:
- Server verifies there exists a previously-verified, unused token for the given `username` and that `expiresAt` &gt; now.
 - Before consuming the OTP, the server validates the `newPassword` meets complexity rules. The token is only marked `used` after the password has been successfully validated, encoded and saved.
 - If password validation fails (e.g., too short, missing character classes), the token remains un-consumed so the user can retry with a stronger password within the token TTL.
 - If valid and password saved successfully: server marks the token used and returns `200 OK`.
 - If token missing/expired/unused or username invalid: server returns `400 Bad Request` with a clear error message.

Success response (200):
```json
{
  "success": true,
  "message": "Cập nhật mật khẩu thành công",
  "data": null
}
```

Error examples:
- `400 Bad Request` — OTP không hợp lệ hoặc đã hết hạn:
```json
{ "success": false, "message": "OTP không hợp lệ hoặc đã hết hạn", "data": null }
```
- `400 Bad Request` — user không tồn tại / lỗi cập nhật:
```json
{ "success": false, "message": "Tài khoản không hợp lệ hoặc lỗi cập nhật", "data": null }
```
 - `400 Bad Request` — mật khẩu không đạt yêu cầu (ví dụ: độ dài < 8 hoặc thiếu chữ hoa/chữ thường/số):
```json
{ "success": false, "message": "Mật khẩu không đạt yêu cầu", "data": null }
```

FE guidance for `update-password`:
- Validate `newPassword` meets complexity rules (same rules as registration if any) and `confirm password` matches.
- Ensure the user has already verified the OTP via `POST /api/auth/verify-otp` before calling this endpoint.
- Send `username` and `newPassword` to this endpoint (no `otp` field required).
- On `OTP không hợp lệ hoặc đã hết hạn` errors, prompt the user to request a new OTP by calling `forgot-password` again.
- After success, redirect user to login page and show a success toast.

Lưu ý bảo mật:
- OTP is numeric and expires after 5 minutes; treat it as one-time use and delete after successful use.
- Implement server-side rate-limiting for `forgot-password` to mitigate abuse (e.g., max 3 requests per hour per account/IP).
- Ensure SMTP credentials are stored securely and that `spring.mail.*` properties are set in `application.properties` or environment variables.

Ví dụ & mẫu cho FE
----------------------

1) Ví dụ nhanh `curl`

- Request OTP (forgot-password):

```bash
curl -X POST http://localhost:8080/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@example.com"}'
```

- Verify OTP and submit new password:

```bash
curl -X POST http://localhost:8080/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","otp":"123456"}'

curl -X POST http://localhost:8080/api/auth/update-password \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","newPassword":"NewP@ssw0rd"}'
```

2) Ví dụ JavaScript `fetch` (frontend)

- Request OTP:

```javascript
await fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, email })
});
```

- Verify OTP:

```javascript
await fetch('/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, otp })
});
```

- Submit new password:

```javascript
const res = await fetch('/api/auth/update-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, newPassword })
});
const body = await res.json();
if (!res.ok) throw new Error(body.message || 'Update failed');
```

3) Ví dụ Axios:

```javascript
import axios from 'axios';

await axios.post('/api/auth/forgot-password', { username, email });

// verify OTP first
await axios.post('/api/auth/verify-otp', { username, otp });

await axios.post('/api/auth/update-password', { username, newPassword });
```

4) Gợi ý luồng UI cho FE

- Screen A: "Quên mật khẩu" — collect `username` and `email`.
- On success: show Screen B with inputs: `OTP (6 chữ số)`, `Mật khẩu mới`, `Xác nhận mật khẩu`.
- Provide a "Gửi lại mã" button that calls `forgot-password` again and is disabled for 60 seconds.
- Show clear inline errors for `OTP không hợp lệ hoặc đã hết hạn` and an action to request a new OTP.
- After successful `update-password`, redirect to login page and show success notification.

5) Bảng ánh xạ lỗi cho FE

- `200 OK` — success flows (OTP sent, password updated).
- `400 Bad Request` — invalid input, OTP invalid/expired, or user not found when updating password.
- `404 Not Found` — username/email mismatch when requesting OTP.
- `429 Too Many Requests` — (recommended) triggered when rate limit exceeded for `forgot-password` (implement server-side).
- `500 Internal Server Error` — email sending failure or unexpected server error.

When presenting errors to users, show user-friendly messages and avoid leaking internal details.


---

## 3. Người dùng

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/users` | Danh sách người dùng | ADMIN, MANAGER, STAFF |
| GET | `/api/users/{id}` | Chi tiết người dùng | ADMIN, MANAGER |
| POST | `/api/users` | Tạo người dùng | ADMIN, MANAGER |
| PUT | `/api/users/{id}` | Cập nhật người dùng | ADMIN, MANAGER |
| DELETE | `/api/users/{id}` | Vô hiệu hóa người dùng | ADMIN, MANAGER |

### Quy tắc phân quyền tạo / sửa / xóa tài khoản

> **QUAN TRỌNG — FE cần ẩn/hiện trường `role` và validate trước khi gửi request.**

#### Tạo tài khoản (`POST /api/users`)

| Người thực hiện | `role` được phép gửi | Ghi chú |
|-----------------|----------------------|---------|
| **ADMIN** | `MANAGER`, `STAFF` | Không được tạo tài khoản `ADMIN` khác |
| **MANAGER** | `STAFF` | Chỉ tạo được nhân viên cấp dưới |

- Nếu FE gửi sai `role` (vd. MANAGER gửi `role: "MANAGER"`), BE trả về `400` với message `"MANAGER chỉ được tạo tài khoản STAFF"`.
- Nếu ADMIN gửi `role: "ADMIN"`, BE trả về `400` với message `"Không thể tạo tài khoản ADMIN"`.

#### Cập nhật tài khoản (`PUT /api/users/{id}`)

| Người thực hiện | Được sửa tài khoản nào | `role` được phép thay đổi thành |
|-----------------|------------------------|----------------------------------|
| **ADMIN** | Bất kỳ | `MANAGER`, `STAFF` (không đổi thành `ADMIN`) |
| **MANAGER** | Chỉ tài khoản `STAFF` | Chỉ `STAFF` |

- MANAGER **không** được sửa tài khoản có role `MANAGER` hoặc `ADMIN` → BE trả `400`.
- MANAGER **không** được nâng role lên `MANAGER`/`ADMIN` → BE trả `400`.

#### Vô hiệu hóa tài khoản (`DELETE /api/users/{id}`)

| Người thực hiện | Được vô hiệu hóa tài khoản nào |
|-----------------|----------------------------------|
| **ADMIN** | Bất kỳ |
| **MANAGER** | Chỉ tài khoản `STAFF` |

- MANAGER cố vô hiệu hóa tài khoản `MANAGER`/`ADMIN` → BE trả `400`.
- Đây là **soft delete** (`isActive = false`), tài khoản không bị xóa khỏi DB.

### 3.1 Tạo người dùng

**Endpoint:** `POST /api/users`  
**Header:** `Authorization: Bearer <token>`

**Request body:**
```json
{
  "usercode": "staff01",
  "fullname": "Nhân viên kho",
  "username": "staff01",
  "email": "staff01@company.com",
  "password": "your_password",
  "department": "KHO",
  "phoneNumber": "0901234567",
  "address": "123 Đường A",
  "gender": "Nam",
  "birthdate": "1990-05-20",
  "bankaccount": "1234567890",
  "bankname": "Vietcombank",
  "role": "STAFF",
  "isActive": true
}
```

> - `password`: bắt buộc khi tạo mới, tùy chọn khi cập nhật.
> - `role`: FE chỉ hiển thị các lựa chọn phù hợp với quyền của người dùng hiện tại (ADMIN thấy `MANAGER`/`STAFF`; MANAGER chỉ thấy `STAFF`).
> - `usercode`, `username`, `email` phải unique trong hệ thống.

**Response thành công (`200`):**
```json
{
  "success": true,
  "message": "Tạo mới nhân viên thành công",
  "data": {
    "id": 5,
    "usercode": "staff01",
    "fullname": "Nhân viên kho",
    "username": "staff01",
    "email": "staff01@company.com",
    "department": "KHO",
    "role": "STAFF",
    "birthdate": "1990-05-20",
    "isActive": true
  }
}
```

**Response lỗi phân quyền (`400`):**
```json
{
  "success": false,
  "message": "MANAGER chỉ được tạo tài khoản STAFF",
  "data": null
}
```

### 3.2 Cập nhật người dùng

**Endpoint:** `PUT /api/users/{id}`  
**Header:** `Authorization: Bearer <token>`

> Gửi chỉ các trường cần cập nhật. Bỏ qua `password` nếu không đổi mật khẩu.

**Request body (ví dụ):**
```json
{
  "fullname": "Nhân viên kho mới",
  "department": "KHO2",
  "birthdate": "1990-05-20",
  "isActive": true
}
```

> Lưu ý về `birthdate`:
>- BE hiện cho phép FE gửi trường `birthdate` khi tạo/cập nhật người dùng. Trường này là chuỗi và chấp nhận định dạng `yyyy-MM-dd` (ví dụ `1990-05-20`) hoặc ISO datetime (ví dụ `1990-05-20T00:00:00`).
>- Trước đây `birthdate` bị auto-set — hiện đã sửa để BE không tự gán ngày hiện tại nữa; FE phải cung cấp ngày sinh nếu muốn lưu.
>- Nếu định dạng không hợp lệ, BE trả `400 Bad Request` với message dạng: `birthdate không hợp lệ. Dùng định dạng yyyy-MM-dd hoặc ISO datetime`.

### 3.3 Vô hiệu hóa người dùng

**Endpoint:** `DELETE /api/users/{id}`  
**Header:** `Authorization: Bearer <token>`

> Không xóa thật — chỉ set `isActive = false`.

**Response thành công:**
```json
{
  "success": true,
  "message": "Vô hiệu hóa nhân viên thành công",
  "data": null
}
```

---

## 4. Customer

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/customers` | Danh sách khách hàng | ADMIN, MANAGER, STAFF |
| GET | `/api/customers/{id}` | Chi tiết khách hàng | ADMIN, MANAGER, STAFF |
| POST | `/api/customers` | Tạo mới | ADMIN, MANAGER, STAFF |
| PUT | `/api/customers/{id}` | Cập nhật | ADMIN, MANAGER, STAFF |
| DELETE | `/api/customers/{id}` | Xóa | ADMIN, MANAGER |

**Request body:**
```json
{
  "customercode": "CUST001",
  "customername": "Công ty ABC",
  "address": "123 Đường A, Quận B, TP.C",
  "email": "abc@company.com",
  "mobile": "0901234567",
  "partnername": "Nguyễn Văn A",
  "partnermobile": "0912345678",
  "ownername": "Trần Thị B",
  "taxcode": "123456789",
  "itemcatg": "Khách hàng",
  "bankaccount": "1234567890",
  "bankname": "Vietcombank",
  "issupplier": false,
  "iscustomer": true,
  "isActive": true
}
```

---

## 5. Item

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/items` | Danh sách hàng hóa | ADMIN, MANAGER, STAFF |
| GET | `/api/items/{id}` | Chi tiết hàng hóa | ADMIN, MANAGER, STAFF |
| POST | `/api/items` | Tạo mới | ADMIN, MANAGER, STAFF |
| PUT | `/api/items/{id}` | Cập nhật | ADMIN, MANAGER, STAFF |
| DELETE | `/api/items/{id}` | Xóa | ADMIN, MANAGER |

**Request body:**
```json
{
  "itemcode": "SP002",
  "barcode": "8938505970022",
  "itemname": "Sản phẩm B",
  "invoicename": "Sản phẩm B hóa đơn",
  "description": "Mô tả sản phẩm B",
  "itemtype": "Vật tư",
  "unitof": "Cái",
  "itemcatg": "Thiết bị",
  "minstocklevel": 5,
  "maxstocklevel": 20,
  "isActive": true
}
```

**Validation for stock levels**
- `minstocklevel` and `maxstocklevel` must be integers if provided and should be >= 0.
- If both are present, FE should ensure `maxstocklevel >= minstocklevel` to avoid logical inconsistency; BE will validate and return `400` on violation.

**Response fields**
- `currentStock`: tồn hiện tại của vật tư, lấy từ `InventoryBalance`.
- `minstocklevel`: tồn tối thiểu.
- `maxstocklevel`: tồn tối đa.

Response: `GET /api/items` and `GET /api/items/{id}` will include `currentStock`, `minstocklevel`, and `maxstocklevel` in the returned `ItemResponse`.

**Ví dụ (một phần tử trong `GET /api/items`):**
```json
{
  "id": 5,
  "itemcode": "SP001",
  "itemname": "Sản phẩm A",
  "unitof": "Cái",
  "currentStock": 120.00,
  "minstocklevel": 10,
  "maxstocklevel": 500,
  "isActive": true
}
```

---

## 6. Location

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/locations` | Danh sách vị trí | ADMIN, MANAGER, STAFF |
| GET | `/api/locations/{id}` | Chi tiết vị trí | ADMIN, MANAGER, STAFF |
| GET | `/api/locations/{id}/items` | Vị trí + danh sách hàng hóa đang chứa | ADMIN, MANAGER, STAFF |
| POST | `/api/locations` | Tạo mới | ADMIN, MANAGER, STAFF |
| PUT | `/api/locations/{id}` | Cập nhật | ADMIN, MANAGER, STAFF |
| DELETE | `/api/locations/{id}` | Xóa | ADMIN, MANAGER |

**Request body:**
```json
{
  "locationcode": "A1-01",
  "locationname": "Kệ A1, tầng 1, cột 1",
  "rackno": "A1",
  "floorno": "1",
  "columnno": "1",
  "capacity": 100,
  "description": "Kệ tầng 1, sức chứa 100",
  "isActive": true
}
```

> `capacity = null`: vị trí không giới hạn sức chứa.

**Response fields (LocationResponse)**
- `id`: ID vị trí.
- `locationcode`: Mã vị trí hiển thị (unique).
- `locationname`: Tên vị trí.
- `rackno`, `floorno`, `columnno`: Thông tin vị trí vật lý.
- `capacity`: Sức chứa (Integer). `null` = không giới hạn.
- `usedCapacity`: (BigDecimal) Tổng số lượng đang chiếm tại vị trí (tính từ `ItemLocation`).
- `remainingCapacity`: (BigDecimal) `capacity - usedCapacity`, `null` nếu `capacity = null`.
- `description`: Mô tả tự do.
- `isActive`: `true` nếu vị trí đang kích hoạt.
- `createdAt`, `modifiedAt`: chuỗi ISO datetime (ví dụ `2026-05-05T10:00:00`).
- `modifiedBy`: username người sửa cuối.

**Example: `GET /api/locations` (list)**
```json
{
  "success": true,
  "message": "Lấy danh sách vị trí thành công",
  "data": [
    {
      "id": 3,
      "locationcode": "A1-01",
      "locationname": "Kệ A1, tầng 1, cột 1",
      "rackno": "A1",
      "floorno": "1",
      "columnno": "1",
      "capacity": 100,
      "usedCapacity": 40,
      "remainingCapacity": 60,
      "description": "Kệ tầng 1, sức chứa 100",
      "isActive": true,
      "createdAt": "2026-05-05T08:30:00",
      "modifiedAt": "2026-05-05T09:00:00",
      "modifiedBy": "admin"
    }
  ]
}
```

**Example: `POST /api/locations` / `PUT /api/locations/{id}` (response)**
```json
{
  "success": true,
  "message": "Tạo mới vị trí thành công",
  "data": {
    "id": 10,
    "locationcode": "B2-01",
    "locationname": "Kệ B2, tầng 1",
    "capacity": null,
    "usedCapacity": 0,
    "remainingCapacity": null,
    "isActive": true,
    "createdAt": "2026-05-06T11:00:00",
    "modifiedAt": null,
    "modifiedBy": null
  }
}
```

**Notes:**
- Deleting a location via `DELETE /api/locations/{id}` only sets `isActive = false` (soft delete).
- `usedCapacity` is calculated on demand by the service; FE can rely on it for UI capacity checks but should still respect server-side capacity validation when confirming receipts.


## 6. Location

**Ghi chú FE:** khi cần dữ liệu *theo lô* cho một vị trí (mã lô, quantityRemaining, ...) ưu tiên gọi `GET /api/batches/by-location?locationId={id}`; dùng `GET /api/locations/{id}/items` cho trường hợp UI cần hiển thị nhanh danh sách hiện có (note: `locations/{id}/items` trả ra các dòng theo batch khi có nhiều lô cho cùng mã hàng).

### 6.1 Chi tiết vị trí kèm danh sách hàng hóa

**Endpoint:** `GET /api/locations/{id}/items`

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách hàng hóa tại vị trí thành công",
  "data": {
    "locationId": 3,
    "locationcode": "A1-01",
    "locationname": "Kệ A1, tầng 1, cột 1",
    "itemCodes": ["SP001","SP002"],
    "rackno": "A1",
    "floorno": "1",
    "columnno": "1",
    "capacity": 100,
    "usedCapacity": 40,
    "remainingCapacity": 60,
    "type": "HAS_STOCK",
    "items": [
      {
        "itemId": 5,
        "itemcode": "SP001",
        "itemname": "Sản phẩm A",
        "unitof": "Cái",
        "quantity": 20,
        "batchCodes": ["SP001-20260415"]
      },
      {
        "itemId": 6,
        "itemcode": "SP002",
        "itemname": "Sản phẩm B",
        "unitof": "Thùng",
        "quantity": 10,
        "batchCodes": ["SP002-20260420-01"]
      }
    ]
  }
}
```

> `type`: `"HAS_STOCK"` nếu vị trí đang chứa hàng, `"EMPTY"` nếu trống hoàn toàn.  
> `items`: danh sách hàng hóa đang chứa tại vị trí (chỉ các bản ghi `isActive = true`). Ở màn chi tiết vị trí, nếu cùng một mã hàng có nhiều batch tại cùng vị trí, BE trả ra **nhiều dòng riêng theo từng batch** để FE hiển thị đúng số lượng từng lô.  
> `quantity` trong mỗi dòng = `batch.quantity` (số lượng **ban đầu** của lô), **không phải** `quantityRemaining` (tồn còn lại).  
> `remainingCapacity`: `null` nếu vị trí không giới hạn sức chứa (`capacity = null`).
> `batchCodes`: mỗi dòng chứa đúng 1 `batchCode` (tương ứng với lô của dòng đó).

> `itemCodes`: (summary) một mảng các `itemcode` duy nhất đang có tại vị trí — dùng cho FE khi cần hiển thị nhanh danh sách mã hàng ở vị trí (ví dụ: pill list hoặc quick filter). Ở nhiều UI, FE chỉ cần `itemCodes` để show danh sách mã hàng nhanh, rồi gọi chi tiết (items) khi người dùng drill-in.

> **Lưu ý cho FE về tên trường:**
> - `itemcode` (lower-case) là trường mã vật tư. FE hãy sử dụng chính xác `itemcode` để hiển thị cột "Mã vật tư".
> - `unitof` là trường đơn vị tính (ví dụ: `Cái`, `Thùng`). Nếu FE không thấy đơn vị, kiểm tra thuộc tính `unitof` trên response chứ không phải `unit` hay `uom`.
> - `batchCodes` là mảng mã lô (ở màn chi tiết vị trí mỗi dòng thường chỉ có 1 mã lô trong mảng).

---

## 7. Goods Receipt – Nhập kho

**Base path:** `/api/goods-receipts`

**Note:** Responses for goods receipts include the `doctype` field (e.g. `NORMAL` or `ADJUSTMENT`).

**Luồng:** `DRAFT` → *(chỉnh sửa tùy ý)* → `confirm` → tồn kho được cộng  
*(hoặc)* → `cancel` → phiếu bị hủy (tồn kho không đổi)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/goods-receipts` | Danh sách phiếu nhập | ADMIN, MANAGER, STAFF |
| GET | `/api/goods-receipts/{id}` | Chi tiết phiếu nhập | ADMIN, MANAGER, STAFF |
| POST | `/api/goods-receipts` | Tạo phiếu nháp | ADMIN, MANAGER, STAFF |
| PUT | `/api/goods-receipts/{id}` | Sửa phiếu DRAFT | ADMIN, MANAGER, STAFF |
| POST | `/api/goods-receipts/{id}/confirm` | Xác nhận → cộng tồn | ADMIN, MANAGER |
| POST | `/api/goods-receipts/{id}/cancel` | Hủy phiếu DRAFT | ADMIN, MANAGER |
| POST | `/api/goods-receipts/{id}/reject` | Từ chối phiếu nhập | ADMIN, MANAGER |
| GET | `/api/goods-receipts/available-locations?itemId=` | Vị trí còn chỗ | ADMIN, MANAGER, STAFF |
| GET | `/api/goods-receipts/suggest-locations?itemId=&quantity=` | Gợi ý vị trí | ADMIN, MANAGER, STAFF |
| GET | `/api/goods-receipts/suggest-split?itemId=&quantity=` | Gợi ý phân bổ nhiều vị trí | ADMIN, MANAGER, STAFF |

**Filter by user:** `GET /api/goods-receipts?userId={userId}`

- Mô tả: trả danh sách phiếu do `userId` tạo (lọc theo cột `userid`).
- Query param: `userId` (optional). Nếu không gửi, trả tất cả phiếu (theo quyền người gọi).
- Quyền & hành vi:
  - `ADMIN`, `MANAGER`: có thể xem tất cả phiếu hoặc chỉ các phiếu của `userId` được chỉ định.
  - `STAFF`: chỉ được xem phiếu của chính mình — nếu `STAFF` gửi `userId` khác id của họ, server sẽ từ chối với lỗi quyền (không cho truy vấn phiếu của nhân viên khác).

Example:

```
GET /api/goods-receipts?userId=123
Authorization: Bearer <token>
```

Response: giống `GET /api/goods-receipts` nhưng chỉ chứa các phiếu do `userId=123` tạo.


### 7.3 Từ chối phiếu nhập (Reject)

FE: Khi quản lý muốn từ chối một phiếu nhập đang ở trạng thái chờ duyệt, gọi endpoint dưới đây với lý do.

Endpoint: `POST /api/goods-receipts/{id}/reject`

Permissions: `ADMIN`, `MANAGER`

Request body (JSON):
```json
{
  "reason": "Lý do từ chối ví dụ: hóa đơn không hợp lệ"
}
```

Behavior:
- Server set `docstatus = REJECTED` và lưu `rejectReason` (TEXT).
- Response `GoodsReceiptResponse` sẽ có trường `rejectReason` chứa lý do.
- Notification: creator (STAFF) sẽ nhận thông báo `REJECTED` kèm lý do.

Response (200) example:
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

**Lỗi có thể trả về:**
- `"Phiếu nhập đã ở trạng thái CONFIRMED/CANCELLED/REJECTED, không thể từ chối"`

### 7.1 Tạo / Cập nhật phiếu nhập (DRAFT)

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

> `docno` có thể bỏ trống để BE tự sinh theo dạng `PN-01`, `PN-02`, ...

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `invoiceNumber` | ❌ | Số hóa đơn / chứng từ bán hàng từ nhà cung cấp (tách riêng với `docno`). |
| `doctype` | ✅ | Loại phiếu nhập. Giá trị gợi ý: `NORMAL`, `ADJUSTMENT`. |

> `locationId` có thể để `null` khi tạo DRAFT; phải gán trước khi confirm.
> `batchId` / `batchCode` trong response chỉ xuất hiện sau khi phiếu được **CONFIRMED** — BE tự động tạo lô khi xác nhận, FE **không cần** gọi `POST /api/batches` trong luồng nhập kho thông thường.
>
> **LƯU Ý VỀ LÔ HÀNG (BATCH):**
> - **Tự động tạo khi confirm:** Khi phiếu nhập được xác nhận, BE tự sinh batch theo từng dòng chi tiết gắn vị trí. Nếu cùng 1 mã hàng được nhập ở nhiều vị trí khác nhau, mỗi vị trí sẽ có `batchCode` riêng.
> - **Mã lô mới khi trùng:** `batchCode` vẫn được sinh theo mẫu `ITEMCODE-YYYYMMDD` và thêm hậu tố `-01`, `-02`, ... khi cần để đảm bảo duy nhất.
> - **Hiển thị trên vị trí:** `batchCodes` trong phần chi tiết vị trí chỉ phản ánh các batch đang nằm ở chính vị trí đó, để FE hiển thị đúng mã lô theo từng vị trí của cùng một sản phẩm.
> - **API trả về `batchCode`/`batchId`** chỉ khi `docstatus = CONFIRMED`. Lô của phiếu chưa confirm sẽ không xuất hiện trong `available-locations`/`locations`/`batches/by-location`.

**Response:**
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
    "doctype": "NORMAL",
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
        "batchCode": null
      }
    ]
  }
}
```

### 7.2 Xác nhận phiếu nhập

**Endpoint:** `POST /api/goods-receipts/{id}/confirm` — không cần body.

BE thực hiện:
1. Kiểm tra tất cả dòng đã có `locationId`.
2. Kiểm tra capacity từng vị trí còn đủ chỗ.
3. Cộng `quantity` vào `ItemLocation` (tạo mới nếu chưa có).
4. Cộng `quantity` vào `InventoryBalance`.
5. **Tự động tạo / cập nhật lô (batch):** Với mỗi dòng chi tiết gắn vị trí, BE tạo hoặc cập nhật batch riêng cho đúng dòng đó.
  - Nếu batch cho dòng đó **chưa tồn tại**: tạo mới với `batchCode = ITEMCODE-YYYYMMDD` (ngày = `docDate`), thêm hậu tố `-01`, `-02`, ... khi cần; `quantity = số lượng của dòng`, `quantityRemaining = số lượng của dòng`.
  - Nếu batch đã tồn tại (tạo thủ công trước đó): ghi đè `quantity` và `quantityRemaining` bằng số lượng của dòng chi tiết tương ứng.
6. Set `docstatus = CONFIRMED`, lưu `actionByUsername`.

**Note on `doctype`:** If a `GoodsReceipt` is created/linked from an `InventoryAudit` (the request contains `inventoryAuditId`), the backend will automatically set `doctype = "ADJUSTMENT"` to indicate this is an adjustment receipt. FE **does not** need to set `doctype` when creating adjustment receipts via the audit flow; BE will enforce the correct type.

### 7.2.1 Luồng end-to-end (chi tiết từng bước)

1. FE: Gọi `POST /api/goods-receipts` với body (có thể để `docno` trống). BE trả về phiếu `DRAFT`.
2. FE: Gọi `GET /api/goods-receipts/available-locations?itemId=` hoặc `suggest-locations` để chọn `locationId` cho từng dòng nếu cần.
3. FE: Người dùng gán `locationId` cho các dòng chưa có; FE cập nhật bằng `PUT /api/goods-receipts/{id}`.
4. FE: Khi sẵn sàng, gọi `POST /api/goods-receipts/{id}/confirm` để xác nhận.
5. BE (trong `confirm`):
  - Kiểm tra tất cả dòng có `locationId` (nếu thiếu, trả lỗi và dừng).
  - Kiểm tra capacity từng vị trí; nếu không đủ, trả lỗi và không thay đổi dữ liệu.
  - Cộng `quantity` vào `ItemLocation` tương ứng (tạo mới nếu chưa có) và đảm bảo `isActive=true`.
  - Cộng `quantity` vào `InventoryBalance` (tồn tổng) và cập nhật `lastUpdated`.
  - Tạo hoặc cập nhật `Batch` cho mỗi dòng (mỗi dòng-lô gắn vị trí tạo/lưu batch với `quantity` và `quantityRemaining`).
  - Đặt `docstatus = CONFIRMED`, lưu `modifiedBy`/`approver` nếu có, và trả về phiếu đã cập nhật.
6. BE: Nếu phiếu được tạo từ `InventoryAudit` (có `inventoryAuditId`), BE tự động gán `doctype = ADJUSTMENT` và (nếu có) lưu `adjustmentFlags` vào audit record.
7. FE: Sau confirm, gọi `GET /api/goods-receipts/{id}` để lấy lại phiếu đã được confirm — response sẽ chứa `batchId`/`batchCode` cho các dòng đã tạo lô, `docstatus = CONFIRMED`, và `doctype`.
8. FE (tuỳ UI): Cập nhật view vị trí / danh sách lô bằng `GET /api/locations/{id}/items` hoặc `GET /api/batches/by-location` để hiển thị lô mới xuất hiện trên vị trí.

**Lỗi có thể trả về:**
- `"Phiếu nhập không có dòng chi tiết nào"`
- `"Dòng chi tiết với mã hàng 'X' chưa được gán vị trí"`
- `"Vị trí 'A1-01' không đủ sức chứa. Còn trống: 20, cần nhập: 100"`

### 7.4 API hỗ trợ chọn vị trí

**`GET /available-locations?itemId={id}`** — Liệt kê vị trí còn chỗ, không cần truyền `quantity`.

Trả về danh sách sắp xếp: `EXISTING` → `EMPTY` → `PARTIAL`.

```json
[
  {
    "locationId": 3,
    "locationcode": "A1-01",
    "locationname": "Kệ A1, tầng 1",
    "rackno": "A1", "floorno": "1", "columnno": "1",
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

> **Cấu trúc `items` trong `available-locations`:** Mỗi phần tử là 1 dòng theo mã hàng (không phân tách theo lô). `quantity` = tổng tồn của mã hàng đó tại vị trí (từ `ItemLocation`); `batchCodes` = danh sách **tất cả** mã lô của mã hàng đó tại vị trí. Khác với `GET /api/locations/{id}/items` — endpoint đó tách mỗi lô thành 1 dòng riêng.

---

**`GET /suggest-locations?itemId={id}&quantity={qty}`** — Gợi ý vị trí đủ sức chứa `quantity`.

**`GET /suggest-split?itemId={id}&quantity={qty}`** — Phân bổ tự động khi `quantity` > sức chứa 1 vị trí; trả thêm `suggestedQuantity`.

```json
[
  {
    "locationId": 3, "locationcode": "A1-01", "locationname": "Kệ A1",
    "capacity": 100, "currentQuantity": 40, "availableSpace": 60,
    "type": "EXISTING", "suggestedQuantity": 60
  },
  {
    "locationId": 7, "locationcode": "B2-01", "locationname": "Kệ B2",
    "capacity": 100, "currentQuantity": 0, "availableSpace": 100,
    "type": "EMPTY", "suggestedQuantity": 40
  }
]
```

---

## 8. Goods Issue – Xuất kho

**Base path:** `/api/goods-issues`

**Note:** Responses for goods issues include the `doctype` field (e.g. `NORMAL` or `ADJUSTMENT`).

**Luồng:** `DRAFT` → *(chỉnh sửa tùy ý)* → `confirm` → tồn kho được trừ  
*(hoặc)* → `cancel` → phiếu bị hủy (tồn kho không đổi)

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/goods-issues` | Danh sách phiếu xuất | ADMIN, MANAGER, STAFF |
| GET | `/api/goods-issues/{id}` | Chi tiết phiếu xuất | ADMIN, MANAGER, STAFF |
| POST | `/api/goods-issues` | Tạo phiếu nháp | ADMIN, MANAGER, STAFF |
| PUT | `/api/goods-issues/{id}` | Sửa phiếu DRAFT | ADMIN, MANAGER, STAFF |
| POST | `/api/goods-issues/{id}/confirm` | Xác nhận → trừ tồn | ADMIN, MANAGER |
| POST | `/api/goods-issues/{id}/cancel` | Hủy phiếu DRAFT | ADMIN, MANAGER |
| POST | `/api/goods-issues/{id}/reject` | Từ chối phiếu xuất | ADMIN, MANAGER |
| GET | `/api/goods-issues/available-locations?itemId=` | Vị trí có hàng | ADMIN, MANAGER, STAFF |
| GET | `/api/goods-issues/suggest-split?itemId=&quantity=` | Gợi ý phân bổ nhiều vị trí | ADMIN, MANAGER, STAFF |

### 8.3 Từ chối phiếu xuất (Reject)

FE: Khi quản lý từ chối một phiếu xuất, gọi endpoint này với lý do từ chối.

Endpoint: `POST /api/goods-issues/{id}/reject`

Permissions: `ADMIN`, `MANAGER`

Request body (JSON):
```json
{
  "reason": "Lý do từ chối ví dụ: đơn hàng bị huỷ"
}
```

Behavior:
- Server set `docstatus = REJECTED` và lưu `rejectReason` (TEXT) vào bản ghi.
- Response `GoodsIssueResponse` sẽ có trường `rejectReason` chứa lý do.
- Notification: creator (STAFF) sẽ nhận thông báo `REJECTED` kèm lý do.

Response (200) example:
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

**Lỗi có thể trả về:**
- `"Phiếu xuất đã ở trạng thái CONFIRMED/CANCELLED/REJECTED, không thể từ chối"`

### 8.1 Tạo / Cập nhật phiếu xuất (DRAFT)

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
      "locationId": 3,
      "batchId": 1,
      "quantity": 20,
      "unitprice": 55000
    }
  ]
}
```

> `docno` có thể bỏ trống để BE tự sinh theo dạng `PX-01`, `PX-02`, ...

> `locationId` bắt buộc trước khi confirm; FE nên chọn từ `available-locations`.
> `batchId` tùy chọn; nếu FE gửi, BE sẽ tự động trừ `quantityRemaining` của lô khi xác nhận.

**Response:** cấu trúc tương tự GoodsReceipt, với `docstatus: "DRAFT"`.

**Note on `doctype`:** When an export is generated automatically from an `InventoryAudit` (adjustment flow), the backend will set `doctype = "ADJUSTMENT"`. FE creating manual drafts can optionally set `doctype`, but when the export is produced by the audit workflow, BE enforces `ADJUSTMENT`.

### 8.2 Xác nhận phiếu xuất

**Endpoint:** `POST /api/goods-issues/{id}/confirm` — không cần body.

BE thực hiện:
1. Kiểm tra tất cả dòng đã có `locationId`.
2. Kiểm tra `ItemLocation` tại vị trí đó có đủ `quantity`.
3. Kiểm tra `InventoryBalance` tổng không âm sau khi trừ.
4. Trừ `quantity` tại `ItemLocation`; tự động set `isActive = false` khi về 0.
5. Trừ `quantity` tại `InventoryBalance`.
6. Nếu dòng chi tiết có `batchId`: kiểm tra và trừ `quantityRemaining` của lô tương ứng.
7. Set `docstatus = CONFIRMED`.

### 8.2.1 Luồng end-to-end (chi tiết từng bước)

1. FE: Gọi `POST /api/goods-issues` với body (có thể để `docno` trống). BE trả về phiếu `DRAFT`.
2. FE: Gọi `GET /api/goods-issues/available-locations?itemId=` hoặc `suggest-split` để chọn `locationId` / `batchId` cho từng dòng.
3. FE: Người dùng gán `locationId`/`batchId` cho các dòng; FE cập nhật bằng `PUT /api/goods-issues/{id}`.
4. FE: Khi sẵn sàng, gọi `POST /api/goods-issues/{id}/confirm` để xác nhận.
5. BE (trong `confirm`):
  - Kiểm tra tất cả dòng có `locationId` (nếu thiếu, trả lỗi và dừng).
  - Kiểm tra `ItemLocation` tại vị trí đó có đủ `quantity`; nếu không đủ, trả lỗi.
  - Trừ `quantity` ở `ItemLocation` và set `isActive=false` khi còn 0.
  - Trừ `quantity` tại `InventoryBalance` (tồn tổng) và cập nhật `lastUpdated`.
  - Nếu dòng có `batchId`: kiểm tra `quantityRemaining` của lô và trừ tương ứng.
  - Đặt `docstatus = CONFIRMED`, lưu `modifiedBy`/`approver` nếu có, và trả về phiếu đã cập nhật.
6. BE: Nếu phiếu được tạo từ `InventoryAudit` (có `inventoryAuditId`), BE tự động gán `doctype = ADJUSTMENT`.
7. FE: Sau confirm, gọi `GET /api/goods-issues/{id}` để lấy lại phiếu — response sẽ có `docstatus = CONFIRMED`, `doctype`, và lộ trình thay đổi tồn.

**Lỗi có thể trả về:**
- `"Phiếu xuất không có dòng chi tiết nào"`
- `"Không tìm thấy tồn kho của 'SP001' tại vị trí 'A1-01'"`
- `"Tồn kho tại vị trí 'A1-01' không đủ số lượng để xuất (cần 50, hiện có 20)"`
- `"Tồn kho tổng của 'SP001' không đủ số lượng để xuất"`
- `"Số lượng của lô 'LITEM00120260506' không đủ để xuất (cần 50, còn lại 30)"`

### 8.4 API hỗ trợ chọn vị trí

**`GET /available-locations?itemId={id}`** — Liệt kê vị trí đang chứa item với `quantity > 0`, sắp xếp tồn giảm dần. Mỗi vị trí trả kèm tất cả hàng đang chứa tại đó.

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
    "items": [
      { "itemId": 5, "itemcode": "SP001", "itemname": "Sản phẩm A", "unitof": "Cái", "quantity": 40, "batchCodes": ["SP001-20260415"] }
    ]
  }
]
```

**`GET /suggest-split?itemId={id}&quantity={qty}`** — Phân bổ tự động khi xuất nhiều vị trí; ưu tiên vị trí tồn nhiều nhất.

```json
[
  {
    "locationId": 3, "locationcode": "A1-01",
    "capacity": 100, "currentQuantity": 40, "availableSpace": 40,
    "type": "HAS_STOCK", "suggestedQuantity": 20
  }
]
```

---

## 9. Inventory Audit – Kiểm kê

**Base path:** `/api/inventory-audits`

### Luồng trạng thái

```
Manager tạo yêu cầu kiểm kê cho Staff (khuyến nghị):
  REQUESTED (manager gán) ──(staff cập nhật)──► IN_PROGRESS
  IN_PROGRESS ──(staff submit)──► SUBMITTED / PENDING_PROCESS
  SUBMITTED / PENDING_PROCESS ──(manager confirm)──► CONFIRMED / PROCESSED
  DRAFT ──(manager lưu nháp)──► CANCELLED
```

> **Ghi chú quan trọng:** Manager **không** thực hiện "tự kiểm" bằng cách gửi `actualquantity` khi tạo phiếu. BE sẽ chặn hành vi này. Quy trình chuẩn: manager gán yêu cầu cho staff → staff thực hiện kiểm kê và `submit` → manager `confirm`/`reject`.
> **Quan trọng:** Khi `confirm`, nếu có `diffquantity ≠ 0` thì trạng thái là **`PROCESSED`** (đã xử lý chênh lệch); nếu toàn bộ diff = 0 thì là **`CONFIRMED`**. Cả hai trường hợp đều đã áp dụng chênh lệch vào `InventoryBalance` tổng kho.  
> Khi `confirm`, chỉ `InventoryBalance` (tổng kho) được cập nhật — **không** cập nhật `ItemLocation` (tồn theo vị trí). Nếu cần điều chỉnh tồn theo vị trí sau kiểm kê, FE tạo phiếu nhập/xuất thông thường (xem mục 9.4).

---

### Bảng endpoint

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/inventory-audits` | Danh sách tất cả phiếu kiểm kê | ADMIN, MANAGER, STAFF |
| GET | `/api/inventory-audits/{id}` | Chi tiết phiếu kiểm kê | ADMIN, MANAGER, STAFF |
| POST | `/api/inventory-audits` | Tạo phiếu kiểm kê | ADMIN, MANAGER |
| PUT | `/api/inventory-audits/{id}` | Sửa phiếu DRAFT (chỉ DRAFT, phải có actualquantity) | ADMIN, MANAGER, STAFF |
| POST | `/api/inventory-audits/{id}/confirm` | Xác nhận → cập nhật InventoryBalance | ADMIN, MANAGER |
| POST | `/api/inventory-audits/{id}/reject` | Từ chối duyệt (kèm lý do) | ADMIN, MANAGER |
| POST | `/api/inventory-audits/{id}/cancel` | Hủy phiếu (chỉ DRAFT) | ADMIN, MANAGER |
| GET | `/api/inventory-audits/assigned` | Phiếu đang giao cho STAFF đăng nhập (REQUESTED, IN_PROGRESS) | STAFF |
| GET | `/api/inventory-audits/assigned/pending` | Alias của `/assigned` | STAFF |
| GET | `/api/inventory-audits/assigned/done` | Phiếu STAFF đã làm xong (SUBMITTED, PENDING_PROCESS, PROCESSED, CONFIRMED, CANCELLED, REJECTED) | STAFF |
| PUT | `/api/inventory-audits/{id}/assigned` | STAFF cập nhật actualquantity (REQUESTED → IN_PROGRESS) | STAFF |
| POST | `/api/inventory-audits/{id}/submit` | STAFF gửi kết quả cho Manager | STAFF |

---

### 9.1 Tạo phiếu kiểm kê

**Endpoint:** `POST /api/inventory-audits`

Có hai chế độ tạo phiếu:

#### Chế độ 1 – Manager gán cho STAFF (`sendToStaff = true`)

FE **chỉ gửi `itemId`**, KHÔNG cần `actualquantity`. BE tự lấy `bookquantity` từ `InventoryBalance`.

```json
{
  "docno": "PKK-01",
  "docDate": "2026-05-05",
  "description": "Kiểm kê kho tháng 5",
  "assignedUserId": 12,
  "sendToStaff": true,
  "details": [
    { "itemId": 5, "description": "Khu vực A" },
    { "itemId": 6 }
  ]
}
```

→ Kết quả: `docstatus = REQUESTED`, `actualquantity = null`, `diffquantity = null`.

#### Chế độ 2 – Manager tự nhập kết quả (`sendToStaff = false` hoặc bỏ trống)

`actualquantity` là **bắt buộc** cho mọi dòng chi tiết. Phiếu sẽ ở trạng thái `DRAFT`.

```json
{
  "docDate": "2026-05-05",
  "description": "Kiểm kê nhanh",
  "details": [
    { "itemId": 5, "actualquantity": 95, "description": "Đếm thực tế" },
    { "itemId": 6, "actualquantity": 30 }
  ]
}
```

→ Kết quả: `docstatus = DRAFT`, `bookquantity` và `diffquantity` đã được BE tính sẵn.

#### Bảng trường request

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `docno` | ❌ | BE tự sinh `PKK-01`, `PKK-02`, ... nếu không gửi |
| `docDate` | ❌ | Ngày kiểm kê (yyyy-MM-dd) |
| `description` | ❌ | Ghi chú phiếu |
| `assignedUserId` | ❌ | ID nhân viên được giao |
| `sendToStaff` | ❌ | `true` → gán Staff, `false`/null → Manager tự nhập |
| `details[].itemId` | ✅ | ID hàng hóa |
| `details[].actualquantity` | ✅ nếu không gán Staff | Số đếm thực tế |
| `details[].description` | ❌ | Ghi chú dòng |

**Response:**

```json
{
  "success": true,
  "message": "Tạo phiếu kiểm kê thành công",
  "data": {
    "id": 1,
    "docno": "PKK-01",
    "docDate": "2026-05-05",
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
    "details": [
      {
        "id": 1,
        "itemId": 5,
        "itemcode": "SP001",
        "itemname": "Sản phẩm A",
        "unitof": "Cái",
        "bookquantity": 100,
        "actualquantity": null,
        "diffquantity": null,
        "description": "Khu vực A"
      }
    ]
  }
}
```

> `auditor*`: nhân viên thực hiện kiểm kê; nếu không gán Staff thì là người tạo phiếu.  
> `approver*`: người duyệt, được ghi nhận sau khi confirm/reject.

---

### 9.2 STAFF cập nhật kết quả kiểm kê

**Endpoint:** `PUT /api/inventory-audits/{id}/assigned`

**Điều kiện:** Phiếu ở trạng thái `REQUESTED` hoặc `IN_PROGRESS`. Người gọi phải là `assignedUser` của phiếu.

Khi STAFF cập nhật lần đầu, `REQUESTED` tự động chuyển sang `IN_PROGRESS`.

`actualquantity` là **bắt buộc** cho mọi dòng.

```json
{
  "details": [
    { "itemId": 5, "actualquantity": 95, "description": "Đếm thực tế" },
    { "itemId": 6, "actualquantity": 30 }
  ]
}
```

BE tính: `diffquantity = actualquantity - bookquantity` và trả về trong response.

---

### 9.3 STAFF gửi kết quả cho Manager

**Endpoint:** `POST /api/inventory-audits/{id}/submit` — không cần body.

**Điều kiện:** Phiếu ở `REQUESTED` hoặc `IN_PROGRESS`. Phải có đầy đủ `actualquantity` cho tất cả dòng.

| Kết quả kiểm kê | `docstatus` sau submit |
|-----------------|----------------------|
| Toàn bộ `diffquantity = 0` | `SUBMITTED` |
| Có ít nhất 1 `diffquantity ≠ 0` | `PENDING_PROCESS` |

BE tự động gửi thông báo `APPROVAL_REQUIRED` đến Manager/người tạo phiếu.

**Lỗi có thể trả về:**
- `"Chưa nhập số lượng thực tế cho hàng hóa 'SP001'"`
- `"Phiếu kiểm kê không có dòng chi tiết nào"`

---

### 9.4 Xác nhận phiếu kiểm kê

**Endpoint:** `POST /api/inventory-audits/{id}/confirm` — không cần body.

**Quyền:** ADMIN, MANAGER

**Điều kiện:** Phiếu ở trạng thái `DRAFT`, `SUBMITTED` hoặc `PENDING_PROCESS`.

**BE thực hiện:**
1. Kiểm tra tất cả dòng đã có `actualquantity`.
2. Với mỗi dòng có `diffquantity ≠ 0`, cập nhật `InventoryBalance` tổng kho:
   - `diff > 0` (thừa): cộng tồn kho tổng.
   - `diff < 0` (thiếu): trừ tồn kho tổng (lỗi nếu kết quả âm).
3. Ghi nhận `approver` = user đang đăng nhập.

| Kết quả sau confirm | `docstatus` |
|---------------------|-------------|
| Toàn bộ `diffquantity = 0` | `CONFIRMED` |
| Có ít nhất 1 `diffquantity ≠ 0` | `PROCESSED` |

> **⚠ Quan trọng cho FE:**  
> - Chỉ `InventoryBalance` (tổng kho) được cập nhật khi confirm. `ItemLocation` (tồn theo vị trí) **KHÔNG thay đổi**.  
> - Nếu phiếu trả về `PROCESSED` (có chênh lệch), FE nên hiển thị gợi ý tạo phiếu nhập/xuất điều chỉnh (xem bên dưới).  
> - FE nên hiển thị bảng `diffquantity` trước khi confirm: `diff < 0` → đỏ (thiếu), `diff > 0` → xanh (thừa), `diff = 0` → xám.

**Lỗi có thể trả về:**
- `"Chỉ có thể xác nhận phiếu ở trạng thái DRAFT, SUBMITTED hoặc PENDING_PROCESS"`
- `"Phiếu kiểm kê không có dòng chi tiết nào"`
- `"Chưa nhập số lượng thực tế cho hàng hóa 'SP001'"`
- `"Tồn kho tổng của 'SP001' không đủ sau kiểm kê (tổng: X, chênh lệch: Y)"`
 
**Ghi chú về phiếu điều chỉnh (Adjustment vouchers)**

- Khi FE muốn tạo phiếu điều chỉnh từ kết quả kiểm kê (`InventoryAudit`), FE tạo một `GoodsReceipt` với `inventoryAuditId` (liên kết tới `InventoryAudit`) — backend sẽ hiểu đây là một `ADJUSTMENT` voucher.
- FE có thể gửi thêm trường `adjustmentFlags` trong payload `GoodsReceiptRequest` là một mảng boolean (JSON array). BE sẽ lưu mảng này vào `InventoryAudit.adjustmentFlags` và trả lại trong `InventoryAuditResponse.adjustmentFlags` để FE hiển thị/giải mã.
- Lưu ý: `adjustmentFlags` chỉ được sử dụng/áp dụng cho phiếu điều chỉnh liên kết tới `InventoryAudit` và không ảnh hưởng đến phiếu nhập/xuất bình thường.

---

### 9.5 Từ chối duyệt phiếu kiểm kê

**Endpoint:** `POST /api/inventory-audits/{id}/reject`

**Quyền:** ADMIN, MANAGER

**Điều kiện:** Phiếu ở trạng thái `SUBMITTED` hoặc `PENDING_PROCESS`.

```json
{
  "reason": "Số liệu không khớp, cần kiểm tra lại khu vực A"
}
```

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `reason` | ✅ | Lý do từ chối (không được để trống) |

Response trả về `docstatus = REJECTED` và `rejectReason` đã ghi nhận. BE tự động gửi thông báo `REJECTED` đến nhân viên được giao.

**Lỗi có thể trả về:**
- `"Chỉ có thể từ chối phiếu ở trạng thái SUBMITTED hoặc PENDING_PROCESS"`

---

### 9.6 Hủy phiếu kiểm kê

**Endpoint:** `POST /api/inventory-audits/{id}/cancel` — không cần body.

**Điều kiện:** Phiếu ở trạng thái `DRAFT`. Không hủy được phiếu đã gửi cho Staff.

---

### 9.7 Phiếu nhập / xuất điều chỉnh sau kiểm kê

Sau khi phiếu kiểm kê được confirm (`CONFIRMED` hoặc `PROCESSED`):
- `InventoryBalance` (tồn kho tổng) đã được cập nhật tự động.
- `ItemLocation` (tồn theo từng vị trí) **chưa thay đổi** — nếu hệ thống cần đồng bộ tồn theo vị trí, FE tạo phiếu nhập/xuất thông thường.

**Cách FE tạo phiếu điều chỉnh vị trí:**

| `diffquantity` | Loại phiếu cần tạo | Endpoint |
|----------------|-------------------|----------|
| `> 0` (thừa hàng) | Phiếu nhập điều chỉnh | `POST /api/goods-receipts` |
| `< 0` (thiếu hàng) | Phiếu xuất điều chỉnh | `POST /api/goods-issues` |
| `= 0` | Không cần tạo phiếu | — |

**Gợi ý FE hiển thị:**
- Sau khi phiếu kiểm kê chuyển sang `PROCESSED`, hiển thị bảng chi tiết với cột **Chênh lệch** (`diffquantity`) và cột **Đề xuất**:
  - `diff > 0` → "Nhập điều chỉnh +{diff}" (badge xanh)
  - `diff < 0` → "Xuất điều chỉnh {diff}" (badge đỏ)
  - `diff = 0` → "Không cần điều chỉnh" (xám)
- Nút **"Tạo phiếu nhập/xuất điều chỉnh"** → điền sẵn:
  - `description`: `"Điều chỉnh từ kiểm kê {docno}"`
  - `details[].quantity`: `Math.abs(diffquantity)`

**FE: localStorage flow để ẩn nút sau khi đã tạo điều chỉnh**

- Khi tạo phiếu nhập điều chỉnh thành công (ReceiptCreatePage): nếu URL có `auditId` và `doctype=ADJUSTMENT`, FE lưu localStorage key `audit_adj_receipt_{auditId}` = "1".
- Khi tạo phiếu xuất điều chỉnh thành công (IssueCreatePage): nếu URL có `auditId` và `doctype=ADJUSTMENT`, FE lưu localStorage key `audit_adj_issue_{auditId}` = "1".
- Khi AuditDetailPage tải, FE đọc 2 flag này:
  - nếu `audit_adj_receipt_{auditId}` === "1" → ẩn/disable nút tạo phiếu nhập điều chỉnh;
  - nếu `audit_adj_issue_{auditId}` === "1" → ẩn/disable nút tạo phiếu xuất điều chỉnh.
- Vì lưu trong `localStorage`, flag sẽ tồn tại qua session và phù hợp với yêu cầu ẩn vĩnh viễn sau khi đã tạo.

Lưu ý quan trọng (khuyến nghị):

- Backend trả thêm trường `adjustmentCreated` (boolean) trong `InventoryAuditResponse`. FE **nên ưu tiên** kiểm tra `adjustmentCreated === true` để ẩn/disable các nút tạo điều chỉnh — đây là nguồn tin cậy (server-side).
- `localStorage` flow là phương án bổ trợ (offline/UX) để ẩn nút ngay khi người dùng vừa tạo phiếu, trước khi có cập nhật từ server hoặc refresh trang. Kết hợp cả hai đảm bảo UX mượt và tránh hiển thị nút trùng lặp.

Ví dụ xử lý trên FE (tối giản):

```javascript
// Khi nhận response từ server sau khi tạo Receipt/Issue
if (response.status === 201 && response.data?.inventoryAuditId) {
  // set local flag để ẩn ngay
  localStorage.setItem(`audit_adj_receipt_${response.data.inventoryAuditId}`, '1');
}

// Khi hiển thị AuditDetailPage
const serverHidden = auditResponse?.adjustmentCreated === true;
const clientHidden = localStorage.getItem(`audit_adj_receipt_${auditId}`) === '1' ||
                     localStorage.getItem(`audit_adj_issue_${auditId}`) === '1';
const hideAdjustButton = serverHidden || clientHidden;
```

Ghi chú:
- `adjustmentFlags` (nếu FE gửi) được lưu trên `InventoryAudit.adjustmentFlags` và trả lại trong `InventoryAuditResponse`.
- BE cũng trả `inventoryAuditId` trong response của `GoodsReceipt`/`GoodsIssue` khi phiếu được tạo kèm liên kết audit; FE có thể kiểm tra response để xác nhận liên kết và set localStorage ngay khi nhận `201`/`200` từ server.
- FE vẫn phải cho người dùng chọn `locationId` cho từng dòng khi tạo phiếu điều chỉnh.

> **Lưu ý:** Phiếu điều chỉnh này là phiếu nhập/xuất hoàn toàn độc lập trong BE — không có liên kết tự động với phiếu kiểm kê. FE chịu trách nhiệm ghi `description` rõ ràng để tra soát.

---

## 10. Batch – Lô hàng

**Base path:** `/api/batches`

**Mục đích:** Quản lý lô hàng, phục vụ xuất kho theo FIFO. `batchCode` và `nameBatch` do BE tự sinh — FE không gửi các trường này.

> ⚠️ **Luồng thông thường:** FE **không cần** gọi `POST /api/batches` trong luồng nhập kho. Batch được BE tự động tạo khi `confirm` phiếu nhập — theo từng dòng chi tiết gắn vị trí, với `quantity` = số lượng của dòng đó. `POST /api/batches` chỉ dùng khi cần tạo lô đặc biệt ngoài luồng phiếu nhập.

**Quy tắc sinh `batchCode`:**
- Định dạng: `ITEMCODE-YYYYMMDD` (ngày lấy từ `docDate` của phiếu nhập)
- Nếu trùng (cùng mã vật tư, ngày): thêm hậu tố `...-01`, `...-02`, ...
- Ví dụ: `SP001-20260505`, `SP001-20260505-01`
- Ký tự đặc biệt và dấu tiếng Việt được chuẩn hóa thành `-`

**Quy tắc sinh `nameBatch`:**
- Định dạng: `Lo {tenVatTu} dot {YYYYMMDD}`

**Quy tắc `quantity` và `quantityRemaining`:**
- `quantity` (số lượng ban đầu) = số lượng của **chính dòng chi tiết** phiếu nhập tạo ra lô này (1 dòng chi tiết → 1 batch).
- `quantityRemaining` (tồn lô còn lại):
  - Batch **tự động tạo qua confirm phiếu nhập**: `quantityRemaining = quantity`.
  - Batch **tạo thủ công qua `POST /api/batches`**: `quantityRemaining = 0`.
  - Giảm dần mỗi khi phiếu xuất trừ lô này.

| Method | Endpoint | Mô tả | Quyền |
|--------|----------|-------|-------|
| GET | `/api/batches` | Danh sách lô hàng | ADMIN, MANAGER, STAFF |
| GET | `/api/batches/{id}` | Chi tiết lô hàng | ADMIN, MANAGER, STAFF |
| POST | `/api/batches` | Tạo lô hàng mới | ADMIN, MANAGER, STAFF |
| GET | `/api/batches/by-location?locationId=` | Danh sách lô theo vị trí (trả `batchId` + `quantity`) | ADMIN, MANAGER, STAFF |

### 10.1 Tạo lô hàng

**Endpoint:** `POST /api/batches`

**Request body:**
```json
{
  "itemId": 5,
  "receiptDetailId": 10,
  "manufactureDate": "2026-04-15",
  "expiryDate": "2027-04-15",
  "unitCost": 12345.67890,
  "quantity": 100.00000
}
```

| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `itemId` | ✅ | ID hàng hóa |
| `receiptDetailId` | ✅ | ID dòng phiếu nhập tạo ra lô này |
| `manufactureDate` | ❌ | Ngày sản xuất; nếu null dùng ngày hiện tại để sinh mã |
| `expiryDate` | ❌ | Hạn sử dụng |
| `unitCost` | ✅ | Giá nhập lô (> 0) |
| `quantity` | ✅ | Số lượng ban đầu (> 0) |

**Response thành công:**
```json
{
  "success": true,
  "message": "Tạo lô hàng thành công",
  "data": {
    "id": 1,
    "batchCode": "SP001-20260415",
    "itemId": 5,
    "itemcode": "SP001",
    "itemname": "Sản phẩm A",
    "nameBatch": "Lo Sản phẩm A dot 20260415",
    "receiptDetailId": 10,
    "manufactureDate": "2026-04-15",
    "expiryDate": "2027-04-15",
    "unitCost": 12345.67890,
    "quantity": 100.00000,
    "quantityRemaining": 0.00000,
    "createdAt": "2026-05-05T10:00:00"
  }
}
```

> `quantityRemaining = 0` khi tạo thủ công qua API này. Nếu `receiptDetailId` trỏ đến dòng phiếu nhập chưa confirm, khi phiếu được confirm sau đó BE sẽ **ghi đè** `quantity` và `quantityRemaining` bằng số lượng của dòng chi tiết đó. FE không gửi trường này.

### 10.4 Lifecycle & FE guidance

**Luồng chuẩn (khuyến nghị):**
1. FE tạo phiếu nhập DRAFT với các dòng chi tiết (có thể nhiều vị trí cho cùng 1 mã hàng).
2. FE confirm phiếu → BE **tự động** sinh batch theo từng dòng chi tiết gắn vị trí: `quantity = số lượng của dòng`, `batchCode = ITEMCODE-YYYYMMDD` và thêm hậu tố khi trùng.
3. Response của `GET /api/goods-receipts/{id}` sau confirm trả về `batchId` + `batchCode` theo đúng dòng chi tiết tương ứng.
4. Trong phiếu xuất: FE chọn `batchId` từ danh sách lô của item.

**Lưu ý:**
- Nếu phiếu bị `CANCELLED` hoặc detail bị xóa (PUT cập nhật DRAFT), batch liên kết sẽ bị xóa theo.
- `GET /api/locations/{id}/items` hiển thị batch theo **từng lô** tại vị trí đó, còn `available-locations` và các màn gợi ý vẫn có thể gom theo mã hàng để FE chọn vị trí.
- `POST /api/batches` vẫn hỗ trợ cho trường hợp tạo lô thủ công ngoài luồng phiếu nhập; khi phiếu được confirm sau đó, BE sẽ ghi đè `quantity` và `quantityRemaining` bằng số lượng của **dòng chi tiết** tương ứng (không phải tổng toàn phiếu).

### 10.2 Danh sách lô hàng

**Endpoint:** `GET /api/batches`

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách lô hàng thành công",
  "data": [
    {
      "id": 1,
      "batchCode": "SP001-20260415",
      "itemId": 5,
      "itemcode": "SP001",
      "itemname": "Sản phẩm A",
      "nameBatch": "Lo Sản phẩm A dot 20260415",
      "receiptDetailId": 10,
      "manufactureDate": "2026-04-15",
      "expiryDate": "2027-04-15",
      "unitCost": 12345.67890,
      "quantity": 100.00000,
      "quantityRemaining": 75.00000,
      "createdAt": "2026-05-05T10:00:00"
    }
  ]
}
```

### 10.3 Danh sách lô theo vị trí

**Endpoint:** `GET /api/batches/by-location?locationId={id}`

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách lô theo vị trí thành công",
  "data": [
    {
      "batchId": 1,
      "batchCode": "SP001-20260415",
      "itemId": 5,
      "itemcode": "SP001",
      "itemname": "Sản phẩm A",
      "locationId": 3,
      "locationcode": "A1-01",
      "quantity": 40.00000
    }
  ]
}
```

---

## 11. Lưu ý chung cho FE

1. **Token JWT:** Gửi kèm mọi request dạng `Authorization: Bearer <token>`. Token hết hạn → 401 → FE chuyển về trang đăng nhập. Nhận 403 dù đã đăng nhập → **xóa token cũ và đăng nhập lại** để lấy token mới chứa `role` (token cũ không có `role` claim sẽ bị từ chối bởi `@PreAuthorize`). `role` trong JWT có giá trị `ADMIN`/`MANAGER`/`STAFF` (không cần tiền tố `ROLE_`).
2. **Validate trước khi gửi:** Kiểm tra các trường bắt buộc (xem mục 1) để tránh round-trip không cần thiết.
3. **`locationId` khi nhập/xuất:** Chỉ gửi `locationId` lấy từ API `available-locations` hoặc `suggest-split`. Không tự tạo giá trị.
4. **Kiểm kê:** Manager chỉ gửi danh sách `itemId`; `bookquantity` do BE trả về. STAFF cập nhật `actualquantity`, BE tính `diffquantity`.
5. **`batchCode`:** FE không gửi; BE tự sinh và trả về trong response.
6. **Phiếu CONFIRMED / CANCELLED:** Không gọi PUT để sửa; BE sẽ trả lỗi.
7. **Xử lý lỗi:** Luôn kiểm tra `success === false` → hiển thị `message` cho người dùng, không tiếp tục thao tác.
8. **Global Error Response (GlobalExceptionHandler):** BE xử lý tập trung các lỗi sau và trả về cấu trúc `ApiResponse` chuẩn:

   | HTTP Status | Trường hợp | `message` ví dụ |
   |-------------|-----------|-----------------|
   | `409 Conflict` | Trùng `username` | `"Tên đăng nhập đã tồn tại"` |
   | `409 Conflict` | Trùng `email` | `"Email đã tồn tại"` |
   | `409 Conflict` | Trùng `usercode` | `"Mã nhân viên đã tồn tại"` |
   | `409 Conflict` | Trùng ràng buộc unique khác | `"Dữ liệu đã tồn tại, vui lòng kiểm tra lại"` |
   | `400 Bad Request` | Tham số không hợp lệ (`IllegalArgumentException`) | Nội dung lỗi cụ thể từ BE |
   | `500 Internal Server Error` | Lỗi hệ thống không xác định | `"Lỗi hệ thống: <chi tiết>"` |

   Response mẫu khi trùng username:
   ```json
   {
     "success": false,
     "message": "Tên đăng nhập đã tồn tại",
     "data": null
   }
   ```

9. **`docstatus` mapping FE:**
   - `DRAFT` → "Nháp" (badge xám)
   - `REQUESTED` → "Đã giao" (badge vàng) — chỉ phiếu kiểm kê
   - `SUBMITTED` → "Chờ duyệt" (badge cam) — chỉ phiếu kiểm kê
   - `PENDING_PROCESS` → "Có chênh lệch" (badge cam đậm) — chỉ phiếu kiểm kê
   - `CONFIRMED` → "Đã xác nhận" (badge xanh)
   - `PROCESSED` → "Đã xử lý chênh lệch" (badge xanh đậm) — chỉ phiếu kiểm kê, `InventoryBalance` đã được cập nhật
   - `CANCELLED` → "Đã hủy" (badge đỏ)
   - `REJECTED` → "Bị từ chối" (badge đỏ đậm) — hiển thị kèm `rejectReason`

---

## 12. Notifications – Thông báo

**Base path:** `/api/notifications`

### 12.1 Mục đích

Thông báo dùng để:
- **Manager** nhận cảnh báo khi có phiếu cần duyệt.
- **Staff** nhận thông báo khi:
  - Được giao phiếu kiểm kê.
  - Phiếu do mình tạo đã được duyệt.

**Nguồn phát sinh thông báo (hiện tại):**
- **Goods Receipt**: STAFF tạo phiếu → Manager nhận `APPROVAL_REQUIRED`; Manager confirm → STAFF nhận `APPROVED`.
- **Goods Issue**: STAFF tạo phiếu → Manager nhận `APPROVAL_REQUIRED`; Manager confirm → STAFF nhận `APPROVED`.
- **Inventory Audit**:
  - Manager gán STAFF → STAFF nhận `ASSIGNED`.
  - STAFF submit → Quản lý đã tạo phiếu nhận `APPROVAL_REQUIRED`.
  - Manager confirm → STAFF nhận `APPROVED`.

> FE có thể hiển thị badge số lượng chưa đọc và mở chi tiết phiếu khi click vào thông báo.

**Realtime (Firestore):**
- Collection path: `users/{userId}/notifications/{notificationId}`
- FE subscribe `onSnapshot` để cập nhật realtime danh sách và unread count.
- DB (PostgreSQL) là source of truth; Firestore chỉ là kênh push realtime.

### 12.1.1 Cấu hình Firebase (Realtime Notifications)

**Backend (Spring Boot):**
1. Tạo Firebase project và bật Firestore (Native mode).
2. Tạo service account JSON và lưu file trên server (khong commit).
3. Cung cap duong dan file theo 1 trong 2 cach sau:
   - Cach A (khuyen nghi): truyen property luc chay
     - Maven: `mvn spring-boot:run -Dspring-boot.run.arguments="--firebase.credentials=C:\\secrets\\firebase-service-account.json"`
     - Jar: `java -jar app.jar --firebase.credentials=C:\\secrets\\firebase-service-account.json`
   - Cach B: env var `FIREBASE_CREDENTIALS`
     - Windows (PowerShell):
       ```powershell
       setx FIREBASE_CREDENTIALS "C:\\secrets\\firebase-service-account.json"
       ```
     - Linux/macOS:
       ```bash
       export FIREBASE_CREDENTIALS=/opt/secrets/firebase-service-account.json
       ```
4. Restart service de config co hieu luc.

**Frontend (React/Vite):**
- Firebase web config khong phai secret. De FE ket noi duoc tren nhieu may, co 2 cach:
  - Cach A (khuyen nghi neu khong muon .env): dat config truc tiep trong `firebaseClient.js`.
    ```js
    const getConfig = () => ({
      apiKey: "<apiKey>",
      authDomain: "<projectId>.firebaseapp.com",
      projectId: "<projectId>",
      storageBucket: "<projectId>.appspot.com",
      messagingSenderId: "<messagingSenderId>",
      appId: "<appId>",
    });
    ```
  - Cach B: dung `VITE_FIREBASE_*` (neu team muon quan ly bang env).

**Firestore Rules (gợi ý tối thiểu):**
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/notifications/{notificationId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }
  }
}
```

### 12.2 Danh sách thông báo (theo user đăng nhập)

**Endpoint:** `GET /api/notifications`

**Response:**
```json
{
  "success": true,
  "message": "Danh sách thông báo",
  "data": [
    {
      "id": 10,
      "type": "APPROVAL_REQUIRED",
      "targetType": "GOODS_RECEIPT",
      "targetId": 123,
      "docno": "PN-2026-001",
      "title": "Phieu nhap can duyet",
      "message": "Phieu nhap PN-2026-001 can duyet",
      "isRead": false,
      "createdAt": "2026-05-09T10:00:00",
      "targetUrl": "/receipts/123"
    }
  ]
}
```

**Comment FE:**
- `targetUrl` là route FE đã map sẵn (ví dụ: `/receipts/{id}`, `/issues/{id}`, `/audits/{id}`), FE có thể `navigate(targetUrl)`.
- Nếu FE không muốn dùng `targetUrl`, có thể tự build từ `targetType` + `targetId`.

### 12.3 Đếm thông báo chưa đọc

**Endpoint:** `GET /api/notifications/unread-count`

**Response:**
```json
{
  "success": true,
  "message": "Số lượng thông báo chưa đọc",
  "data": 5
}
```

### 12.4 Đánh dấu đã đọc 1 thông báo

**Endpoint:** `POST /api/notifications/{id}/read`

**Response:**
```json
{
  "success": true,
  "message": "Đã đánh dấu đã đọc",
  "data": null
}
```

### 12.5 Đánh dấu đã đọc tất cả

**Endpoint:** `POST /api/notifications/read-all`

**Response:**
```json
{
  "success": true,
  "message": "Đã đánh dấu tất cả đã đọc",
  "data": null
}
```

### 12.6 Mapping type/target

**`type`:**
- `APPROVAL_REQUIRED` → "Cần duyệt"
- `APPROVED` → "Đã duyệt"
- `ASSIGNED` → "Được giao"

**`targetType`:**
- `GOODS_RECEIPT` → route `/receipts/{id}`
- `GOODS_ISSUE` → route `/issues/{id}`
- `INVENTORY_AUDIT` → route `/audits/{id}`