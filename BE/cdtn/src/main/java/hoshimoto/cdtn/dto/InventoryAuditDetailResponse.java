package hoshimoto.cdtn.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class InventoryAuditDetailResponse {
    private Long id;
    private Long itemId;
    private String itemcode;
    private String itemname;
    private String unitof;
    private BigDecimal bookquantity;
    private BigDecimal actualquantity;
    private BigDecimal diffquantity;
    private String description;
}
