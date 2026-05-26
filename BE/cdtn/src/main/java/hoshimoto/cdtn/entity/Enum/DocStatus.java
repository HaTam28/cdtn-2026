package hoshimoto.cdtn.entity.Enum;

public enum DocStatus {
    DRAFT,           // Phiếu nháp
    REQUESTED,       // Chờ kiểm kê
    IN_PROGRESS,     // Đang kiểm kê
    SUBMITTED,       // Đã gửi kết quả kiểm kê
    PENDING_PROCESS, // Chờ xử lý chênh lệch
    PROCESSED,       // Đã xử lý chênh lệch
    CONFIRMED,       // Đã xác nhận
    CANCELLED,       // Đã hủy
    REJECTED         // Bị từ chối
}
