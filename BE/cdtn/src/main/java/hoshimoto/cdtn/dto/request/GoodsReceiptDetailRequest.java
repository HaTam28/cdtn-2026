package hoshimoto.cdtn.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GoodsReceiptDetailRequest {

    @NotNull(message = "itemId không được để trống")
    private Long itemId;

    /** ID vị trí được chọn (người dùng chọn từ danh sách gợi ý) */
    private Long locationId;

    @NotNull(message = "Số lượng không được để trống")
    @DecimalMin(value = "0.0001", message = "Số lượng phải lớn hơn 0")
    private BigDecimal quantity;

    private BigDecimal unitprice;
}
