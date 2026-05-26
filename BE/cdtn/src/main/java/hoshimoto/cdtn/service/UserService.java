package hoshimoto.cdtn.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import hoshimoto.cdtn.dto.UserResponse;
import hoshimoto.cdtn.dto.request.UserRequest;
import hoshimoto.cdtn.entity.User;
import hoshimoto.cdtn.repository.UserRepository;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public User createUser(UserRequest request) {
        // Bắt buộc phải có role khi tạo mới
        if (request.getRole() == null || request.getRole().isBlank()) {
            throw new RuntimeException("Trường role là bắt buộc khi tạo tài khoản");
        }
        // Validate role hợp lệ
        try {
            hoshimoto.cdtn.entity.Enum.Role.valueOf(request.getRole());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Role không hợp lệ: " + request.getRole() + ". Chỉ chấp nhận MANAGER hoặc STAFF");
        }
        // Phân quyền tạo tài khoản: ADMIN tạo MANAGER/STAFF; MANAGER chỉ tạo STAFF
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isManager = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
            if (isAdmin && request.getRole().equals("ADMIN")) {
                throw new RuntimeException("Không thể tạo tài khoản ADMIN");
            }
            if (isManager && !request.getRole().equals("STAFF")) {
                throw new RuntimeException("MANAGER chỉ được tạo tài khoản STAFF");
            }
        }

        User user = new User();
        applyRequest(user, request);
        return userRepository.save(user);
    }

    public User updateUser(Long id, UserRequest request) {
        // Kiểm tra quyền khi cập nhật
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isManager = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
            if (!isAdmin && isManager) {
                // MANAGER không được nâng role lên MANAGER/ADMIN
                if (request.getRole() != null && !request.getRole().equals("STAFF")) {
                    throw new RuntimeException("MANAGER chỉ được gán role STAFF");
                }
                // MANAGER không được sửa tài khoản MANAGER/ADMIN khác
                User target = userRepository.findById(id)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên với id: " + id));
                if (target.getRole() != null && !target.getRole().name().equals("STAFF")) {
                    throw new RuntimeException("MANAGER không có quyền chỉnh sửa tài khoản " + target.getRole());
                }
            }
        }
        return userRepository.findById(id).map(u -> {
            applyRequest(u, request);
            u.setModifiedAt(LocalDateTime.now());
            return userRepository.save(u);
        }).orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên với id: " + id));
    }

    public void deleteUser(Long id) {
        // Kiểm tra quyền khi xóa
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isManager = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
            if (!isAdmin && isManager) {
                User target = userRepository.findById(id)
                        .orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên với id: " + id));
                if (target.getRole() != null && !target.getRole().name().equals("STAFF")) {
                    throw new RuntimeException("MANAGER không có quyền vô hiệu hóa tài khoản " + target.getRole());
                }
            }
        }
        userRepository.findById(id).map(u -> {
            u.setIsActive(false);
            u.setModifiedAt(LocalDateTime.now());
            return userRepository.save(u);
        }).orElseThrow(() -> new RuntimeException("Không tìm thấy nhân viên với id: " + id));
    }

    /**
     * Dùng lại cho AuthService nếu cần — convert UserResponse sang User entity.
     * @deprecated Dùng {@link #createUser(UserRequest)} thay thế.
     */
    @Deprecated
    public User fromDto(UserResponse dto) {
        User u = new User();
        u.setUsercode(dto.getUsercode());
        u.setFullname(dto.getFullname());
        u.setUsername(dto.getUsername());
        u.setEmail(dto.getEmail());
        u.setDepartment(dto.getDepartment());
        u.setPhoneNumber(dto.getPhoneNumber());
        u.setAddress(dto.getAddress());
        u.setGender(dto.getGender());
        u.setBankaccount(dto.getBankaccount());
        u.setBankname(dto.getBankname());
        u.setIsActive(dto.getIsActive());
        u.setRole(dto.getRole() != null ? hoshimoto.cdtn.entity.Enum.Role.valueOf(dto.getRole()) : null);
        u.setFailedLoginAttempts(dto.getFailedLoginAttempts());
        return u;
    }

    private void applyRequest(User u, UserRequest request) {
        if (request.getUsercode() != null) u.setUsercode(request.getUsercode());
        if (request.getFullname() != null) u.setFullname(request.getFullname());
        if (request.getUsername() != null) u.setUsername(request.getUsername());
        if (request.getEmail() != null) u.setEmail(request.getEmail());
        if (request.getDepartment() != null) u.setDepartment(request.getDepartment());
        if (request.getPhoneNumber() != null) u.setPhoneNumber(request.getPhoneNumber());
        if (request.getAddress() != null) u.setAddress(request.getAddress());
        if (request.getGender() != null) u.setGender(request.getGender());
        if (request.getBankaccount() != null) u.setBankaccount(request.getBankaccount());
        if (request.getBankname() != null) u.setBankname(request.getBankname());
        if (request.getIsActive() != null) u.setIsActive(request.getIsActive());
        if (request.getRole() != null) {
            u.setRole(hoshimoto.cdtn.entity.Enum.Role.valueOf(request.getRole()));
        }
        // Nếu có password (tạo mới hoặc đổi mật khẩu), hash và set
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
            u.setPasswordHash(encoder.encode(request.getPassword()));
        }
        if (request.getModifiedBy() != null) u.setModifiedBy(request.getModifiedBy());
    }
}
