package hoshimoto.cdtn.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GoodsIssueDetailRequest {

    @NotNull(message = "itemId không được để trống")
    private Long itemId;

    /** ID vị trí được chọn (người dùng chọn từ danh sách vị trí có hàng) */
    private Long locationId;

    /** ID lô hàng (tùy chọn; nếu có, BE sẽ trừ quantityRemaining của lô khi xác nhận) */
    private Long batchId;

    @NotNull(message = "Số lượng không được để trống")
    @DecimalMin(value = "0.0001", message = "Số lượng phải lớn hơn 0")
    private BigDecimal quantity;

    private BigDecimal unitprice;
}
