package hoshimoto.cdtn.dto.request;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class GoodsIssueDetailRequest {

    private Long itemId;

    /** ID vị trí được chọn (người dùng chọn từ danh sách vị trí có hàng) */
    private Long locationId;

    /** ID lô hàng (tùy chọn; nếu có, BE sẽ trừ quantityRemaining của lô khi xác nhận) */
    private Long batchId;

    private BigDecimal quantity;

    private BigDecimal unitprice;

    /** Optional: source inventory audit detail when this is an adjustment issue. */
    private Long inventoryAuditDetailId;
}
