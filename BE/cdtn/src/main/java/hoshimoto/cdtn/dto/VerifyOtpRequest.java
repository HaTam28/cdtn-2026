package hoshimoto.cdtn.dto;

import lombok.Data;

@Data
public class VerifyOtpRequest {
    private String username;
    private String otp;
}
