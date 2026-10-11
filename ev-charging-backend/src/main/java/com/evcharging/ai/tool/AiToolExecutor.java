package com.evcharging.ai.tool;

import com.evcharging.model.Charger;
import com.evcharging.model.Slot;
import com.evcharging.security.UserDetailsImpl;
import com.evcharging.service.AdminService;
import com.evcharging.service.BookingService;
import com.evcharging.service.ChargerService;
import com.evcharging.service.NotificationService;
import com.evcharging.service.OtpService;
import com.evcharging.service.StationService;
import com.evcharging.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class AiToolExecutor {

    private final AdminService adminService;
    private final StationService stationService;
    private final ChargerService chargerService;
    private final BookingService bookingService;
    private final NotificationService notificationService;
    private final OtpService otpService;
    private final UserRepository userRepository;

    private final Map<Long, PendingBooking> pendingBookings =
            new ConcurrentHashMap<>();

    public Object execute(
            String toolName,
            Map<String, Object> arguments,
            Authentication authentication,
            boolean confirmed
    ) {
        if (toolName == null || toolName.isBlank()) {
            throw new IllegalArgumentException("Tool name is required");
        }

        toolName = normalizeToolName(toolName);

        if (isStateChangingTool(toolName) && !confirmed) {
            throw new IllegalStateException(
                    "Confirmation is required before performing this state-changing operation."
            );
        }

        requireAuthenticated(authentication);

        if (arguments == null) {
            arguments = Map.of();
        }

        return switch (toolName) {
            case "find_nearby_stations" ->
                    executeFindNearbyStations(arguments, authentication);

            case "search_stations" ->
                    executeSearchStations(arguments, authentication);

            case "get_station_details" ->
                    executeGetStationDetails(arguments, authentication);

            case "find_available_chargers" ->
                    executeFindAvailableChargers(arguments, authentication);

            case "get_charger_schedule" ->
                    executeGetChargerSchedule(arguments, authentication);

            case "create_booking" ->
                    executeCreateBooking(arguments, authentication);

            case "join_waitlist" ->
                    executeJoinWaitlist(arguments, authentication);

            case "get_my_bookings" ->
                    executeGetMyBookings(authentication);

            case "cancel_my_booking" ->
                    executeCancelMyBooking(arguments, authentication);

            case "get_my_waitlist" ->
                    executeGetMyWaitlist(authentication);

            case "get_my_notifications" ->
                    executeGetMyNotifications(authentication);

            case "get_my_station" ->
                    executeGetMyStation(authentication);

            case "get_station_chargers" ->
                    executeGetStationChargers(authentication);

            case "get_station_bookings" ->
                    executeGetStationBookings(authentication);

            case "add_charger" ->
                    executeManagerAddCharger(arguments, authentication);

            case "remove_charger" ->
                    executeManagerRemoveCharger(arguments, authentication);

            case "set_charger_maintenance" ->
                    executeManagerSetMaintenance(arguments, authentication);

            case "update_slot_state" ->
                    executeManagerUpdateSlotState(arguments, authentication);

            case "cancel_station_booking" ->
                    executeManagerCancelBooking(arguments, authentication);

            case "get_system_analytics" ->
                    executeGetSystemAnalytics(authentication);

            case "get_all_users" ->
                    executeGetAllUsers(authentication);

            case "get_all_managers" ->
                    executeGetAllManagers(authentication);

            case "create_manager" ->
                    executeCreateManager(arguments, authentication);

            case "toggle_user_status" ->
                    executeToggleUserStatus(arguments, authentication);

            case "delete_user" ->
                    executeDeleteUser(arguments, authentication);

            case "get_all_stations" ->
                    executeGetAllStations(authentication);

            case "get_all_chargers" ->
                    executeGetAllChargers(arguments, authentication);

            case "admin_add_charger" ->
                    executeAdminAddCharger(arguments, authentication);

            case "admin_remove_charger" ->
                    executeAdminRemoveCharger(arguments, authentication);

            case "view_all_bookings" ->
                    executeViewAllBookings(authentication);

            default ->
                    throw new IllegalArgumentException(
                            "Unknown AI tool: " + toolName
                    );
        };
    }

    /*
     * Called directly by OllamaService when the user enters a 6-digit OTP.
     *
     * IMPORTANT:
     * The booking is created only after OtpService.verify() succeeds.
     */
    public Object verifyPendingBookingOtp(
            Authentication authentication,
            String inputOtp
    ) {
        requireRole(authentication, "ROLE_USER");

        Long userId = getAuthenticatedUserId(authentication);

        PendingBooking pending = pendingBookings.get(userId);

        if (pending == null) {
            return Map.of(
                    "status", "NO_PENDING_BOOKING",
                    "message",
                    "There is no pending AI booking awaiting OTP verification."
            );
        }

        if (inputOtp == null || !inputOtp.matches("\\d{6}")) {
            return Map.of(
                    "status", "INVALID_OTP",
                    "message",
                    "Please enter the 6-digit OTP sent to your registered email."
            );
        }

        boolean valid = otpService.verify(userId, inputOtp);

        if (!valid) {
            return Map.of(
                    "status", "INVALID_OTP",
                    "message",
                    "Invalid or expired OTP. Please request a new booking OTP."
            );
        }

        try {
            Object booking = bookingService.bookCharger(
                    userId,
                    pending.chargerId(),
                    pending.durationMinutes(),
                    pending.batteryPercentage(),
                    pending.scheduledStart()
            );

            pendingBookings.remove(userId);

            return Map.of(
                    "status", "BOOKED",
                    "message", "OTP verified successfully. Booking created.",
                    "booking", booking
            );

        } catch (RuntimeException ex) {
            pendingBookings.remove(userId);
            throw ex;
        }
    }

    public boolean hasPendingBooking(Authentication authentication) {
        if (authentication == null ||
                !authentication.isAuthenticated()) {
            return false;
        }

        try {
            Long userId = getAuthenticatedUserId(authentication);
            return pendingBookings.containsKey(userId);
        } catch (Exception ex) {
            return false;
        }
    }

    private List<Map<String, Object>> executeFindNearbyStations(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireAnyRole(
                authentication,
                "ROLE_USER",
                "ROLE_MANAGER",
                "ROLE_ADMIN"
        );

        double latitude = getDoubleArgument(arguments, "latitude");
        double longitude = getDoubleArgument(arguments, "longitude");

        return stationService.getNearbyStations(latitude, longitude);
    }

    private List<Map<String, Object>> executeSearchStations(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireAnyRole(
                authentication,
                "ROLE_USER",
                "ROLE_MANAGER",
                "ROLE_ADMIN"
        );

        String query = getStringArgument(arguments, "query")
                .trim()
                .toLowerCase();

        if (query.isBlank()) {
            throw new IllegalArgumentException(
                    "Station search query is required"
            );
        }

        return stationService.getAllStations()
                .stream()
                .filter(station -> {
                    String name = String.valueOf(
                            station.getOrDefault("name", "")
                    ).toLowerCase();

                    String city = String.valueOf(
                            station.getOrDefault("city", "")
                    ).toLowerCase();

                    String address = String.valueOf(
                            station.getOrDefault("address", "")
                    ).toLowerCase();

                    return name.contains(query)
                            || city.contains(query)
                            || address.contains(query);
                })
                .toList();
    }

    private Map<String, Object> executeGetStationDetails(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireAnyRole(
                authentication,
                "ROLE_USER",
                "ROLE_MANAGER",
                "ROLE_ADMIN"
        );

        long stationId = getLongArgument(arguments, "stationId");

        return stationService.getStationById(stationId);
    }

    private List<Map<String, Object>> executeFindAvailableChargers(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireAnyRole(
                authentication,
                "ROLE_USER",
                "ROLE_MANAGER",
                "ROLE_ADMIN"
        );

        long stationId = getLongArgument(arguments, "stationId");

        return chargerService.getStationChargersWithStatus(stationId)
                .stream()
                .filter(charger -> {
                    Object status = charger.get("status");
                    Object occupied = charger.get("occupied");

                    return !"MAINTENANCE".equals(
                            String.valueOf(status)
                    ) && !Boolean.TRUE.equals(occupied);
                })
                .toList();
    }

    private List<Map<String, Object>> executeGetChargerSchedule(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireAnyRole(
                authentication,
                "ROLE_USER",
                "ROLE_MANAGER",
                "ROLE_ADMIN"
        );

        long chargerId = getLongArgument(arguments, "chargerId");
        String date = getStringArgument(arguments, "date");

        LocalDate selectedDate = LocalDate.parse(date);

        LocalDateTime dayStart = selectedDate.atStartOfDay();
        LocalDateTime dayEnd = selectedDate.atTime(LocalTime.MAX);

        return bookingService.getChargerSchedule(
                chargerId,
                dayStart,
                dayEnd
        );
    }

    /*
     * AI booking flow:
     *
     * confirmed=false
     *     -> blocked by execute() confirmation check.
     *
     * confirmed=true
     *     -> OTP is generated and sent.
     *     -> booking is NOT created.
     *
     * Final booking occurs only inside verifyPendingBookingOtp().
     */
    private Object executeCreateBooking(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_USER");

        Long userId = getAuthenticatedUserId(authentication);

        long chargerId =
                getLongArgument(arguments, "chargerId");

        int durationMinutes =
                getIntArgument(arguments, "durationMinutes");

        int batteryPercentage =
                getIntArgument(arguments, "batteryPercentage");

        LocalDateTime scheduledStart = null;

        Object start = arguments.get("scheduledStart");

        if (start != null &&
                !String.valueOf(start).isBlank()) {

            scheduledStart = LocalDateTime.parse(
                    String.valueOf(start)
            );
        }

        var user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Authenticated user not found"
                        )
                );

        pendingBookings.put(
                userId,
                new PendingBooking(
                        chargerId,
                        durationMinutes,
                        batteryPercentage,
                        scheduledStart
                )
        );

        otpService.generateAndSend(
                userId,
                user.getEmail()
        );

        return Map.of(
                "status",
                "OTP_REQUIRED",

                "message",
                "OTP sent to your registered email. " +
                "Please enter the 6-digit OTP to complete the booking.",

                "chargerId",
                chargerId,

                "durationMinutes",
                durationMinutes,

                "batteryPercentage",
                batteryPercentage
        );
    }

    private Object executeJoinWaitlist(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_USER");

        Long userId = getAuthenticatedUserId(authentication);

        long chargerId =
                getLongArgument(arguments, "chargerId");

        int durationMinutes =
                getIntArgument(arguments, "durationMinutes");

        int batteryPercentage =
                getIntArgument(arguments, "batteryPercentage");

        return bookingService.joinWaitlist(
                userId,
                chargerId,
                durationMinutes,
                batteryPercentage
        );
    }

    private List<Map<String, Object>> executeGetMyBookings(
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_USER");

        Long userId = getAuthenticatedUserId(authentication);

        return bookingService.getUserBookings(userId);
    }

    private Map<String, Object> executeCancelMyBooking(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_USER");

        Long userId = getAuthenticatedUserId(authentication);

        long bookingId =
                getLongArgument(arguments, "bookingId");

        boolean belongsToUser = bookingService.getUserBookings(userId)
                .stream()
                .anyMatch(booking -> booking.get("id") instanceof Number
                        && ((Number) booking.get("id")).longValue() == bookingId);

        if (!belongsToUser) {
            throw new IllegalArgumentException(
                    "I could not match that ID to one of your bookings. Please check your booking history and try again."
            );
        }

        bookingService.cancelBooking(
                bookingId,
                userId
        );

        return Map.of(
                "success",
                true,

                "message",
                "Your booking has been cancelled.",

                "bookingId",
                bookingId
        );
    }

    private List<Map<String, Object>> executeGetMyWaitlist(
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_USER");

        Long userId = getAuthenticatedUserId(authentication);

        return bookingService.getUserWaitlist(userId);
    }

    private List<Map<String, Object>> executeGetMyNotifications(
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_USER");

        Long userId = getAuthenticatedUserId(authentication);

        return notificationService.getUserNotifications(userId);
    }

    private Map<String, Object> executeGetMyStation(
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_MANAGER");

        Long managerId =
                getAuthenticatedUserId(authentication);

        return stationService.getManagerStation(managerId);
    }

    private List<Map<String, Object>> executeGetStationChargers(
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_MANAGER");

        Long managerId =
                getAuthenticatedUserId(authentication);

        Map<String, Object> station =
                stationService.getManagerStation(managerId);

        Long stationId =
                ((Number) station.get("id")).longValue();

        return chargerService.getStationChargers(stationId);
    }

    private List<Map<String, Object>> executeGetStationBookings(
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_MANAGER");

        Long managerId =
                getAuthenticatedUserId(authentication);

        Map<String, Object> station =
                stationService.getManagerStation(managerId);

        Long stationId =
                ((Number) station.get("id")).longValue();

        return bookingService.getStationBookings(stationId);
    }

    private Object executeManagerAddCharger(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_MANAGER");

        Long managerId =
                getAuthenticatedUserId(authentication);

        Map<String, Object> station =
                stationService.getManagerStation(managerId);

        Long stationId =
                ((Number) station.get("id")).longValue();

        String type =
                getStringArgument(arguments, "type");

        String chargerNumber =
                getStringArgument(arguments, "chargerNumber");

        Charger charger =
                chargerService.addCharger(
                        stationId,
                        type,
                        chargerNumber
                );

        return Map.of(
                "id",
                charger.getId(),

                "stationId",
                stationId,

                "chargerNumber",
                charger.getChargerNumber(),

                "chargerType",
                charger.getChargerType(),

                "powerOutput",
                charger.getPowerOutput(),

                "status",
                charger.getStatus()
        );
    }

    private Object executeManagerRemoveCharger(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_MANAGER");

        long chargerId =
                getLongArgument(arguments, "chargerId");

        assertManagerOwnsCharger(
                authentication,
                chargerId
        );

        chargerService.deleteCharger(chargerId);

        return Map.of(
                "success",
                true,

                "message",
                "Charger deleted.",

                "chargerId",
                chargerId
        );
    }

    private Object executeManagerSetMaintenance(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireAnyRole(
                authentication,
                "ROLE_MANAGER",
                "ROLE_ADMIN"
        );

        long chargerId =
                getLongArgument(arguments, "chargerId");

        boolean maintenance =
                getBooleanArgument(arguments, "maintenance");

        if (hasRole(authentication, "ROLE_MANAGER")) {
            assertManagerOwnsCharger(
                    authentication,
                    chargerId
            );
        }

        Charger charger =
                chargerService.setMaintenance(
                        chargerId,
                        maintenance
                );

        return Map.of(
                "id",
                charger.getId(),

                "chargerNumber",
                charger.getChargerNumber(),

                "status",
                charger.getStatus()
        );
    }

    private Object executeManagerUpdateSlotState(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_MANAGER");

        long slotId =
                getLongArgument(arguments, "slotId");

        String state =
                getStringArgument(arguments, "state");

        assertManagerOwnsSlot(
                authentication,
                slotId
        );

        Slot slot =
                chargerService.updateSlotState(
                        slotId,
                        state
                );

        return Map.of(
                "id",
                slot.getId(),

                "slotNumber",
                slot.getSlotNumber(),

                "slotState",
                slot.getSlotState()
        );
    }

    private Object executeManagerCancelBooking(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_MANAGER");

        long bookingId =
                getLongArgument(arguments, "bookingId");

        Long managerId =
                getAuthenticatedUserId(authentication);

        Map<String, Object> station =
                stationService.getManagerStation(managerId);

        Long managerStationId =
                ((Number) station.get("id")).longValue();

        bookingService.cancelBookingByManager(
                bookingId,
                managerId,
                managerStationId,
                false
        );

        return Map.of(
                "success",
                true,

                "message",
                "Station booking cancelled.",

                "bookingId",
                bookingId
        );
    }

    private Map<String, Object> executeGetSystemAnalytics(
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_ADMIN");
        return adminService.getAnalytics();
    }

    private Object executeGetAllUsers(
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_ADMIN");
        return adminService.getAllUsers();
    }

    private Object executeGetAllManagers(
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_ADMIN");
        return adminService.getAllManagers();
    }

    private Object executeCreateManager(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_ADMIN");

        String name =
                getStringArgument(arguments, "name");

        String email =
                getStringArgument(arguments, "email");

        String password =
                getStringArgument(arguments, "password");

        Long stationId = null;

        Object station =
                arguments.get("stationId");

        if (station != null &&
                !String.valueOf(station).isBlank()) {

            stationId =
                    Long.parseLong(
                            String.valueOf(station)
                    );
        }

        return adminService.createManager(
                name,
                email,
                password,
                stationId
        );
    }

    private Object executeToggleUserStatus(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_ADMIN");

        long userId =
                getLongArgument(arguments, "userId");

        return adminService.toggleUserStatus(userId);
    }

    private Object executeDeleteUser(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_ADMIN");

        long userId =
                getLongArgument(arguments, "userId");

        adminService.deleteUser(userId);

        return Map.of(
                "success",
                true,

                "message",
                "User deleted.",

                "userId",
                userId
        );
    }

    private List<Map<String, Object>> executeGetAllStations(
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_ADMIN");

        return stationService.getAllStations();
    }

    private Object executeGetAllChargers(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_ADMIN");

        Object stationValue = arguments.get("stationId");

        // Preserve station-specific admin requests.
        if (stationValue != null && !String.valueOf(stationValue).isBlank()) {
            long stationId = Long.parseLong(String.valueOf(stationValue));
            return chargerService.getStationChargers(stationId);
        }

        // If no station is specified, gather chargers from every station.
        List<Map<String, Object>> allChargers = new java.util.ArrayList<>();

        for (Map<String, Object> station : stationService.getAllStations()) {
            Object idValue = station.get("id");

            if (!(idValue instanceof Number)) {
                continue;
            }

            long stationId = ((Number) idValue).longValue();

            for (Map<String, Object> charger :
                    chargerService.getStationChargers(stationId)) {

                Map<String, Object> enriched = new java.util.LinkedHashMap<>(charger);
                enriched.put("stationId", stationId);
                enriched.put("stationName", station.get("name"));
                allChargers.add(enriched);
            }
        }

        return allChargers;
    }

    private Object executeAdminAddCharger(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_ADMIN");

        long stationId =
                getLongArgument(arguments, "stationId");

        String type =
                getStringArgument(arguments, "type");

        String chargerNumber =
                getStringArgument(arguments, "chargerNumber");

        Charger charger =
                chargerService.addCharger(
                        stationId,
                        type,
                        chargerNumber
                );

        return Map.of(
                "id",
                charger.getId(),

                "stationId",
                stationId,

                "chargerNumber",
                charger.getChargerNumber(),

                "chargerType",
                charger.getChargerType(),

                "powerOutput",
                charger.getPowerOutput(),

                "status",
                charger.getStatus()
        );
    }

    private Object executeAdminRemoveCharger(
            Map<String, Object> arguments,
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_ADMIN");

        long chargerId =
                getLongArgument(arguments, "chargerId");

        chargerService.deleteCharger(chargerId);

        return Map.of(
                "success",
                true,

                "message",
                "Charger deleted.",

                "chargerId",
                chargerId
        );
    }

    private List<Map<String, Object>> executeViewAllBookings(
            Authentication authentication
    ) {
        requireRole(authentication, "ROLE_ADMIN");

        return bookingService.getAllBookings();
    }

    private String normalizeToolName(String toolName) {
        return switch (toolName.trim()) {
            case "use_search_stations_tool",
                 "use_search_stations",
                 "search_station",
                 "search_station_tool" ->
                    "search_stations";

            default ->
                    toolName.trim();
        };
    }

    private void requireAuthenticated(
            Authentication authentication
    ) {
        if (authentication == null ||
                !authentication.isAuthenticated() ||
                authentication.getAuthorities() == null) {

            throw new SecurityException(
                    "Authentication is required"
            );
        }
    }

    private void requireRole(
            Authentication authentication,
            String requiredRole
    ) {
        boolean allowed =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                requiredRole.equals(
                                        authority.getAuthority()
                                )
                        );

        if (!allowed) {
            throw new SecurityException(
                    "You are not authorized to use this AI tool"
            );
        }
    }

    private boolean hasRole(
            Authentication authentication,
            String role
    ) {
        return authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        role.equals(
                                authority.getAuthority()
                        )
                );
    }

    private void requireAnyRole(
            Authentication authentication,
            String... allowedRoles
    ) {
        boolean allowed =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                Arrays.asList(allowedRoles)
                                        .contains(
                                                authority.getAuthority()
                                        )
                        );

        if (!allowed) {
            throw new SecurityException(
                    "You are not authorized to use this AI tool"
            );
        }
    }

    private Long getAuthenticatedUserId(
            Authentication authentication
    ) {
        Object principal =
                authentication.getPrincipal();

        if (!(principal instanceof UserDetailsImpl)) {
            throw new SecurityException(
                    "Authenticated user details are unavailable"
            );
        }

        UserDetailsImpl user =
                (UserDetailsImpl) principal;

        return user.getId();
    }

    private void assertManagerOwnsCharger(
            Authentication authentication,
            Long chargerId
    ) {
        Long managerId =
                getAuthenticatedUserId(authentication);

        Map<String, Object> station =
                stationService.getManagerStation(managerId);

        Long managerStationId =
                ((Number) station.get("id")).longValue();

        boolean owns =
                chargerService
                        .getStationChargers(managerStationId)
                        .stream()
                        .anyMatch(charger ->
                                chargerId.equals(
                                        ((Number) charger.get("id"))
                                                .longValue()
                                )
                        );

        if (!owns) {
            throw new SecurityException(
                    "You are not authorized to manage this charger"
            );
        }
    }

    private void assertManagerOwnsSlot(
            Authentication authentication,
            Long slotId
    ) {
        Long managerId =
                getAuthenticatedUserId(authentication);

        Map<String, Object> station =
                stationService.getManagerStation(managerId);

        Long managerStationId =
                ((Number) station.get("id")).longValue();

        boolean owns =
                chargerService
                        .getStationChargers(managerStationId)
                        .stream()
                        .flatMap(charger -> {

                            Object slotsObject =
                                    charger.get("slots");

                            if (!(slotsObject instanceof List)) {
                                return Stream.empty();
                            }

                            List<?> slots =
                                    (List<?>) slotsObject;

                            return slots.stream();
                        })
                        .anyMatch(slot -> {

                            if (!(slot instanceof Map)) {
                                return false;
                            }

                            Map<?, ?> map =
                                    (Map<?, ?>) slot;

                            Object id =
                                    map.get("id");

                            if (!(id instanceof Number)) {
                                return false;
                            }

                            Number number =
                                    (Number) id;

                            return slotId.equals(
                                    number.longValue()
                            );
                        });

        if (!owns) {
            throw new SecurityException(
                    "You are not authorized to manage this slot"
            );
        }
    }

    private long getLongArgument(
            Map<String, Object> arguments,
            String name
    ) {
        Object value = arguments.get(name);

        if (value instanceof Number) {
            return ((Number) value).longValue();
        }

        if (value != null) {
            return Long.parseLong(
                    String.valueOf(value)
            );
        }

        throw new IllegalArgumentException(
                "Missing required argument: " + name
        );
    }

    private int getIntArgument(
            Map<String, Object> arguments,
            String name
    ) {
        Object value = arguments.get(name);

        if (value instanceof Number) {
            return ((Number) value).intValue();
        }

        if (value != null) {
            return Integer.parseInt(
                    String.valueOf(value)
            );
        }

        throw new IllegalArgumentException(
                "Missing required argument: " + name
        );
    }

    private double getDoubleArgument(
            Map<String, Object> arguments,
            String name
    ) {
        Object value = arguments.get(name);

        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }

        if (value != null) {
            return Double.parseDouble(
                    String.valueOf(value)
            );
        }

        throw new IllegalArgumentException(
                "Missing required argument: " + name
        );
    }

    private boolean getBooleanArgument(
            Map<String, Object> arguments,
            String name
    ) {
        Object value = arguments.get(name);

        if (value instanceof Boolean) {
            return (Boolean) value;
        }

        if (value != null) {
            return Boolean.parseBoolean(
                    String.valueOf(value)
            );
        }

        throw new IllegalArgumentException(
                "Missing required argument: " + name
        );
    }

    private String getStringArgument(
            Map<String, Object> arguments,
            String name
    ) {
        Object value = arguments.get(name);

        if (value == null ||
                String.valueOf(value).isBlank()) {

            throw new IllegalArgumentException(
                    "Missing required argument: " + name
            );
        }

        return String.valueOf(value);
    }

    private boolean isStateChangingTool(
            String toolName
    ) {
        return switch (toolName) {

            case "create_booking",
                 "join_waitlist",
                 "cancel_my_booking",
                 "add_charger",
                 "remove_charger",
                 "set_charger_maintenance",
                 "update_slot_state",
                 "cancel_station_booking",
                 "create_manager",
                 "toggle_user_status",
                 "delete_user",
                 "admin_add_charger",
                 "admin_remove_charger" ->
                    true;

            default ->
                    false;
        };
    }

    private record PendingBooking(
            long chargerId,
            int durationMinutes,
            int batteryPercentage,
            LocalDateTime scheduledStart
    ) {}
}
