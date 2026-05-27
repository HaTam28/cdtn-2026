package hoshimoto.cdtn.dto;

import java.util.HashSet;
import java.util.Set;

import lombok.Data;

@Data
public class ImportItemDto {
    private String itemCode;
    private String barcode;
    private String itemName;
    private String invoiceName;
    private String description;
    private String itemType;
    private String unitOf;
    private String itemCategory;
    private Integer minStockLevel;
    private Set<String> presentFields = new HashSet<>();
}
