package com.evcharging.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BookingScheduler {

    private final BookingService bookingService;

    // Every 30 seconds — check for expired bookings and notify waitlist
    @Scheduled(fixedDelay = 30000)
    public void processExpiredBookings() {
        bookingService.completeExpiredBookings();
    }
}
