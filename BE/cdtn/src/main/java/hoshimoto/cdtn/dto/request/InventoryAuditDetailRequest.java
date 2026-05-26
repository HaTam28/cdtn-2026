package hoshimoto.cdtn.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
public class InventoryAuditDetailRequest {

    @NotNull(message = "itemId không được để trống")
    private Long itemId;

    @DecimalMin(value = "0", inclusive = true, message = "Số lượng thực tế không được âm")
    private BigDecimal actualquantity;

    private String description;

    public Long getItemId() {
        return itemId;
    }

    public void setItemId(Long itemId) {
        this.itemId = itemId;
    }

    public BigDecimal getActualquantity() {
        return actualquantity;
    }

    public void setActualquantity(BigDecimal actualquantity) {
        this.actualquantity = actualquantity;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
