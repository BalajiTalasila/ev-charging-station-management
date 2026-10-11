
package com.evcharging.controller;

import com.evcharging.dto.StationRequest;
import com.evcharging.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final StationService stationService;
    private final BookingService bookingService;
    private final ChargerService chargerService;

    @GetMapping("/analytics")
    public ResponseEntity<?> analytics() {
        return ResponseEntity.ok(adminService.getAnalytics());
    }

    // Seven-day booking and estimated energy data for analytics charts.
    @GetMapping("/analytics/booking-trends")
    public ResponseEntity<?> bookingTrends() {
        return ResponseEntity.ok(adminService.getBookingTrends());
    }

    @GetMapping("/users")
    public ResponseEntity<?> users() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/managers")
    public ResponseEntity<?> managers() {
        return ResponseEntity.ok(adminService.getAllManagers());
    }

    @PostMapping("/managers")
    public ResponseEntity<?> createManager(
            @RequestBody Map<String, Object> body
    ) {
        Long stationId = null;
        Object sid = body.get("stationId");

        if (sid != null && !sid.toString().isEmpty()) {
            stationId = Long.parseLong(sid.toString());
        }

        return ResponseEntity.ok(
                adminService.createManager(
                        (String) body.get("name"),
                        (String) body.get("email"),
                        (String) body.get("password"),
                        stationId
                )
        );
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @PutMapping("/users/{id}/toggle")
    public ResponseEntity<?> toggleUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.toggleUserStatus(id));
    }

    @GetMapping("/stations")
    public ResponseEntity<?> stations() {
        return ResponseEntity.ok(stationService.getAllStations());
    }

    @PostMapping("/stations")
    public ResponseEntity<?> createStation(
            @RequestBody StationRequest req
    ) {
        return ResponseEntity.ok(stationService.createStation(req));
    }

    @PutMapping("/stations/{id}")
    public ResponseEntity<?> updateStation(
            @PathVariable Long id,
            @RequestBody StationRequest req
    ) {
        return ResponseEntity.ok(
                stationService.updateStation(id, req)
        );
    }

    @DeleteMapping("/stations/{id}")
    public ResponseEntity<?> deleteStation(@PathVariable Long id) {
        stationService.deleteStation(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @GetMapping("/bookings")
    public ResponseEntity<?> allBookings() {
        return ResponseEntity.ok(bookingService.getAllBookings());
    }

    @PostMapping("/stations/{stationId}/chargers")
    public ResponseEntity<?> addCharger(
            @PathVariable Long stationId,
            @RequestBody Map<String, Object> body
    ) {
        String type = (String) body.get("chargerType");
        String number = (String) body.get("chargerNumber");

        var charger = chargerService.addCharger(
                stationId,
                type,
                number
        );

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", charger.getId());
        result.put("chargerNumber", charger.getChargerNumber());
        result.put("chargerType", charger.getChargerType());
        result.put("powerOutput", charger.getPowerOutput());
        result.put("status", charger.getStatus());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/stations/{stationId}/chargers")
    public ResponseEntity<?> getChargers(
            @PathVariable Long stationId
    ) {
        return ResponseEntity.ok(
                chargerService.getStationChargers(stationId)
        );
    }

    @DeleteMapping("/chargers/{chargerId}")
    public ResponseEntity<?> deleteCharger(
            @PathVariable Long chargerId
    ) {
        chargerService.deleteCharger(chargerId);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }
}