package hoshimoto.cdtn.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import hoshimoto.cdtn.entity.Enum.DocStatus;
import lombok.Data;

@Data
public class GoodsReceiptResponse {
    private Long id;
    private String docno;
    private String invoiceNumber;
    private LocalDate docDate;
    private String description;
    private DocStatus docstatus;
    private Long inventoryAuditId;
    private Long customerId;
    private String customerName;
    private String customerTaxcode;
    private LocalDateTime createdAt;
    private String createdByUsername;
    private String createdByFullname;
    private String actionByUsername;
    private String actionByFullname;
    private LocalDateTime approvedAt;
    private List<GoodsReceiptDetailResponse> details;
}
