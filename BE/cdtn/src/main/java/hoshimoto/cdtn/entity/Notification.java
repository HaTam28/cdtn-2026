package hoshimoto.cdtn.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import hoshimoto.cdtn.entity.Enum.NotificationTargetType;
import hoshimoto.cdtn.entity.Enum.NotificationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notification")
@Data
@NoArgsConstructor
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userid", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, name = "targettype")
    private NotificationTargetType targetType;

    @Column(name = "targetid")
    private Long targetId;

    @Column(length = 50)
    private String docno;

    @Column(length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "isread")
    private Boolean isRead = false;

    @CreationTimestamp
    @Column(updatable = false, name = "createdat")
    private LocalDateTime createdAt;
}
