package hoshimoto.cdtn.service;

import java.time.Instant;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteBatch;

import hoshimoto.cdtn.config.FirebaseClient;
import hoshimoto.cdtn.entity.Notification;

@Service
public class FirebaseNotificationService {
    private static final Logger logger = LoggerFactory.getLogger(FirebaseNotificationService.class);

    private final FirebaseClient firebaseClient;

    public FirebaseNotificationService(FirebaseClient firebaseClient) {
        this.firebaseClient = firebaseClient;
    }

    public void syncNotification(Notification notification) {
        Firestore firestore = firebaseClient.getFirestore();
        if (firestore == null || notification == null || notification.getUser() == null) {
            return;
        }
        try {
            Map<String, Object> data = buildPayload(notification);
            DocumentReference ref = docRef(firestore, notification.getUser().getId(), notification.getId());
            ref.set(data);
        } catch (Exception ex) {
            logger.warn("Failed to sync notification to Firestore", ex);
        }
    }

    public void syncReadAll(Long userId, List<Notification> notifications) {
        Firestore firestore = firebaseClient.getFirestore();
        if (firestore == null || userId == null || notifications == null || notifications.isEmpty()) {
            return;
        }
        try {
            WriteBatch batch = firestore.batch();
            for (Notification notification : notifications) {
                if (notification == null || notification.getId() == null) continue;
                DocumentReference ref = docRef(firestore, userId, notification.getId());
                batch.update(ref, "isRead", true);
            }
            batch.commit();
        } catch (Exception ex) {
            logger.warn("Failed to sync read-all to Firestore", ex);
        }
    }

    private DocumentReference docRef(Firestore firestore, Long userId, Long notificationId) {
        return firestore.collection("users")
                .document(String.valueOf(userId))
                .collection("notifications")
                .document(String.valueOf(notificationId));
    }

    private Map<String, Object> buildPayload(Notification notification) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", notification.getId());
        data.put("type", notification.getType() != null ? notification.getType().name() : null);
        data.put("targetType", notification.getTargetType() != null ? notification.getTargetType().name() : null);
        data.put("targetId", notification.getTargetId());
        data.put("docno", notification.getDocno());
        data.put("title", notification.getTitle());
        data.put("message", notification.getMessage());
        data.put("isRead", Boolean.TRUE.equals(notification.getIsRead()));

        Instant created = notification.getCreatedAt() != null
                ? notification.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant()
                : Instant.now();
        data.put("createdAt", Timestamp.ofTimeSecondsAndNanos(created.getEpochSecond(), created.getNano()));

        return data;
    }
}
