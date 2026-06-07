package hoshimoto.cdtn.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;

public class InventoryAuditDetailRequest {

    private Long id;

    private Long itemId;

    private Long batchId;

    private Long locationId;

    private BigDecimal bookquantity;

    @DecimalMin(value = "0", inclusive = true, message = "actualquantity must not be negative")
    private BigDecimal actualquantity;

    private String description;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getItemId() {
        return itemId;
    }

    public void setItemId(Long itemId) {
        this.itemId = itemId;
    }

    public Long getBatchId() {
        return batchId;
    }

    public void setBatchId(Long batchId) {
        this.batchId = batchId;
    }

    public Long getLocationId() {
        return locationId;
    }

    public void setLocationId(Long locationId) {
        this.locationId = locationId;
    }

    public BigDecimal getBookquantity() {
        return bookquantity;
    }

    public void setBookquantity(BigDecimal bookquantity) {
        this.bookquantity = bookquantity;
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
