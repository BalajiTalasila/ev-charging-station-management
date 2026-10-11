package com.evcharging.service;

import com.evcharging.dto.UserResponse;
import com.evcharging.model.*;
import com.evcharging.model.User.Role;
import com.evcharging.model.Slot.SlotState;
import com.evcharging.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final StationRepository stationRepository;
    private final BookingRepository bookingRepository;
    private final SlotRepository slotRepository;
    private final ChargerRepository chargerRepository;
    private final PasswordEncoder passwordEncoder;

    public Map<String, Object> getAnalytics() {
        long totalUsers = userRepository.count();
        long totalStations = stationRepository.count();
        long totalBookings = bookingRepository.count();

        long todayBookings = bookingRepository.countTodayBookings(
                LocalDateTime.now().toLocalDate().atStartOfDay()
        );

        LocalDateTime weekStart = LocalDateTime.now()
                .toLocalDate()
                .with(java.time.DayOfWeek.MONDAY)
                .atStartOfDay();

        double weeklyEnergy =
                bookingRepository.sumEnergyDeliveredSince(weekStart);

        Map<String, Object> analytics = new LinkedHashMap<>();

        analytics.put("totalUsers", totalUsers);
        analytics.put("totalStations", totalStations);
        analytics.put("totalBookings", totalBookings);
        analytics.put("todayBookings", todayBookings);
        analytics.put("totalChargers", chargerRepository.count());

        analytics.put(
                "availableSlots",
                slotRepository.findAll().stream()
                        .filter(s -> s.getSlotState() == SlotState.AVAILABLE)
                        .count()
        );

        analytics.put(
                "managers",
                userRepository.findAll().stream()
                        .filter(u -> u.getRole() == Role.MANAGER)
                        .count()
        );

        analytics.put(
                "weeklyEnergyKwh",
                Math.round(weeklyEnergy * 10.0) / 10.0
        );

        return analytics;
    }

    /**
     * Returns daily booking counts and estimated energy usage
     * for the last seven calendar days, including today.
     */
    public Map<String, Object> getBookingTrends() {
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(6);

        LocalDateTime from = startDate.atStartOfDay();
        LocalDateTime to = today.plusDays(1).atStartOfDay();

        Map<LocalDate, Long> bookingCounts = new HashMap<>();

        for (Object[] row :
                bookingRepository.countBookingsByCreatedDate(from, to)) {

            LocalDate date = toLocalDate(row[0]);

            bookingCounts.put(
                    date,
                    ((Number) row[1]).longValue()
            );
        }

        Map<LocalDate, Double> energyTotals = new HashMap<>();

        for (Object[] row :
                bookingRepository.sumEnergyByCreatedDate(from, to)) {

            LocalDate date = toLocalDate(row[0]);

            energyTotals.put(
                    date,
                    ((Number) row[1]).doubleValue()
            );
        }

        List<Map<String, Object>> daily = new ArrayList<>();

        for (LocalDate date = startDate;
             !date.isAfter(today);
             date = date.plusDays(1)) {

            Map<String, Object> point = new LinkedHashMap<>();

            point.put("date", date.toString());
            point.put("bookings", bookingCounts.getOrDefault(date, 0L));

            point.put(
                    "energyKwh",
                    Math.round(
                            energyTotals.getOrDefault(date, 0.0) * 10.0
                    ) / 10.0
            );

            daily.add(point);
        }

        Map<String, Object> result = new LinkedHashMap<>();

        result.put("daily", daily);

        result.put(
                "energyCalculation",
                "Estimated as charger power output (kW) × " +
                "booking duration (minutes) / 60"
        );

        result.put(
                "energyScope",
                "Completed bookings grouped by booking creation date"
        );

        return result;
    }

    /**
     * Converts a database query date result to LocalDate.
     */
    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate date) {
            return date;
        }

        if (value instanceof Date date) {
            return date.toLocalDate();
        }

        return LocalDate.parse(value.toString());
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.USER)
                .map(this::toUserResponse)
                .toList();
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getVehicleNumber(),
                user.getCity(),
                user.getRole(),
                user.getIsActive(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    public List<UserResponse> getAllManagers() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.MANAGER)
                .map(this::toUserResponse)
                .toList();
    }

    public UserResponse createManager(
            String name,
            String email,
            String password,
            Long stationId
    ) {
        User manager = User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(Role.MANAGER)
                .isActive(true)
                .build();

        manager = userRepository.save(manager);

        if (stationId != null) {
            Station station = stationRepository.findById(stationId)
                    .orElseThrow();

            station.setManager(manager);
            stationRepository.save(station);
        }

        return toUserResponse(manager);
    }

    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
    }

    public UserResponse toggleUserStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow();

        user.setIsActive(!user.getIsActive());
        user = userRepository.save(user);

        return toUserResponse(user);
    }
}