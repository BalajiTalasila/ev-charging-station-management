
package com.evcharging.ai;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.evcharging.ai.dto.AiChatRequest;
import com.evcharging.ai.dto.AiChatResponse;
import com.evcharging.ai.dto.AiVerifyOtpRequest;
import com.evcharging.ai.tool.AiToolExecutor;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final GeminiService geminiService;
    private final AiToolExecutor toolExecutor;
    private final FastIntentRouter fastIntentRouter;

    public AiController(
            GeminiService geminiService,
            AiToolExecutor toolExecutor,
            FastIntentRouter fastIntentRouter
    ) {
        this.geminiService = geminiService;
        this.toolExecutor = toolExecutor;
        this.fastIntentRouter = fastIntentRouter;
    }

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> chat(
            @RequestBody AiChatRequest request,
            Authentication authentication
    ) {

        if (request == null ||
                request.message() == null ||
                request.message().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(new AiChatResponse(
                            "Please enter a message."
                    ));
        }

        String message = request.message().trim();

        // ============================================================
        // FAST PATH
        // Known commands are executed directly without the LLM.
        // ============================================================

        FastIntentRouter.IntentResult intent =
                fastIntentRouter.route(message);

        if (intent.isKnown()) {
            try {
                Object result = toolExecutor.execute(
                        intent.action(),
                        intent.parameters(),
                        authentication,
                        Boolean.TRUE.equals(request.confirmed())
                );

                return ResponseEntity.ok(
                        new AiChatResponse(
                                formatFastResult(
                                        intent.action(),
                                        result
                                )
                        )
                );

            } catch (IllegalStateException ex) {

                if (ex.getMessage() != null &&
                        ex.getMessage().contains(
                                "Confirmation is required"
                        )) {

                    return ResponseEntity.ok(
                            new AiChatResponse(
                                    "{\"status\":\"CONFIRMATION_REQUIRED\",\"message\":\"Confirmation is required before performing this state-changing operation.\"}"
                            )
                    );
                }

                throw ex;
            }
        }

        // ============================================================
        // LLM FALLBACK
        // Unknown or complex natural-language requests use GeminiService.
        // ============================================================

        String answer = geminiService.chat(
                message,
                authentication,
                Boolean.TRUE.equals(request.confirmed())
        );

        return ResponseEntity.ok(
                new AiChatResponse(answer)
        );
    }

    /*
     * Convert direct backend results into a predictable response.
     * Preserve the existing booking and notification response formats.
     */
    private String formatFastResult(
            String action,
            Object result
    ) {

        try {
            if ("get_my_bookings".equals(action)) {
                return buildBookingHistoryResponse(result);
            }

            if ("get_my_notifications".equals(action)) {
                return buildNotificationHistoryResponse(result);
            }

            if (result instanceof Map<?, ?> map) {
                Object status = map.get("status");

                if (status != null) {
                    return mapToJson(map);
                }
            }

            return mapToJson(result);

        } catch (Exception ex) {
            return String.valueOf(result);
        }
    }

    private String buildNotificationHistoryResponse(
            Object result
    ) {

        if (!(result instanceof java.util.List<?> list)) {
            return String.valueOf(result);
        }

        if (list.isEmpty()) {
            return "You currently have no notifications.";
        }

        StringBuilder builder = new StringBuilder();
        builder.append("Your notifications are as follows:\n\n");

        for (int i = 0; i < list.size(); i++) {
            Object notificationObject = list.get(i);

            if (notificationObject instanceof Map<?, ?> notification) {
                Object title = notification.get("title");
                Object message = notification.get("message");
                Object type = notification.get("type");
                Object createdAt = notification.get("createdAt");
                Object isRead = notification.get("isRead");

                builder.append(i + 1)
                        .append(". ")
                        .append(String.valueOf(title))
                        .append("\n")
                        .append("   ")
                        .append(String.valueOf(message))
                        .append("\n")
                        .append("   Type: ")
                        .append(String.valueOf(type))
                        .append(" | Time: ")
                        .append(String.valueOf(createdAt))
                        .append(" | Read: ")
                        .append(String.valueOf(isRead))
                        .append("\n\n");

            } else {
                builder.append(i + 1)
                        .append(". ")
                        .append(String.valueOf(notificationObject))
                        .append("\n\n");
            }
        }

        return builder.toString().trim();
    }

    private String buildBookingHistoryResponse(
            Object result
    ) {
        return "Your bookings are as follows:\n\n" +
                formatBookingList(result);
    }

    private String formatBookingList(
            Object result
    ) {

        if (!(result instanceof java.util.List<?> list)) {
            return String.valueOf(result);
        }

        if (list.isEmpty()) {
            return "You currently have no bookings.";
        }

        StringBuilder builder = new StringBuilder();

        for (int i = 0; i < list.size(); i++) {
            Object bookingObject = list.get(i);

            if (bookingObject instanceof Map<?, ?> booking) {
                Object bookingId = booking.get("id");
                Object station = booking.get("stationName");
                Object charger = booking.get("chargerNumber");
                Object start = booking.get("startTime");
                Object end = booking.get("endTime");
                Object duration = booking.get("durationMinutes");
                Object battery = booking.get("batteryPercentage");
                Object status = booking.get("status");

                builder.append(i + 1)
                        .append(". Booking ID: ")
                        .append(String.valueOf(bookingId))
                        .append(". Booking at '")
                        .append(String.valueOf(station))
                        .append("' with charger '")
                        .append(String.valueOf(charger))
                        .append("' from ")
                        .append(String.valueOf(start))
                        .append(" to ")
                        .append(String.valueOf(end))
                        .append(". Duration: ")
                        .append(String.valueOf(duration))
                        .append(" minutes, Battery Percentage: ")
                        .append(String.valueOf(battery))
                        .append("%, Status: ")
                        .append(String.valueOf(status))
                        .append(".")
                        .append("\n\n");

            } else {
                builder.append(i + 1)
                        .append(". ")
                        .append(String.valueOf(bookingObject))
                        .append("\n\n");
            }
        }

        return builder.toString().trim();
    }

    private String mapToJson(
            Object value
    ) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper()
                    .writeValueAsString(value);

        } catch (Exception ex) {
            return String.valueOf(value);
        }
    }

    /*
     * AI booking OTP verification.
     * The frontend sends only the OTP.
     * Pending booking parameters remain server-side.
     */
    @PostMapping("/verify-booking-otp")
    public ResponseEntity<AiChatResponse> verifyBookingOtp(
            @RequestBody AiVerifyOtpRequest request,
            Authentication authentication
    ) {

        if (request == null ||
                request.otp() == null ||
                request.otp().isBlank()) {

            return ResponseEntity.badRequest()
                    .body(new AiChatResponse(
                            "Please enter the 6-digit OTP."
                    ));
        }

        Object result = toolExecutor.verifyPendingBookingOtp(
                authentication,
                request.otp().trim()
        );

        if (result instanceof Map<?, ?> resultMap) {
            Object status = resultMap.get("status");
            Object message = resultMap.get("message");

            String statusText = status == null
                    ? ""
                    : String.valueOf(status);

            String messageText = message == null
                    ? "OTP verification completed."
                    : String.valueOf(message);

            if ("INVALID_OTP".equals(statusText)) {
                return ResponseEntity.badRequest()
                        .body(new AiChatResponse(messageText));
            }

            if ("NO_PENDING_BOOKING".equals(statusText)) {
                return ResponseEntity.badRequest()
                        .body(new AiChatResponse(messageText));
            }

            if ("BOOKED".equals(statusText)) {
                Object booking = resultMap.get("booking");

                return ResponseEntity.ok(
                        new AiChatResponse(
                                messageText + " " +
                                        String.valueOf(booking)
                        )
                );
            }
        }

        return ResponseEntity.ok(
                new AiChatResponse(String.valueOf(result))
        );
    }
}
