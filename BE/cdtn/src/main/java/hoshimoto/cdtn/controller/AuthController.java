package hoshimoto.cdtn.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import hoshimoto.cdtn.dto.ApiResponse;
import hoshimoto.cdtn.dto.ForgotPasswordRequest;
import hoshimoto.cdtn.dto.LoginRequest;
import hoshimoto.cdtn.dto.RegisterRequest;
import hoshimoto.cdtn.dto.UpdatePasswordRequest;
import hoshimoto.cdtn.dto.UserResponse;
import hoshimoto.cdtn.security.JwtUtil;
import hoshimoto.cdtn.service.AuthService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private AuthService authService;
    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserResponse>> login(@RequestBody LoginRequest request) {
        return authService.login(request.getUsername(), request.getPassword())
                .map(user -> {
                    UserResponse res = UserResponse.fromEntity(user);
                    // Sinh JWT token
                    String token = jwtUtil.generateToken(user.getUsername(), user.getRole() != null ? user.getRole().name() : null);
                    res.setToken(token);
                    return ResponseEntity.ok(new ApiResponse<>(true, "Đăng nhập thành công", res));
                })
                .orElseGet(() -> ResponseEntity.status(401).body(new ApiResponse<>(false, "Sai tài khoản hoặc mật khẩu", null)));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        boolean valid = authService.forgotPassword(request.getUsername(), request.getEmail());
        if (valid) {
            return ResponseEntity.ok(new ApiResponse<>(true, "Xác nhận thành công, chuyển sang cập nhật mật khẩu mới", null));
        } else {
            return ResponseEntity.status(404).body(new ApiResponse<>(false, "Tài khoản hoặc email không đúng", null));
        }
    }
    @PostMapping("/update-password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(@RequestBody UpdatePasswordRequest request) {
        boolean updated = authService.updatePassword(request.getUsername(), request.getNewPassword());
        if (updated) {
            return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật mật khẩu thành công", null));
        } else {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Tài khoản không hợp lệ hoặc lỗi cập nhật", null));
        }
    }
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@RequestBody RegisterRequest request) {
        boolean created = authService.register(
                request.getUsercode(),
                request.getFullname(),
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                request.getDepartment()
        );
        if (created) {
            return ResponseEntity.ok(new ApiResponse<>(true, "Đăng ký thành công", null));
        } else {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Tài khoản đã tồn tại hoặc dữ liệu không hợp lệ", null));
        }
    }
}
