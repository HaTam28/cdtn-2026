package hoshimoto.cdtn.service;


import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import hoshimoto.cdtn.entity.User;
import hoshimoto.cdtn.repository.UserRepository;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    public Optional<User> login(String username, String password) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent() && passwordEncoder.matches(password, userOpt.get().getPasswordHash())) {
            return userOpt;
        }
        return Optional.empty();
    }

    public boolean isAdmin(User user) {
        return user.getRole() != null && user.getRole().name().equals("ADMIN");
    }

    public boolean isStaff(User user) {
        return user.getRole() != null && user.getRole().name().equals("STAFF");
    }

    public boolean forgotPassword(String username, String email) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        return userOpt.isPresent() && userOpt.get().getEmail().equals(email);
    }
    /**
     * Cập nhật mật khẩu mới cho user
     * @param username tên đăng nhập
     * @param newPassword mật khẩu mới
     * @return true nếu cập nhật thành công, false nếu user không tồn tại
     */
    public boolean updatePassword(String username, String newPassword) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPasswordHash(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            return true;
        }
        return false;
    }
    /**
     * Đăng ký tài khoản mới
     * @param usercode mã nhân viên
     * @param fullname họ tên
     * @param username tên đăng nhập
     * @param email email
     * @param password mật khẩu
     * @param department phòng ban
     * @return true nếu thành công, false nếu đã tồn tại hoặc lỗi dữ liệu
     */
    public boolean register(String usercode, String fullname, String username, String email, String password, String department) {
        if (userRepository.findByUsername(username).isPresent() || userRepository.findByEmail(email).isPresent()) {
            return false;
        }
        User user = new User();
        user.setUsercode(usercode);
        user.setFullname(fullname);
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setDepartment(department);
        user.setIsActive(true);
        // Register public luôn tạo STAFF. Tạo MANAGER phải dùng POST /api/users (cần auth)
        user.setRole(hoshimoto.cdtn.entity.Enum.Role.STAFF);
        userRepository.save(user);
        return true;
    }
}
