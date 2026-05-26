package hoshimoto.cdtn.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import hoshimoto.cdtn.entity.PasswordResetToken;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByEmailAndOtpCode(String email, String otpCode);
    void deleteByEmail(String email);
    Optional<PasswordResetToken> findFirstByEmailAndIsVerifiedTrueAndIsUsedFalse(String email);
}
