package com.evcharging.controller;

import com.evcharging.security.UserDetailsImpl;
import com.evcharging.service.*;
import com.evcharging.repository.ChargerRepository;
import com.evcharging.repository.SlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/manager")
@RequiredArgsConstructor
public class ManagerController {

    private final StationService stationService;
    private final BookingService bookingService;
    private final ChargerService chargerService;
    private final ChargerRepository chargerRepository;
    private final SlotRepository slotRepository;

    @GetMapping("/station")
    public ResponseEntity<?> myStation(@AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(stationService.getManagerStation(user.getId()));
    }

    @GetMapping("/station/chargers")
    public ResponseEntity<?> myChargers(@AuthenticationPrincipal UserDetailsImpl user) {
        Map<String, Object> station = (Map<String, Object>) stationService.getManagerStation(user.getId());
        Long stationId = ((Number) station.get("id")).longValue();
        return ResponseEntity.ok(chargerService.getStationChargers(stationId));
    }

    @PostMapping("/chargers")
    public ResponseEntity<?> addCharger(@AuthenticationPrincipal UserDetailsImpl user,
                                        @RequestBody Map<String, String> body) {
        Map<String, Object> station = (Map<String, Object>) stationService.getManagerStation(user.getId());
        Long stationId = ((Number) station.get("id")).longValue();

        var charger = chargerService.addCharger(
                stationId,
                body.get("type"),
                body.get("chargerNumber")
        );

        return ResponseEntity.ok(Map.of(
                "id", charger.getId(),
                "chargerNumber", charger.getChargerNumber(),
                "chargerType", charger.getChargerType(),
                "powerOutput", charger.getPowerOutput(),
                "status", charger.getStatus(),
                "stationId", stationId
        ));
    }

    @PutMapping("/chargers/{id}/maintenance")
    public ResponseEntity<?> setMaintenance(
            @AuthenticationPrincipal UserDetailsImpl user,
            @PathVariable Long id,
            @RequestParam boolean maintenance) {

        assertManagerOwnsCharger(user, id);

        var charger = chargerService.setMaintenance(id, maintenance);

        return ResponseEntity.ok(Map.of(
                "id", charger.getId(),
                "chargerNumber", charger.getChargerNumber(),
                "chargerType", charger.getChargerType(),
                "powerOutput", charger.getPowerOutput(),
                "status", charger.getStatus()
        ));
    }

    @DeleteMapping("/chargers/{id}")
    public ResponseEntity<?> deleteCharger(
            @AuthenticationPrincipal UserDetailsImpl user,
            @PathVariable Long id) {

        assertManagerOwnsCharger(user, id);

        chargerService.deleteCharger(id);

        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @PutMapping("/slots/{id}/state")
    public ResponseEntity<?> updateSlotState(
            @AuthenticationPrincipal UserDetailsImpl user,
            @PathVariable Long id,
            @RequestParam String state) {

        assertManagerOwnsSlot(user, id);

        return ResponseEntity.ok(chargerService.updateSlotState(id, state));
    }

    @GetMapping("/bookings")
    public ResponseEntity<?> stationBookings(@AuthenticationPrincipal UserDetailsImpl user) {
        Map<String, Object> station = (Map<String, Object>) stationService.getManagerStation(user.getId());
        Long stationId = ((Number) station.get("id")).longValue();
        return ResponseEntity.ok(bookingService.getStationBookings(stationId));
    }

    @PutMapping("/bookings/{id}/cancel")
    public ResponseEntity<?> cancelBooking(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl user) {

        boolean isAdmin = user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        Long managerStationId = isAdmin ? null : getManagerStationId(user.getId());

        bookingService.cancelBookingByManager(
                id,
                user.getId(),
                managerStationId,
                isAdmin
        );

        return ResponseEntity.ok(Map.of("message", "Booking cancelled"));
    }


    @PutMapping("/bookings/{id}/status")
    public ResponseEntity<?> updateBookingStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @AuthenticationPrincipal UserDetailsImpl user) {

        if (!"COMPLETED".equalsIgnoreCase(status)) {
            throw new RuntimeException("Only ACTIVE bookings can be marked COMPLETED.");
        }

        boolean isAdmin = user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        Long managerStationId = isAdmin ? null : getManagerStationId(user.getId());

        var booking = bookingService.completeBookingByManager(
                id, user.getId(), managerStationId, isAdmin
        );

        return ResponseEntity.ok(Map.of(
                "id", booking.getId(),
                "status", booking.getStatus().name(),
                "message", "Booking marked as completed"
        ));
    }
    private Long getManagerStationId(Long managerId) {
        Map<String, Object> station =
                (Map<String, Object>) stationService.getManagerStation(managerId);

        return ((Number) station.get("id")).longValue();
    }

    private void assertManagerOwnsCharger(UserDetailsImpl user, Long chargerId) {
        if (user.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return;
        }

        Long managerStationId = getManagerStationId(user.getId());

        var charger = chargerRepository.findById(chargerId)
                .orElseThrow(() -> new RuntimeException("Charger not found"));

        if (charger.getStation() == null ||
                !managerStationId.equals(charger.getStation().getId())) {
            throw new RuntimeException(
                    "You are not authorized to manage this charger"
            );
        }
    }

    private void assertManagerOwnsSlot(UserDetailsImpl user, Long slotId) {
        if (user.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return;
        }

        Long managerStationId = getManagerStationId(user.getId());

        var slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Slot not found"));

        if (slot.getStation() == null ||
                !managerStationId.equals(slot.getStation().getId())) {
            throw new RuntimeException(
                    "You are not authorized to manage this slot"
            );
        }
    }
}
