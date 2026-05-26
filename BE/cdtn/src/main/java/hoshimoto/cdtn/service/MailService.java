package hoshimoto.cdtn.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
public class MailService {

    private static final Logger logger = LoggerFactory.getLogger(MailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private Environment env;

    /**
     * Send OTP email asynchronously with a small retry loop. In dev, fallback can be enabled
     * via `app.mail.dev-fallback=true` to log OTPs when SMTP is unavailable.
     */
    @Async("mailTaskExecutor")
    public void sendOtpEmail(String to, String otp) {
        String from = env.getProperty("app.mail.from", env.getProperty("spring.mail.username"));
        String subject = env.getProperty("app.mail.subject.prefix", "[CDTN]") + " Mã OTP đặt lại mật khẩu";
        String html = buildOtpHtml(otp);

        int attempts = Integer.parseInt(env.getProperty("app.mail.retry.count", "3"));
        long backoff = Long.parseLong(env.getProperty("app.mail.retry.backoffMs", "1000"));
        boolean sent = false;

        for (int i = 1; i <= attempts && !sent; i++) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
                helper.setTo(to);
                helper.setFrom(from);
                helper.setSubject(subject);
                helper.setText(html, true);
                mailSender.send(message);
                sent = true;
                logger.info("Sent OTP email to {} (attempt {}/{})", to, i, attempts);
            } catch (Exception ex) {
                logger.warn("Attempt {}/{} to send OTP to {} failed: {}", i, attempts, to, ex.toString());
                try { Thread.sleep(backoff); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
            }
        }

        if (!sent) {
            boolean devFallback = Boolean.parseBoolean(env.getProperty("app.mail.dev-fallback", "true"));
            logger.error("All attempts to send OTP email to {} failed", to);
            if (devFallback) {
                logger.warn("[DEV FALLBACK] OTP for {} = {}", to, otp);
            }
        }
    }

    private String buildOtpHtml(String otp) {
        String appName = env.getProperty("spring.application.name", "App");
        return "<html><body>"
                + "<p>Xin chào,</p>"
                + "<p>Mã OTP để đặt lại mật khẩu cho tài khoản của bạn là:</p>"
                + "<h2 style=\"color:#2b7cff\">" + otp + "</h2>"
                + "<p>Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>"
                + "<hr/><p style=\"font-size:12px;color:#666\">" + appName + "</p>"
                + "</body></html>";
    }
}
