package hoshimoto.cdtn.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserRequest {

    @Size(max = 50, message = "Mã nhân viên tối đa 50 ký tự")
    private String usercode;

    @Size(max = 200, message = "Họ tên tối đa 200 ký tự")
    private String fullname;

    @Size(max = 100, message = "Tên đăng nhập tối đa 100 ký tự")
    private String username;

    @Email(message = "Email không hợp lệ")
    @Size(max = 150, message = "Email tối đa 150 ký tự")
    private String email;

    @Size(max = 100)
    private String department;

    @Size(max = 20)
    private String phoneNumber;

    private String address;

    private String gender;

    @Size(max = 50)
    private String bankaccount;

    @Size(max = 100)
    private String bankname;

    private Boolean isActive;

    /** ADMIN: gán MANAGER hoặc STAFF; MANAGER: chỉ gán STAFF. Bắt buộc khi tạo mới */
    private String role;

    private String modifiedBy;
    
        /** Password thô, chỉ dùng khi tạo/sửa user */
        private String password;
}
