package hoshimoto.cdtn.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import hoshimoto.cdtn.entity.Enum.DocStatus;
import lombok.Data;

@Data
public class InventoryAuditResponse {
    private Long id;
    private String docno;
    private LocalDate docDate;
    private String description;
    private DocStatus docstatus;
    private LocalDateTime createdAt;
    private String createdByUsername;
    private String createdByFullname;
    private Long assignedToUserId;
    private String assignedToUsername;
    private String assignedToFullname;
    private Long auditorUserId;
    private String auditorUsername;
    private String auditorFullname;
    private Long approverUserId;
    private String approverUsername;
    private String approverFullname;
    private LocalDateTime modifiedAt;
    private String modifiedBy;
    private String rejectReason;
    private Boolean adjustmentCreated;
    private java.util.List<Boolean> adjustmentFlags;
    private List<InventoryAuditDetailResponse> details;
}
