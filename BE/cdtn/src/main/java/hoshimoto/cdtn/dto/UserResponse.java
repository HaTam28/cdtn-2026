package hoshimoto.cdtn.dto;

import lombok.Data;

@Data
public class UserResponse {
    private Long id;
    private String usercode;
    private String fullname;
    private String username;
    private String email;
    private String department;
    private String phoneNumber;
    private String address;
    private String birthdate;
    private String gender;
    private String firstworkingdate;
    private String bankaccount;
    private String bankname;
    private String createdAt;
    private String modifiedAt;
    private String modifiedBy;
    private Boolean isActive;
    private String role;
    private String lastlogin;
    private Integer failedLoginAttempts;
    private String token; // JWT token trả về khi đăng nhập

    public static UserResponse fromEntity(hoshimoto.cdtn.entity.User u) {
        UserResponse dto = new UserResponse();
        dto.setId(u.getId());
        dto.setUsercode(u.getUsercode());
        dto.setFullname(u.getFullname());
        dto.setUsername(u.getUsername());
        dto.setEmail(u.getEmail());
        dto.setDepartment(u.getDepartment());
        dto.setPhoneNumber(u.getPhoneNumber());
        dto.setAddress(u.getAddress());
        dto.setBirthdate(u.getBirthdate() != null ? u.getBirthdate().toString() : null);
        dto.setGender(u.getGender());
        dto.setFirstworkingdate(u.getFirstworkingdate() != null ? u.getFirstworkingdate().toString() : null);
        dto.setBankaccount(u.getBankaccount());
        dto.setBankname(u.getBankname());
        dto.setCreatedAt(u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
        dto.setModifiedAt(u.getModifiedAt() != null ? u.getModifiedAt().toString() : null);
        dto.setModifiedBy(u.getModifiedBy());
        dto.setIsActive(u.getIsActive());
        dto.setRole(u.getRole() != null ? u.getRole().name() : null);
        dto.setLastlogin(u.getLastlogin() != null ? u.getLastlogin().toString() : null);
        dto.setFailedLoginAttempts(u.getFailedLoginAttempts());
        return dto;
    }
}
