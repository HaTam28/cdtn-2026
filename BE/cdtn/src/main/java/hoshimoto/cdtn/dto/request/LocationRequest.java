package hoshimoto.cdtn.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LocationRequest {

    @NotBlank(message = "Mã vị trí không được để trống")
    @Size(max = 50, message = "Mã vị trí tối đa 50 ký tự")
    private String locationcode;

    @Size(max = 200, message = "Tên vị trí tối đa 200 ký tự")
    private String locationname;

    @Size(max = 30, message = "Số kệ tối đa 30 ký tự")
    private String rackno;

    @Size(max = 10, message = "Số tầng tối đa 10 ký tự")
    private String floorno;

    @Size(max = 10, message = "Số cột tối đa 10 ký tự")
    private String columnno;

    private Integer capacity;

    private String description;

    private Boolean isActive;

    private String modifiedBy;
}
