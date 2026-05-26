package hoshimoto.cdtn.dto;

import lombok.Data;

@Data
public class UpdatePasswordRequest {
    private String username;
    private String newPassword;
}
