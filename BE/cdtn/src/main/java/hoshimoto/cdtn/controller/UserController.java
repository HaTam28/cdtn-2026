package hoshimoto.cdtn.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import hoshimoto.cdtn.dto.ApiResponse;
import hoshimoto.cdtn.dto.UserResponse;
import hoshimoto.cdtn.dto.request.UserRequest;
import hoshimoto.cdtn.service.UserService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    /** ADMIN, MANAGER, STAFF đều xem được danh sách */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        List<UserResponse> list = userService.getAllUsers()
                .stream().map(UserResponse::fromEntity).collect(Collectors.toList());
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách nhân viên thành công", list));
    }

    /** ADMIN và MANAGER xem chi tiết */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .map(u -> ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết nhân viên thành công", UserResponse.fromEntity(u))))
                .orElseGet(() -> ResponseEntity.status(404).body(new ApiResponse<>(false, "Không tìm thấy nhân viên", null)));
    }

    /** ADMIN và MANAGER tạo mới (ADMIN: tạo MANAGER/STAFF; MANAGER: chỉ tạo STAFF) */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody UserRequest request) {
        var created = userService.createUser(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Tạo mới nhân viên thành công", UserResponse.fromEntity(created)));
    }

    /** ADMIN và MANAGER cập nhật */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserRequest request) {
        try {
            var updated = userService.updateUser(id, request);
            return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật nhân viên thành công", UserResponse.fromEntity(updated)));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    /** ADMIN và MANAGER xóa (soft delete) */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok(new ApiResponse<>(true, "Vô hiệu hóa nhân viên thành công", null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }
}
