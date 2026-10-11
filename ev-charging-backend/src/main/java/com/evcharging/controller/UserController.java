package com.evcharging.controller;

import com.evcharging.security.UserDetailsImpl;
import com.evcharging.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final StationService stationService;
    private final BookingService bookingService;
    private final ChargerService chargerService;
    private final NotificationService notificationService;
    private final OtpService otpService;
    private final com.evcharging.repository.UserRepository userRepository;

    @GetMapping("/stations/nearby")
    public ResponseEntity<?> nearbyStations(@RequestParam double lat, @RequestParam double lng) {
        return ResponseEntity.ok(stationService.getNearbyStations(lat, lng));
    }

    @GetMapping("/stations/city")
    public ResponseEntity<?> stationsByCity(@RequestParam String city) {
        return ResponseEntity.ok(stationService.getStationsByCity(city));
    }

    @GetMapping("/stations/{id}")
    public ResponseEntity<?> stationDetails(@PathVariable Long id) {
        return ResponseEntity.ok(stationService.getStationById(id));
    }

    @GetMapping("/stations/{id}/chargers")
    public ResponseEntity<?> stationChargers(@PathVariable Long id) {
        return ResponseEntity.ok(chargerService.getStationChargersWithStatus(id));
    }

    // Step 1 — Send OTP before booking
    @PostMapping("/chargers/{chargerId}/send-otp")
    public ResponseEntity<?> sendOtp(
            @AuthenticationPrincipal UserDetailsImpl user,
            @PathVariable Long chargerId) {
        var u = userRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        otpService.generateAndSend(user.getId(), u.getEmail());
        return ResponseEntity.ok(Map.of("message", "OTP sent to " + u.getEmail()));
    }

    // Step 2 — Verify OTP then book
    @PostMapping("/chargers/{chargerId}/verify-and-book")
    public ResponseEntity<?> verifyAndBook(
            @AuthenticationPrincipal UserDetailsImpl user,
            @PathVariable Long chargerId,
            @RequestBody Map<String, Object> body) {
        String otp = body.get("otp").toString();
        if (!otpService.verify(user.getId(), otp)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or expired OTP"));
        }
        int duration = Integer.parseInt(body.get("durationMinutes").toString());
        int battery  = Integer.parseInt(body.get("batteryPercentage").toString());
        java.time.LocalDateTime scheduledStart = null;
        if (body.get("scheduledStart") != null) {
            scheduledStart = java.time.LocalDateTime.parse(body.get("scheduledStart").toString());
        }
        return ResponseEntity.ok(bookingService.bookCharger(user.getId(), chargerId, duration, battery, scheduledStart));
    }
    @GetMapping("/bookings")
    public ResponseEntity<?> myBookings(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(bookingService.getUserBookings(user.getId()));
    }

    @PutMapping("/bookings/{bookingId}/cancel")
    public ResponseEntity<?> cancelBooking(
            @AuthenticationPrincipal UserDetailsImpl user,
            @PathVariable Long bookingId) {
        bookingService.cancelBooking(bookingId, user.getId());
        return ResponseEntity.ok(Map.of("message", "Booking cancelled"));
    }

    @GetMapping("/waitlist")
    public ResponseEntity<?> myWaitlist(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(bookingService.getUserWaitlist(user.getId()));
    }

    // Get bookings for a charger on a specific date (for timeline view)
    @GetMapping("/chargers/{chargerId}/schedule")
    public ResponseEntity<?> chargerSchedule(@PathVariable Long chargerId,
                                              @RequestParam String date) {
        java.time.LocalDate d = java.time.LocalDate.parse(date);
        java.time.LocalDateTime start = d.atStartOfDay();
        java.time.LocalDateTime end = d.plusDays(1).atStartOfDay();
        var bookings = bookingService.getChargerSchedule(chargerId, start, end);
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/chargers/{chargerId}/waitlist")
    public ResponseEntity<?> chargerWaitlist(@PathVariable Long chargerId) {
        return ResponseEntity.ok(bookingService.getChargerWaitlist(chargerId));
    }

    @GetMapping("/notifications")
    public ResponseEntity<?> notifications(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(notificationService.getUserNotifications(user.getId()));
    }

    @GetMapping("/notifications/unread-count")
    public ResponseEntity<?> unreadCount(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(user.getId())));
    }

    @PutMapping("/notifications/mark-all-read")
    public ResponseEntity<?> markAllRead(@AuthenticationPrincipal UserDetailsImpl user) {
        notificationService.markAllRead(user.getId());
        return ResponseEntity.ok(Map.of("message", "Marked all as read"));
    }

    @GetMapping("/profile")
    public ResponseEntity<?> profile(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        var user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", user.getId());
        result.put("name", user.getName());
        result.put("email", user.getEmail());
        result.put("phone", user.getPhone());
        result.put("vehicleNumber", user.getVehicleNumber());
        result.put("city", user.getCity());
        result.put("role", user.getRole());
        result.put("isActive", user.getIsActive());
        result.put("createdAt", user.getCreatedAt());
        return ResponseEntity.ok(result);
    }
}
