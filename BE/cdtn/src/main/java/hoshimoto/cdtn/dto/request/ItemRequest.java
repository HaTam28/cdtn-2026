package hoshimoto.cdtn.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ItemRequest {

    @NotBlank(message = "Mã hàng hóa không được để trống")
    @Size(max = 50, message = "Mã hàng hóa tối đa 50 ký tự")
    private String itemcode;

    @Size(max = 100, message = "Barcode tối đa 100 ký tự")
    private String barcode;

    @Size(max = 200, message = "Tên hàng hóa tối đa 200 ký tự")
    private String itemname;

    @Size(max = 200, message = "Tên hóa đơn tối đa 200 ký tự")
    private String invoicename;

    private String description;

    @Size(max = 50, message = "Loại hàng tối đa 50 ký tự")
    private String itemtype;

    @Size(max = 30, message = "Đơn vị tính tối đa 30 ký tự")
    private String unitof;

    @Size(max = 100, message = "Nhóm hàng tối đa 100 ký tự")
    private String itemcatg;

    private Integer minstocklevel;

    private Boolean isActive;

    private String modifiedBy;
}
