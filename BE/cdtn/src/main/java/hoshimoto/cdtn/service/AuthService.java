package hoshimoto.cdtn.service;


import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Random;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hoshimoto.cdtn.entity.PasswordResetToken;
import hoshimoto.cdtn.entity.User;
import hoshimoto.cdtn.repository.PasswordResetTokenRepository;
import hoshimoto.cdtn.repository.UserRepository;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private PasswordResetTokenRepository tokenRepository;
    @Autowired
    private MailService mailService;

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

    /**
     * Generate OTP, save to DB with 5-min TTL and send email.
     */
    @Transactional
    public boolean forgotPassword(String username, String email) {
        if (username == null || email == null) return false;
        String uname = username.trim();
        String mail = email.trim();
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(uname);
        logger.info("forgotPassword called with username='{}' email='{}' (trimmed uname='{}' mail='{}')", username, email, uname, mail);
        if (userOpt.isPresent()) {
            String storedEmail = userOpt.get().getEmail();
            logger.info("Found user for username='{}'. storedEmail='{}'", uname, storedEmail);
        } else {
            logger.info("No user found for username='{}'", uname);
        }
        if (userOpt.isPresent() && userOpt.get().getEmail() != null && userOpt.get().getEmail().trim().equalsIgnoreCase(mail)) {
            // remove previous tokens for this email (use trimmed mail)
            tokenRepository.deleteByEmail(mail);
            // generate 6-digit OTP
            String otp = String.format("%06d", new Random().nextInt(1_000_000));
            PasswordResetToken token = new PasswordResetToken();
            token.setEmail(mail);
            token.setOtpCode(otp);
            token.setExpiryDate(LocalDateTime.now().plusMinutes(5));
            token.setIsUsed(false);
            tokenRepository.save(token);
            // send email
            try {
                logger.info("Sending OTP to {} (otp={})", mail, otp);
                mailService.sendOtpEmail(mail, otp);
            } catch (Exception ex) {
                // MailService should handle exceptions, but guard here as well
                logger.warn("Failed to send OTP email to {} (continuing): {}", mail, ex.toString());
            }
            return true;
        }
        return false;
    }

    /**
     * Cập nhật mật khẩu mới cho user, kiểm tra OTP
     * @param username tên đăng nhập
     * @param newPassword mật khẩu mới
     * @param otp mã OTP
     * @return true nếu cập nhật thành công, false nếu user không tồn tại hoặc OTP không hợp lệ
     */
    @Transactional
    public boolean updatePassword(String username, String newPassword, String otp) {
        // Deprecated signature: not used after separating verify step
        return false;
    }

    @Transactional
    public boolean verifyOtp(String username, String otp) {
        if (username == null || otp == null) return false;
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username.trim());
        if (userOpt.isEmpty()) return false;
        String email = userOpt.get().getEmail();
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByEmailAndOtpCode(email, otp);
        if (tokenOpt.isPresent()) {
            PasswordResetToken t = tokenOpt.get();
            if (Boolean.TRUE.equals(t.getIsUsed())) return false;
            if (t.getExpiryDate().isAfter(LocalDateTime.now())) {
                t.setIsVerified(true);
                tokenRepository.save(t);
                return true;
            }
        }
        return false;
    }

    @Transactional
    public boolean updatePassword(String username, String newPassword) {
        if (username == null || newPassword == null) return false;
        // validate password strength before consuming OTP
        if (!isPasswordStrong(newPassword)) {
            logger.info("updatePassword rejected for username='{}' due to weak password", username);
            return false;
        }
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(username.trim());
        if (userOpt.isEmpty()) return false;
        String email = userOpt.get().getEmail();
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findFirstByEmailAndIsVerifiedTrueAndIsUsedFalse(email);
        if (tokenOpt.isPresent()) {
            PasswordResetToken t = tokenOpt.get();
            if (t.getExpiryDate().isAfter(LocalDateTime.now())) {
                User user = userOpt.get();
                user.setPasswordHash(passwordEncoder.encode(newPassword));
                userRepository.save(user);
                // Only mark token used after password successfully saved
                t.setIsUsed(true);
                tokenRepository.save(t);
                return true;
            }
        }
        return false;
    }

    private boolean isPasswordStrong(String pwd) {
        if (pwd == null) return false;
        // Require min 8 chars, at least one lower, one upper, one digit
        return pwd.length() >= 8 && pwd.matches("(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*");
    }

    /**
     * Đăng ký tài khoản mới
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
        // Register public always creates STAFF. Create MANAGER must use POST /api/users (requires auth)
        user.setRole(hoshimoto.cdtn.entity.Enum.Role.STAFF);
        userRepository.save(user);
        return true;
    }
}
