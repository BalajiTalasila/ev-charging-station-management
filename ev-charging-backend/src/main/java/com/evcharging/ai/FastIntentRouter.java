package com.evcharging.ai;

import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

@Service
public class FastIntentRouter {

    public IntentResult route(String message) {

        if (message == null || message.isBlank()) {
            return IntentResult.unknown();
        }

        String text = normalize(message);

        // ============================================================
        // USER - MY BOOKINGS
        // ============================================================

        if (containsAny(text,
                "show my bookings",
                "show my booking",
                "my bookings",
                "my booking",
                "booking history",
                "show booking history",
                "my booking history",
                "what are my bookings",
                "what bookings do i have",
                "view my bookings",
                "see my bookings",
                "upcoming bookings",
                "list my bookings")) {

            return known("get_my_bookings");
        }

        // ============================================================
        // USER - MY WAITLIST
        // ============================================================

        if (containsAny(text,
                "show my waitlist",
                "my waitlist",
                "view my waitlist",
                "show waitlist",
                "list my waitlist")) {

            return known("get_my_waitlist");
        }

        // ============================================================
        // USER - MY NOTIFICATIONS
        // ============================================================

        if (containsAny(text,
                "show my notifications",
                "my notifications",
                "view my notifications",
                "show notifications",
                "notifications",
                "list my notifications")) {

            return known("get_my_notifications");
        }

        // ============================================================
        // USER - CANCEL BOOKING
        //
        // Parameter extraction is intentionally limited to a clear
        // numeric booking ID.
        // ============================================================

        if (containsAny(text,
                "cancel my booking",
                "cancel booking",
                "cancel the booking",
                "cancel my reservation",
                "cancel reservation")) {

            // Do not treat a visible booking number as a database ID.
            // Let the AI resolve the user's booking before requesting cancellation.
            return IntentResult.unknown();
        }

        // ============================================================
        // USER / COMMON - NEARBY STATIONS
        //
        // Coordinates are required by the executor, so don't execute
        // unless coordinates are explicitly available in the message.
        // ============================================================

        if (containsAny(text,
                "nearby stations",
                "near me stations",
                "stations near me",
                "find nearby stations",
                "find stations near me",
                "charging stations near me")) {

            return IntentResult.unknown();
        }

        // ============================================================
        // MANAGER - MY STATION
        // ============================================================

        if (!containsAny(text, "charger", "chargers", "booking", "bookings") &&
                containsAny(text,
                "show my station details",
                "show details of my station",
                "give me my station details",
                "view my station details",
                "show my station",
                "my station",
                "view my station",
                "manager station")) {

            return known("get_my_station");
        }

        // ============================================================
        // MANAGER - MY CHARGERS
        // ============================================================

        if (containsAny(text,
                "show all chargers at my station",
                "show all chargers in my station",
                "list all chargers at my station",
                "list chargers at my station",
                "show chargers at my station",
                "show chargers in my station",
                "what chargers are at my station",
                "how many chargers are at my station",
                "show my chargers",
                "my chargers",
                "view my chargers",
                "list my chargers",
                "show station chargers")) {

            return known("get_station_chargers");
        }

        // ============================================================
        // MANAGER - STATION BOOKINGS
        // ============================================================

        if (containsAny(text,
                "show all bookings at my station",
                "show bookings at my station",
                "list bookings at my station",
                "show latest bookings at my station",
                "show station bookings",
                "station bookings",
                "show my station bookings",
                "show bookings for my station",
                "view station bookings")) {

            return known("get_station_bookings");
        }

        // ============================================================
        // ============================================================
        // ADMIN - ALL CHARGERS
        // ============================================================

        if (containsAny(text,
                "show all chargers",
                "list all chargers",
                "view all chargers",
                "all chargers",
                "show chargers",
                "list chargers")) {

            return known("get_all_chargers");
        }
        // ADMIN - ANALYTICS
        // ============================================================

        if (containsAny(text,
                "show analytics",
                "system analytics",
                "view analytics",
                "show system analytics",
                "system statistics",
                "system stats")) {

            return known("get_system_analytics");
        }

        // ============================================================
        // ADMIN - USERS
        // ============================================================

        if (containsAny(text,
                "show all users",
                "list all users",
                "view all users",
                "all users",
                "show users")) {

            return known("get_all_users");
        }

        // ============================================================
        // ADMIN - MANAGERS
        // ============================================================

        if (containsAny(text,
                "show all managers",
                "list all managers",
                "view all managers",
                "all managers",
                "show managers")) {

            return known("get_all_managers");
        }

        // ============================================================
        // ADMIN - STATIONS
        // ============================================================

        if (containsAny(text,
                "show all stations",
                "list all stations",
                "view all stations",
                "all stations")) {

            return known("get_all_stations");
        }

        // ============================================================
        // ADMIN - BOOKINGS
        // ============================================================

        if (containsAny(text,
                "show all bookings",
                "list all bookings",
                "view all bookings",
                "all bookings",
                "system bookings")) {

            return known("view_all_bookings");
        }

        // ============================================================
        // Unknown / parameter-dependent request
        //
        // This will later go to the LLM gateway.
        // ============================================================

        return IntentResult.unknown();
    }

    private IntentResult known(String action) {
        return new IntentResult(
                action,
                Map.of()
        );
    }

    private String normalize(String message) {

        return message
                .toLowerCase(Locale.ROOT)
                .trim()
                .replaceAll("\\s+", " ");
    }

    private boolean containsAny(String text, String... phrases) {

        for (String phrase : phrases) {

            if (text.equals(phrase) ||
                    text.contains(phrase)) {

                return true;
            }
        }

        return false;
    }

    private Long extractIdAfterKeyword(
            String text,
            String keyword) {

        Pattern pattern = Pattern.compile(
                Pattern.quote(keyword) + "\\s*(?:#|id\\s*)?(\\d+)",
                Pattern.CASE_INSENSITIVE
        );

        Matcher matcher = pattern.matcher(text);

        if (matcher.find()) {
            try {
                return Long.parseLong(matcher.group(1));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }

        return null;
    }

    public record IntentResult(
            String action,
            Map<String, Object> parameters
    ) {

        public boolean isKnown() {
            return action != null && !action.isBlank();
        }

        public static IntentResult unknown() {
            return new IntentResult(
                    null,
                    Map.of()
            );
        }
    }
}
