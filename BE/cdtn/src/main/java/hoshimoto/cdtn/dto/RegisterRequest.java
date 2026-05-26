package hoshimoto.cdtn.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String usercode;
    private String fullname;
    private String username;
    private String email;
    private String password;
    private String department;
}
