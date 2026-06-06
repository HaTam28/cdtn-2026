package hoshimoto.cdtn.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class InventoryAuditStockRowResponse {
    private Long itemId;
    private String itemcode;
    private String itemname;
    private String unitof;
    private Long batchId;
    private String batchCode;
    private Long locationId;
    private String locationcode;
    private String locationname;
    private BigDecimal bookquantity;
}
