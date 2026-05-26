package hoshimoto.cdtn.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Data;

@Data
public class BatchResponse {
    private Long id;
    private String batchCode;
    private Long itemId;
    private String itemcode;
    private String itemname;
    private String nameBatch;
    private Long receiptDetailId;
    private LocalDate manufactureDate;
    private LocalDate expiryDate;
    private BigDecimal unitCost;
    private BigDecimal quantity;
    private BigDecimal quantityRemaining;
    private LocalDateTime createdAt;
}
