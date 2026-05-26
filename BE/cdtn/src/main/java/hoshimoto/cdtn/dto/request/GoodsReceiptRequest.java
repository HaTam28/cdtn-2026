package hoshimoto.cdtn.dto.request;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import lombok.Data;

@Data
public class GoodsReceiptRequest {

    private String docno;

    private LocalDate docDate;

    private String description;

    private String invoiceNumber;

    /** Optional: link this receipt as an adjustment for an inventory audit */
    private Long inventoryAuditId;

    /** Optional: when creating an ADJUSTMENT receipt, flags for the linked audit */
    private java.util.List<Boolean> adjustmentFlags;

    /** ID nhà cung cấp / khách hàng */
    private Long customerId;

    @Valid
    private List<GoodsReceiptDetailRequest> details;
}
