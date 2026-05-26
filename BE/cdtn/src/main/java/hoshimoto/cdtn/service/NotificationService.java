package hoshimoto.cdtn.service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hoshimoto.cdtn.dto.NotificationResponse;
import hoshimoto.cdtn.entity.Enum.NotificationTargetType;
import hoshimoto.cdtn.entity.Enum.NotificationType;
import hoshimoto.cdtn.entity.Enum.Role;
import hoshimoto.cdtn.entity.Notification;
import hoshimoto.cdtn.entity.User;
import hoshimoto.cdtn.repository.NotificationRepository;
import hoshimoto.cdtn.repository.UserRepository;

@Service
public class NotificationService {

    @Autowired private NotificationRepository notificationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private FirebaseNotificationService firebaseNotificationService;

    public List<NotificationResponse> getForCurrentUser() {
        var optUser = getCurrentUser();
        if (optUser.isEmpty()) return List.of();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(optUser.get().getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public long countUnreadForCurrentUser() {
        var optUser = getCurrentUser();
        if (optUser.isEmpty()) return 0;
        return notificationRepository.countByUserIdAndIsReadFalse(optUser.get().getId());
    }

    @Transactional
    public void markRead(Long id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông báo id: " + id));
        var optUser = getCurrentUser();
        if (optUser.isEmpty() || n.getUser() == null || !n.getUser().getId().equals(optUser.get().getId())) {
            throw new RuntimeException("Bạn không có quyền cập nhật thông báo này");
        }
        n.setIsRead(true);
        Notification saved = notificationRepository.save(n);
        firebaseNotificationService.syncNotification(saved);
    }

    @Transactional
    public void markAllRead() {
        var optUser = getCurrentUser();
        if (optUser.isEmpty()) return;
        List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(optUser.get().getId());
        for (Notification n : list) {
            if (!Boolean.TRUE.equals(n.getIsRead())) {
                n.setIsRead(true);
            }
        }
        List<Notification> saved = notificationRepository.saveAll(list);
        firebaseNotificationService.syncReadAll(optUser.get().getId(), saved);
    }

    @Transactional
    public void notifyManagers(NotificationType type, NotificationTargetType targetType, Long targetId, String docno, String title, String message) {
        List<User> managers = userRepository.findByRole(Role.MANAGER);
        for (User manager : managers) {
            createNotification(manager, type, targetType, targetId, docno, title, message);
        }
    }

    @Transactional
    public void notifyUser(User user, NotificationType type, NotificationTargetType targetType, Long targetId, String docno, String title, String message) {
        if (user == null) return;
        createNotification(user, type, targetType, targetId, docno, title, message);
    }

    private void createNotification(User user, NotificationType type, NotificationTargetType targetType, Long targetId, String docno, String title, String message) {
        Notification n = new Notification();
        n.setUser(user);
        n.setType(type);
        n.setTargetType(targetType);
        n.setTargetId(targetId);
        n.setDocno(docno);
        n.setTitle(title);
        n.setMessage(message);
        n.setIsRead(false);
        Notification saved = notificationRepository.save(n);
        firebaseNotificationService.syncNotification(saved);
    }

    private NotificationResponse toResponse(Notification n) {
        NotificationResponse res = new NotificationResponse();
        res.setId(n.getId());
        res.setType(n.getType());
        res.setTargetType(n.getTargetType());
        res.setTargetId(n.getTargetId());
        res.setDocno(n.getDocno());
        res.setTitle(n.getTitle());
        res.setMessage(n.getMessage());
        res.setIsRead(n.getIsRead());
        res.setCreatedAt(n.getCreatedAt());
        res.setTargetUrl(buildTargetUrl(n.getTargetType(), n.getTargetId()));
        return res;
    }

    private String buildTargetUrl(NotificationTargetType targetType, Long targetId) {
        if (targetType == null || targetId == null) return null;
        switch (targetType) {
            case GOODS_RECEIPT:
                return "/receipts/" + targetId;
            case GOODS_ISSUE:
                return "/issues/" + targetId;
            case INVENTORY_AUDIT:
                return "/audits/" + targetId;
            default:
                return null;
        }
    }

    private Optional<User> getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return Optional.empty();
        return userRepository.findByUsername(auth.getName());
    }
}
