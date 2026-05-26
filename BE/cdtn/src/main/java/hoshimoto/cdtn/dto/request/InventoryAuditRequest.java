package hoshimoto.cdtn.dto.request;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import lombok.Data;

@Data
public class InventoryAuditRequest {

    private String docno;

    private LocalDate docDate;

    private String description;

    // Nếu gửi request tới nhân viên
    private Long assignedUserId;

    // Nếu true và assignedUserId != null thì phiếu được chuyển sang trạng thái REQUESTED
    private Boolean sendToStaff = false;

    @Valid
    private List<InventoryAuditDetailRequest> details;
}
