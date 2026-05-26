package hoshimoto.cdtn.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import hoshimoto.cdtn.entity.Enum.DocStatus;
import lombok.Data;

@Data
public class GoodsIssueResponse {
    private Long id;
    private String docno;
    private LocalDate docDate;
    private String description;
    private DocStatus docstatus;
    private Long customerId;
    private String customerName;
    private String customerTaxcode;
    private LocalDateTime createdAt;
    private Long inventoryAuditId;
    private String createdByUsername;
    private String createdByFullname;
    private String actionByUsername;
    private String actionByFullname;
    private LocalDateTime approvedAt;
    private List<GoodsIssueDetailResponse> details;
}
