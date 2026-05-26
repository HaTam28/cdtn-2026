package hoshimoto.cdtn.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Gợi ý vị trí phù hợp khi nhập/xuất kho.
 * - type = "EXISTING"  → vị trí đã có cùng sản phẩm, còn chỗ trống
 * - type = "EMPTY"     → vị trí hoàn toàn trống
 * - type = "HAS_STOCK" → vị trí có tồn kho đủ để xuất (dùng cho xuất kho)
 * suggestedQuantity: khi gọi suggest-split, BE tự tính lượng phân bổ vào vị trí này.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LocationSuggestionResponse {
    private Long locationId;
    private String locationcode;
    private String locationname;
    private Integer capacity;
    private BigDecimal currentQuantity;   // tổng đang chiếm tại vị trí (0 nếu trống)
    private BigDecimal availableSpace;    // capacity - currentQuantity
    private String type;                  // "EXISTING", "EMPTY", "HAS_STOCK"
    private BigDecimal suggestedQuantity; // chỉ có khi gọi suggest-split; null nếu gọi suggest-locations
}
