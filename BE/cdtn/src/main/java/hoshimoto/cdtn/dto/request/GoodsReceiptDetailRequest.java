package hoshimoto.cdtn.dto.request;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class GoodsReceiptDetailRequest {

    private Long itemId;

    /** ID vị trí được chọn (người dùng chọn từ danh sách gợi ý) */
    private Long locationId;

    /** Existing batch selected by FE; required for ADJUSTMENT receipts from audits. */
    private Long batchId;

    private BigDecimal quantity;

    private BigDecimal unitprice;

    /** Optional: source inventory audit detail when this is an adjustment receipt. */
    private Long inventoryAuditDetailId;
}
