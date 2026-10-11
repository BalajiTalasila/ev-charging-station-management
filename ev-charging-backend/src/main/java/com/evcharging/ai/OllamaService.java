package com.evcharging.ai;

import com.evcharging.ai.tool.AiToolExecutor;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class OllamaService {

    private final AiToolExecutor toolExecutor;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String ollamaUrl;
    private final String model;

    public OllamaService(
            AiToolExecutor toolExecutor,
            ObjectMapper objectMapper,
            @Value("${ollama.url:http://localhost:11434}") String ollamaUrl,
            @Value("${ollama.model:qwen2.5:3b}") String model
    ) {
        this.toolExecutor = toolExecutor;
        this.objectMapper = objectMapper;
        this.ollamaUrl = ollamaUrl;
        this.model = model;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public String chat(
            String userMessage,
            Authentication authentication,
            boolean confirmed
    ) {
        if (userMessage == null || userMessage.isBlank()) {
            throw new IllegalArgumentException("Message is required");
        }

        String role = authentication.getAuthorities()
                .stream()
                .findFirst()
                .map(Object::toString)
                .orElse("UNKNOWN");

        String systemPrompt = buildSystemPrompt(role, confirmed);

        List<Map<String, Object>> conversation = new ArrayList<>();

        conversation.add(Map.of(
                "role", "system",
                "content", systemPrompt
        ));

        conversation.add(Map.of(
                "role", "user",
                "content", userMessage
        ));

        final int maxToolRounds = 5;

        for (int round = 1; round <= maxToolRounds; round++) {

            JsonNode response = callOllama(conversation);


            String raw = response.path("message")
                    .path("content")
                    .asText("");

            if (raw.isBlank()) {
                throw new IllegalStateException(
                        "Ollama returned an empty response"
                );
            }

            JsonNode actionNode = parseJsonSafely(raw);

            if (actionNode == null ||
                    !actionNode.has("action")) {
                return raw.trim();
            }

            String action = actionNode
                    .path("action")
                    .asText("");

            if (action.isBlank() ||
                    "final".equalsIgnoreCase(action) ||
                    "none".equalsIgnoreCase(action)) {

                String answer = actionNode
                        .path("answer")
                        .asText("");

                if (!answer.isBlank()) {
                    return answer;
                }

                return raw.trim();
            }

            JsonNode parametersNode =
                    actionNode.path("parameters");

            Map<String, Object> arguments =
                    parametersNode.isObject()
                            ? objectMapper.convertValue(
                                    parametersNode,
                                    Map.class
                            )
                            : Map.of();

            System.out.println(
                    "OLLAMA TOOL CALLED: " + action
            );

            Object result;

            try {
                result = toolExecutor.execute(
                        action,
                        arguments,
                        authentication,
                        confirmed
                );
            } catch (IllegalStateException ex) {

                if (ex.getMessage() != null &&
                        ex.getMessage().contains(
                                "Confirmation is required"
                        )) {

                    result = Map.of(
                            "status",
                            "CONFIRMATION_REQUIRED",
                            "message",
                            "Confirmation is required before performing this state-changing operation."
                    );

                } else {
                    throw ex;
                }
            }

            String resultJson;

            try {
                resultJson =
                        objectMapper.writeValueAsString(result);

            } catch (Exception ex) {
                throw new IllegalStateException(
                        "Could not serialize tool result",
                        ex
                );
            }

            conversation.add(Map.of(
                    "role", "assistant",
                    "content", raw
            ));

            conversation.add(Map.of(
                    "role", "user",
                    "content",
                    "The backend executed the requested action.\n" +
                    "Action: " + action + "\n" +
                    "Backend result:\n" + resultJson + "\n\n" +
                    "Now respond to the user with a concise, friendly answer. " +
                    "Use only the backend result. " +
                    "Do not invent information. " +
                    "If the backend result has status CONFIRMATION_REQUIRED, " +
                    "clearly ask the user to confirm the requested operation."
            ));
        }

        throw new IllegalStateException(
                "Ollama exceeded the maximum number of tool execution rounds."
        );
    }

    private JsonNode callOllama(
            List<Map<String, Object>> messages
    ) {
        try {
            Map<String, Object> body = Map.of(
                    "model", model,
                    "stream", false,
                    "format", "json",
                    "messages", messages
            );

            String json =
                    objectMapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(
                            ollamaUrl + "/api/chat"
                    ))
                    .timeout(Duration.ofSeconds(120))
                    .header(
                            "Content-Type",
                            "application/json"
                    )
                    .POST(
                            HttpRequest.BodyPublishers
                                    .ofString(json)
                    )
                    .build();

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            if (response.statusCode() != 200) {
                throw new IllegalStateException(
                        "Ollama returned HTTP " +
                        response.statusCode() +
                        ": " +
                        response.body()
                );
            }

            return objectMapper.readTree(
                    response.body()
            );

        } catch (InterruptedException ex) {

            Thread.currentThread().interrupt();

            throw new IllegalStateException(
                    "Ollama request was interrupted",
                    ex
            );

        } catch (Exception ex) {

            throw new IllegalStateException(
                    "Could not connect to Ollama at " +
                    ollamaUrl,
                    ex
            );
        }
    }

    private JsonNode parseJsonSafely(String raw) {
        try {
            return objectMapper.readTree(raw);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String buildSystemPrompt(
            String role,
            boolean confirmed
    ) {

        String tools = buildToolsForRole(role);

        return """
                You are the AI assistant for an EV Charging Management System.

                Authenticated role: %s

                The backend is authoritative.

                SECURITY RULES:
                1. Never invent database information.
                2. Never claim an operation was performed unless the backend result confirms it.
                3. Never bypass authorization.
                4. Never request an internal user ID for "my" information.
                5. Never substitute another user's identity.
                6. Never expose passwords, JWT tokens, API keys, SMTP passwords, or other secrets.
                7. Never fabricate booking IDs, station IDs, charger IDs, users, managers, or statistics.
                8. Manager operations apply only to the authenticated manager's assigned station.
                9. Administrator operations may operate system-wide only through administrator tools.
                10. If required information is missing, ask the user instead of guessing.
                11. When a station name, city, or address is provided instead of a station ID, use search_stations first.
                12. You may execute multiple tools sequentially when necessary.
                13. For state-changing operations, the backend confirmation mechanism is authoritative.
                14. Keep responses concise and user-friendly.

                CURRENT CONFIRMATION STATE:
                confirmed = %s

                AVAILABLE TOOLS FOR THIS ROLE:
                %s

                IMPORTANT OUTPUT FORMAT:

                If you need a backend tool, return ONLY:
                {
                  "action": "tool_name",
                  "parameters": {}
                }

                If you can answer without a backend tool, return ONLY:
                {
                  "action": "final",
                  "answer": "your answer"
                }

                Do not use markdown around the JSON.
                Do not invent tool names.
                """.formatted(
                role,
                confirmed,
                tools
        );
    }

    private String buildToolsForRole(String role) {

        List<String> tools = new ArrayList<>();

        if (hasAnyRole(
                role,
                "ROLE_USER",
                "ROLE_MANAGER",
                "ROLE_ADMIN"
        )) {
            tools.add(
                    "find_nearby_stations(latitude, longitude)"
            );
            tools.add(
                    "search_stations(query)"
            );
            tools.add(
                    "get_station_details(stationId)"
            );
            tools.add(
                    "find_available_chargers(stationId)"
            );
            tools.add(
                    "get_charger_schedule(chargerId, date)"
            );
        }

        if ("ROLE_USER".equals(role)) {

            tools.add("get_my_bookings()");
            tools.add("get_my_waitlist()");
            tools.add("get_my_notifications()");

            tools.add(
                    "create_booking(" +
                    "chargerId, durationMinutes, " +
                    "batteryPercentage, scheduledStart optional)"
            );

            tools.add(
                    "join_waitlist(" +
                    "chargerId, durationMinutes, " +
                    "batteryPercentage)"
            );

            tools.add(
                    "cancel_my_booking(bookingId)"
            );
        }

        if ("ROLE_MANAGER".equals(role)) {

            tools.add("get_my_station()");
            tools.add("get_station_chargers()");
            tools.add("get_station_bookings()");

            tools.add(
                    "add_charger(type, chargerNumber)"
            );

            tools.add(
                    "remove_charger(chargerId)"
            );

            tools.add(
                    "set_charger_maintenance(" +
                    "chargerId, maintenance)"
            );

            tools.add(
                    "update_slot_state(slotId, state)"
            );

            tools.add(
                    "cancel_station_booking(bookingId)"
            );
        }

        if ("ROLE_ADMIN".equals(role)) {

            tools.add("get_system_analytics()");
            tools.add("get_all_users()");
            tools.add("get_all_managers()");

            tools.add(
                    "create_manager(" +
                    "name, email, password, stationId optional)"
            );

            tools.add(
                    "toggle_user_status(userId)"
            );

            tools.add(
                    "delete_user(userId)"
            );

            tools.add("get_all_stations()");

            tools.add(
                    "get_all_chargers(stationId)"
            );

            tools.add(
                    "admin_add_charger(" +
                    "stationId, type, chargerNumber)"
            );

            tools.add(
                    "admin_remove_charger(chargerId)"
            );

            tools.add(
                    "set_charger_maintenance(" +
                    "chargerId, maintenance)"
            );

            tools.add("view_all_bookings()");
        }

        return String.join("\n", tools);
    }

    private boolean hasAnyRole(
            String role,
            String... roles
    ) {
        for (String allowed : roles) {
            if (allowed.equals(role)) {
                return true;
            }
        }

        return false;
    }
}
