package com.evcharging.pattern.observer;

import com.evcharging.model.Booking;
import com.evcharging.model.Notification;
import com.evcharging.model.Notification.NotificationType;
import com.evcharging.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

// Observer Pattern: publishes booking lifecycle events as notifications
@Component
@RequiredArgsConstructor
public class BookingEventPublisher {

    private final NotificationRepository notificationRepository;

    public void publishBookingConfirmed(Booking booking) {
        save(booking, NotificationType.BOOKING_CONFIRMED,
             "Booking Confirmed!",
             "Your charger " + booking.getCharger().getChargerNumber() +
             " at " + booking.getStation().getName() + " is confirmed.");
    }

    public void publishChargingCompleted(Booking booking) {
        save(booking, NotificationType.CHARGING_COMPLETED,
             "Charging Completed",
             "Charging session completed at " + booking.getStation().getName() + ".");
    }

    private void save(Booking booking, NotificationType type, String title, String message) {
        notificationRepository.save(Notification.builder()
                .user(booking.getUser())
                .booking(booking)
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .build());
    }
}
