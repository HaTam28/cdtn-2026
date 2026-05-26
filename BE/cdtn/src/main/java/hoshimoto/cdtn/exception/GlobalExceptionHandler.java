package hoshimoto.cdtn.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import hoshimoto.cdtn.dto.ApiResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        String message = "Dữ liệu bị trùng lặp";

        Throwable rootCause = ex.getRootCause();
        String cause = (rootCause != null && rootCause.getMessage() != null) ? rootCause.getMessage() : "";

        if (cause.contains("users_username_key")) {
            message = "Tên đăng nhập đã tồn tại";
        } else if (cause.contains("users_email_key") || cause.contains("email")) {
            message = "Email đã tồn tại";
        } else if (cause.contains("users_usercode_key") || cause.contains("usercode")) {
            message = "Mã nhân viên đã tồn tại";
        } else if (cause.contains("duplicate key")) {
            message = "Dữ liệu đã tồn tại, vui lòng kiểm tra lại";
        }

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiResponse<>(false, message, null));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiResponse<>(false, ex.getMessage(), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiResponse<>(false, "Lỗi hệ thống: " + ex.getMessage(), null));
    }
}
