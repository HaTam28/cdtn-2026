package hoshimoto.cdtn.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class GoodsIssueDetailResponse {
    private Long id;
    private Long itemId;
    private String itemcode;
    private String itemname;
    private String unitof;
    private BigDecimal quantity;
    private BigDecimal unitprice;
    private BigDecimal amount;
    private Long locationId;
    private String locationcode;
    private String locationname;
    private Long batchId;
    private String batchCode;
}
