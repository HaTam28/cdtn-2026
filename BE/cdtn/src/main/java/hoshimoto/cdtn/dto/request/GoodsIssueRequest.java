package hoshimoto.cdtn.dto.request;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import lombok.Data;

@Data
public class GoodsIssueRequest {

    private String docno;

    private LocalDate docDate;

    private String description;

    private Long customerId;

    /** Optional: link this issue as an adjustment for an inventory audit */
    private Long inventoryAuditId;

    /** Optional: when creating an ADJUSTMENT issue, flags for the linked audit */
    private java.util.List<Boolean> adjustmentFlags;

    @Valid
    private List<GoodsIssueDetailRequest> details;
}
