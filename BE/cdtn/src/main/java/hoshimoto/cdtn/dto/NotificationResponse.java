package hoshimoto.cdtn.dto;

import java.time.LocalDateTime;

import hoshimoto.cdtn.entity.Enum.NotificationTargetType;
import hoshimoto.cdtn.entity.Enum.NotificationType;
import lombok.Data;

@Data
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private NotificationTargetType targetType;
    private Long targetId;
    private String docno;
    private String title;
    private String message;
    private Boolean isRead;
    private LocalDateTime createdAt;
    private String targetUrl;
}
