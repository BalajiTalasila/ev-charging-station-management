package com.evcharging.service;

import com.evcharging.model.*;
import com.evcharging.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void createNotification(User user, Booking booking,
                                   Notification.NotificationType type,
                                   String title, String message) {
        Notification n = Notification.builder()
                .user(user)
                .booking(booking)
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .build();
        notificationRepository.save(n);
    }

    public List<Map<String, Object>> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(n -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", n.getId());
                    m.put("type", n.getType());
                    m.put("title", n.getTitle());
                    m.put("message", n.getMessage());
                    m.put("isRead", n.getIsRead());
                    m.put("createdAt", n.getCreatedAt());
                    return m;
                }).toList();
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsRead(userId, false);
    }

    public void markAllRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsRead(userId, false);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }
}
