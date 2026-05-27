package hoshimoto.cdtn.config;

import java.util.Properties;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class MailConfig {

    @Bean
    public JavaMailSender javaMailSender(Environment env) {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        String host = env.getProperty("spring.mail.host");
        if (host != null) mailSender.setHost(host);
        String port = env.getProperty("spring.mail.port");
        if (port != null) {
            try { mailSender.setPort(Integer.parseInt(port)); } catch (NumberFormatException ex) { }
        }
        mailSender.setUsername(env.getProperty("spring.mail.username"));
        mailSender.setPassword(env.getProperty("spring.mail.password"));
        mailSender.setDefaultEncoding(env.getProperty("spring.mail.default-encoding", "UTF-8"));

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", env.getProperty("spring.mail.properties.mail.transport.protocol", "smtp"));
        props.put("mail.smtp.auth", env.getProperty("spring.mail.properties.mail.smtp.auth", "true"));
        props.put("mail.smtp.starttls.enable", env.getProperty("spring.mail.properties.mail.smtp.starttls.enable", "true"));
        props.put("mail.smtp.starttls.required", env.getProperty("spring.mail.properties.mail.smtp.starttls.required", "true"));
        props.put("mail.smtp.connectiontimeout", env.getProperty("spring.mail.properties.mail.smtp.connectiontimeout", "10000"));
        props.put("mail.smtp.timeout", env.getProperty("spring.mail.properties.mail.smtp.timeout", "10000"));
        props.put("mail.smtp.writetimeout", env.getProperty("spring.mail.properties.mail.smtp.writetimeout", "10000"));
        props.put("mail.smtp.ssl.trust", env.getProperty("spring.mail.properties.mail.smtp.ssl.trust", "*"));
        props.put("mail.debug", env.getProperty("spring.mail.properties.mail.debug", "false"));

        return mailSender;
    }

    @Bean(name = "mailTaskExecutor")
    public ThreadPoolTaskExecutor mailTaskExecutor(Environment env) {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(Integer.parseInt(env.getProperty("app.mail.executor.corePoolSize", "2")));
        exec.setMaxPoolSize(Integer.parseInt(env.getProperty("app.mail.executor.maxPoolSize", "5")));
        exec.setQueueCapacity(Integer.parseInt(env.getProperty("app.mail.executor.queueCapacity", "50")));
        exec.setThreadNamePrefix("mail-exec-");
        exec.initialize();
        return exec;
    }
}
