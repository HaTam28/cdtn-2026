package hoshimoto.cdtn.dto;

import lombok.Data;

@Data
public class ItemResponse {
    private Long id;
    private String itemcode;
    private String barcode;
    private String itemname;
    private String invoicename;
    private String description;
    private String itemtype;
    private String unitof;
    private String itemcatg;
    private Integer minstocklevel;
    private String createdAt;
    private String modifiedAt;
    private String modifiedBy;
    private Boolean isActive;
}
