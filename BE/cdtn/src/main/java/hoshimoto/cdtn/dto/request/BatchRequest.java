package hoshimoto.cdtn.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BatchRequest {

    @NotNull(message = "itemId không được để trống")
    private Long itemId;

    private String nameBatch;

    @NotNull(message = "ReceiptDetailID không được để trống")
    private Long receiptDetailId;

    private LocalDate manufactureDate;

    private LocalDate expiryDate;

    @NotNull(message = "UnitCost không được để trống")
    @DecimalMin(value = "0.00001", message = "UnitCost phải lớn hơn 0")
    private BigDecimal unitCost;

    @NotNull(message = "Quantity không được để trống")
    @DecimalMin(value = "0.00001", message = "Quantity phải lớn hơn 0")
    private BigDecimal quantity;
}
