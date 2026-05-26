package hoshimoto.cdtn.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CustomerRequest {

    @Size(max = 50, message = "Mã đối tượng tối đa 50 ký tự")
    private String customercode;

    @Size(max = 200, message = "Tên đối tượng tối đa 200 ký tự")
    private String customername;

    private String address;

    @Email(message = "Email không hợp lệ")
    @Size(max = 150, message = "Email tối đa 150 ký tự")
    private String email;

    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String mobile;

    @Size(max = 200)
    private String partnername;

    @Size(max = 20)
    private String partnermobile;

    @Size(max = 200)
    private String ownername;

    @Size(max = 30)
    private String taxcode;

    @Size(max = 100)
    private String itemcatg;

    @Size(max = 50)
    private String bankaccount;

    @Size(max = 100)
    private String bankname;

    private Boolean issupplier;

    private Boolean iscustomer;

    private Boolean isActive;

    private String modifiedBy;
}
