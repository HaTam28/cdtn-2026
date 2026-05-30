package hoshimoto.cdtn.dto;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Thông tin chi tiết một vị trí kho khi FE cần chọn vị trí để nhập/xuất.
 * - items: danh sách sản phẩm đang chứa tại vị trí này (thống kê tồn kho theo vị trí).
 * - type: "EXISTING" (đã có cùng sản phẩm, còn chỗ), "EMPTY" (hoàn toàn trống), "HAS_STOCK" (có hàng – dùng cho xuất).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocationDetailResponse {

    private Long locationId;
    private String locationcode;
    private String locationname;
    private String rackno;
    private String floorno;
    private String columnno;
    private Integer capacity;
    private BigDecimal usedCapacity;
    private BigDecimal remainingCapacity;  // null nếu capacity không giới hạn
    private String type;                   // "EXISTING" | "EMPTY" | "HAS_STOCK"

    /** Danh sách hàng hóa đang chứa tại vị trí này */
    private List<LocationItemStock> items;
    /** Danh sách mã vật tư (unique) có mặt tại vị trí — dùng cho UI nhanh */
    private List<String> itemCodes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationItemStock {
        private Long itemId;
        private String itemcode;
        private String itemname;
        private String unitof;
        private BigDecimal quantity;
        private List<String> batchCodes;

        @JsonProperty("itemCode")
        public String getItemCode() {
            return this.itemcode;
        }

        @JsonProperty("unitOf")
        public String getUnitOf() {
            return this.unitof;
        }

        @JsonProperty("unit")
        public String getUnit() {
            return this.unitof;
        }
    }
}
