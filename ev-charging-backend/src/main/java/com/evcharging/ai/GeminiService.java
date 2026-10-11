package com.evcharging.ai;

import com.evcharging.ai.tool.AiToolExecutor;
import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.FunctionCall;
import com.google.genai.types.FunctionResponse;
import com.google.genai.types.FunctionDeclaration;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.google.genai.types.Tool;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private final List<Client> clients;
    private final String model;
    private final AiToolExecutor toolExecutor;

    @FunctionalInterface
    private interface GeminiRequest {
        GenerateContentResponse execute(Client client);
    }

    private GenerateContentResponse withKeyFailover(GeminiRequest request) {
        RuntimeException lastQuotaError = null;

        for (Client candidate : clients) {
            try {
                return request.execute(candidate);
            } catch (RuntimeException ex) {
                if (!isQuotaOrRateLimitError(ex)) {
                    throw ex;
                }

                lastQuotaError = ex;
                System.err.println(
                    "Gemini quota/rate limit encountered; trying the next configured key."
                );
            }
        }

        if (lastQuotaError != null) {
            throw new IllegalStateException(
                "All configured Gemini keys encountered quota or rate limits.",
                lastQuotaError
            );
        }

        throw new IllegalStateException("No Gemini API keys are configured.");
    }

    private boolean isQuotaOrRateLimitError(Throwable error) {
        for (Throwable current = error; current != null; current = current.getCause()) {
            String message = String.valueOf(current.getMessage()).toLowerCase();
            String type = current.getClass().getSimpleName().toLowerCase();

            if (message.contains("429")
                    || message.contains("resource_exhausted")
                    || message.contains("resource exhausted")
                    || message.contains("quota exceeded")
                    || message.contains("rate limit")
                    || type.contains("toomanyrequests")) {
                return true;
            }
        }

        return false;
    }

    public GeminiService(
            @Value("${gemini.api.key:}") String apiKey,
            @Value("${GEMINI_API_KEY_2:}") String apiKey2,
            @Value("${GEMINI_API_KEY_3:}") String apiKey3,
            @Value("${GEMINI_API_KEY_4:}") String apiKey4,
            @Value("${gemini.model:gemini-3.8-flash}") String model,
            AiToolExecutor toolExecutor
    ) {
        List<String> keys = new ArrayList<>();

        for (String key : List.of(
                apiKey == null ? "" : apiKey,
                apiKey2 == null ? "" : apiKey2,
                apiKey3 == null ? "" : apiKey3,
                apiKey4 == null ? "" : apiKey4)) {
            if (!key.isBlank() && !keys.contains(key)) {
                keys.add(key);
            }
        }

        if (keys.isEmpty()) {
            throw new IllegalStateException(
                    "No Gemini API keys are configured"
            );
        }

        this.clients = keys.stream()
                .map(key -> Client.builder().apiKey(key).build())
                .toList();

        this.model = model;
        this.toolExecutor = toolExecutor;

        System.out.println(
                "Gemini configured with " + clients.size() + " unique API key(s)."
        );
    }

    public String generate(String prompt) {
        GenerateContentConfig config =
                GenerateContentConfig.builder()
                        .temperature(0.2f)
                        .build();

        GenerateContentResponse response = withKeyFailover(candidate -> candidate.models.generateContent(model, prompt, config));

        return requireText(response);
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

        String systemInstruction = """
                You are the AI assistant for an EV Charging Management System.
                Authenticated role: %s
                Your role determines which operations you may perform.

                SECURITY RULES:
                1. Never invent database information.
                2. Use an available function whenever current system data is required.
                3. Never claim an operation was performed unless the backend actually executed it.
                4. Never attempt to bypass authorization.
                5. Only use functions supplied to you for the authenticated role.
                6. Never ask the user for an internal user ID when the backend can determine it from JWT authentication.
                7. Never substitute another user's identity.
                8. Never expose passwords, JWT tokens, API keys, SMTP passwords, or other secrets.
                9. Never fabricate booking IDs, station IDs, charger IDs, users, managers, or system statistics.
                10. For "my" information, the backend determines the authenticated identity from the JWT.
                11. Manager operations automatically apply only to the authenticated manager's assigned station.
                12. Administrator operations may operate system-wide only through administrator tools.
                13. For destructive or state-changing requests, clearly understand what the user requested before calling the tool.
                14. If required information is missing, ask the user for that information rather than guessing.
                15. Give concise, clear, user-friendly answers.
                16. Backend authorization is authoritative even if a tool is requested by the model.
                17. When the user provides a station name, city, address, or other station-identifying text instead of a station ID, use the search_stations function first. Do not ask the user for a station ID when the station can be resolved from the provided name or location.
                18. You may call multiple functions sequentially when required to answer the user's request.
                19. After receiving a function result, decide whether another available function is needed before giving the final answer.
                20. Never repeat a state-changing function call unless it is actually required by the user's request.
                """.formatted(role);

        GenerateContentConfig.Builder configBuilder =
                GenerateContentConfig.builder()
                        .systemInstruction(
                                Content.fromParts(
                                        Part.fromText(systemInstruction)
                                )
                        )
                        .temperature(0.2f);

        List<FunctionDeclaration> declarations =
                buildFunctionDeclarations(
                        authentication,
                        confirmed
                );

        if (!declarations.isEmpty()) {
            configBuilder.tools(
                    Tool.builder()
                            .functionDeclarations(declarations)
                            .build()
            );
        }

        GenerateContentConfig config =
                configBuilder.build();

        List<Content> contents = new ArrayList<>();
        contents.add(
                Content.fromParts(
                        Part.fromText(userMessage)
                )
        );

        final int maxToolRounds = 5;

        for (int round = 1; round <= maxToolRounds; round++) {
            GenerateContentResponse response =
                    withKeyFailover(candidate -> candidate.models.generateContent(model, contents, config));

            System.out.println(
                    "GEMINI RESPONSE - TOOL ROUND " + round + ":"
            );
            System.out.println(response);

            List<FunctionCall> functionCalls =
                    response.functionCalls();

            if (functionCalls == null || functionCalls.isEmpty()) {
                return requireText(response);
            }

            List<Part> responseParts = response.parts();

            contents.add(
                    Content.builder()
                            .role("model")
                            .parts(responseParts)
                            .build()
            );

            List<Part> functionResponseParts = new ArrayList<>();

            for (FunctionCall functionCall : functionCalls) {
                String functionName =
                        functionCall.name()
                                .orElseThrow(() ->
                                        new IllegalStateException(
                                                "Gemini returned a function call without a name"
                                        )
                                );

                System.out.println("AI TOOL CALLED: " + functionName);

                Map<String, Object> arguments =
                        functionCall.args().orElse(Map.of());

                Object result;
                try {
                    result = toolExecutor.execute(
                            functionName,
                            arguments,
                            authentication,
                            confirmed
                    );
                } catch (IllegalStateException ex) {
                    if (ex.getMessage() != null &&
                            ex.getMessage().contains("Confirmation is required")) {
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
if ("create_booking".equals(functionName) && result instanceof Map<?, ?> bookingResult && "OTP_REQUIRED".equals(bookingResult.get("status"))) {
                    return "I've sent a 6-digit OTP to your registered email. Enter the OTP in this chat to complete your booking.";
                }

                
                String functionCallId =
                        functionCall.id()
                                .orElseThrow(() ->
                                        new IllegalStateException(
                                                "Gemini returned a function call without an ID"
                                        )
                                );

                FunctionResponse functionResponse =
                        FunctionResponse.builder()
                                .id(functionCallId)
                                .name(functionName)
                                .response(Map.of("result", result))
                                .build();

                functionResponseParts.add(
                        Part.builder()
                                .functionResponse(functionResponse)
                                .build()
                );
            }

            contents.add(
                    Content.builder()
                            .role("user")
                            .parts(functionResponseParts)
                            .build()
            );
        }

        throw new IllegalStateException(
                "Gemini exceeded the maximum number of tool execution rounds."
        );
    }
    private String requireText(
            GenerateContentResponse response
    ) {
        String text = response.text();

        if (text == null || text.isBlank()) {
            throw new IllegalStateException(
                    "Gemini returned an empty response"
            );
        }

        return text;
    }

    private List<FunctionDeclaration> buildFunctionDeclarations(
            Authentication authentication,
            boolean confirmed
    ) {
        boolean isUser =
                hasRole(authentication, "ROLE_USER");

        boolean isManager =
                hasRole(authentication, "ROLE_MANAGER");

        boolean isAdmin =
                hasRole(authentication, "ROLE_ADMIN");

        List<FunctionDeclaration> declarations =
                new ArrayList<>();

        // ============================================================
        // USER TOOLS
        // ============================================================

        if (isUser || isManager || isAdmin) {

            declarations.add(
                    function(
                            "find_nearby_stations",
                            "Find EV charging stations near a geographic latitude and longitude.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "latitude", Map.of(
                                                    "type", "number",
                                                    "description",
                                                    "Latitude."
                                            ),
                                            "longitude", Map.of(
                                                    "type", "number",
                                                    "description",
                                                    "Longitude."
                                            )
                                    ),
                                    "required",
                                    List.of(
                                            "latitude",
                                            "longitude"
                                    )
                            )
                    )
            );

            declarations.add(
                    function(
                            "search_stations",
                            "Search charging stations by name, city, address, or partial text. Use this when the user refers to a station by name or location and a station ID is not known.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "query", Map.of(
                                                    "type", "string",
                                                    "description",
                                                    "Station name, city, address, or other identifying text."
                                            )
                                    ),
                                    "required",
                                    List.of("query")
                            )
                    )
            );
            declarations.add(
                    function(
                            "get_station_details",
                            "Get detailed information about an EV charging station.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "stationId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Charging station ID."
                                            )
                                    ),
                                    "required",
                                    List.of("stationId")
                            )
                    )
            );

            declarations.add(
                    function(
                            "find_available_chargers",
                            "Find currently available chargers at a station. Excludes occupied and maintenance chargers.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "stationId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Charging station ID."
                                            )
                                    ),
                                    "required",
                                    List.of("stationId")
                            )
                    )
            );

            declarations.add(
                    function(
                            "get_charger_schedule",
                            "Get the booking schedule for a charger on a specific calendar date.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "chargerId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Charger ID."
                                            ),
                                            "date", Map.of(
                                                    "type", "string",
                                                    "description",
                                                    "Date in YYYY-MM-DD format."
                                            )
                                    ),
                                    "required",
                                    List.of(
                                            "chargerId",
                                            "date"
                                    )
                            )
                    )
            );
        }

        // ============================================================
        // USER-SPECIFIC TOOLS
        // ============================================================

        if (isUser) {

            declarations.add(
                    FunctionDeclaration.builder()
                            .name("get_my_bookings")
                            .description(
                                    "Get the authenticated user's own EV charging bookings. " +
                                    "The backend obtains the user from the JWT. " +
                                    "Never request a user ID."
                            )
                            .build()
            );

            declarations.add(
                    FunctionDeclaration.builder()
                            .name("get_my_waitlist")
                            .description(
                                    "Get the authenticated user's own EV charging waitlist entries. " +
                                    "The backend obtains the user from the JWT."
                            )
                            .build()
            );

            declarations.add(
                    FunctionDeclaration.builder()
                            .name("get_my_notifications")
                            .description(
                                    "Get the authenticated user's own notifications. " +
                                    "The backend obtains the user from the JWT."
                            )
                            .build()
            );

            declarations.add(
                    function(
                            "create_booking",
                            "Book an EV charger for the authenticated user. " +
                            "If the requested time conflicts with another booking, the backend may place the user on the waitlist.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "chargerId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Charger ID."
                                            ),
                                            "durationMinutes", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Charging duration in minutes."
                                            ),
                                            "batteryPercentage", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Current vehicle battery percentage."
                                            ),
                                            "scheduledStart", Map.of(
                                                    "type", "string",
                                                    "description",
                                                    "Optional start date/time in YYYY-MM-DDTHH:mm format."
                                            )
                                    ),
                                    "required", List.of(
                                            "chargerId",
                                            "durationMinutes",
                                            "batteryPercentage"
                                    )
                            )
                    )
            );

            declarations.add(
                    function(
                            "join_waitlist",
                            "Request charging service through the existing booking/waitlist system for the authenticated user. " +
                            "The backend determines whether the request becomes a booking or waitlist entry.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "chargerId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Charger ID."
                                            ),
                                            "durationMinutes", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Requested charging duration in minutes."
                                            ),
                                            "batteryPercentage", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Current battery percentage."
                                            )
                                    ),
                                    "required", List.of(
                                            "chargerId",
                                            "durationMinutes",
                                            "batteryPercentage"
                                    )
                            )
                    )
            );

            declarations.add(
                    function(
                            "cancel_my_booking",
                            "Cancel one booking belonging to the authenticated user. Before cancellation, call get_my_bookings and match the requested booking using its actual database id and the station, charger, date, and time details. Never treat a numbered-list position such as Booking #1 as a database id. If the booking cannot be matched unambiguously, ask the user to clarify. The backend confirmation and ownership checks must remain in force.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "bookingId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Booking ID."
                                            )
                                    ),
                                    "required",
                                    List.of("bookingId")
                            )
                    )
            );
        }

        // ============================================================
        // MANAGER TOOLS
        // ============================================================

        if (isManager) {

            declarations.add(
                    FunctionDeclaration.builder()
                            .name("get_my_station")
                            .description(
                                    "Get the charging station assigned to the authenticated manager. " +
                                    "Never ask for the manager ID."
                            )
                            .build()
            );

            declarations.add(
                    FunctionDeclaration.builder()
                            .name("get_station_chargers")
                            .description(
                                    "Get chargers belonging to the authenticated manager's station. " +
                                    "The station is determined from the authenticated manager."
                            )
                            .build()
            );

            declarations.add(
                    FunctionDeclaration.builder()
                            .name("get_station_bookings")
                            .description(
                                    "Get bookings belonging to the authenticated manager's station."
                            )
                            .build()
            );

            declarations.add(
                    function(
                            "add_charger",
                            "Add a charger to the authenticated manager's own station.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "type", Map.of(
                                                    "type", "string",
                                                    "description",
                                                    "Charger type such as FAST, NORMAL, or SUPER."
                                            ),
                                            "chargerNumber", Map.of(
                                                    "type", "string",
                                                    "description",
                                                    "Unique charger number."
                                            )
                                    ),
                                    "required", List.of(
                                            "type",
                                            "chargerNumber"
                                    )
                            )
                    )
            );

            declarations.add(
                    function(
                            "remove_charger",
                            "Remove a charger belonging to the authenticated manager's own station.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "chargerId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Charger ID."
                                            )
                                    ),
                                    "required",
                                    List.of("chargerId")
                            )
                    )
            );

            declarations.add(
                    function(
                            "set_charger_maintenance",
                            "Enable or disable maintenance mode for a charger belonging to the manager's station.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "chargerId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Charger ID."
                                            ),
                                            "maintenance", Map.of(
                                                    "type", "boolean",
                                                    "description",
                                                    "True to place in maintenance, false to restore active status."
                                            )
                                    ),
                                    "required", List.of(
                                            "chargerId",
                                            "maintenance"
                                    )
                            )
                    )
            );

            declarations.add(
                    function(
                            "update_slot_state",
                            "Update the state of a slot belonging to the manager's station.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "slotId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Slot ID."
                                            ),
                                            "state", Map.of(
                                                    "type", "string",
                                                    "description",
                                                    "New slot state."
                                            )
                                    ),
                                    "required", List.of(
                                            "slotId",
                                            "state"
                                    )
                            )
                    )
            );

            declarations.add(
                    function(
                            "cancel_station_booking",
                            "Cancel a booking belonging to the authenticated manager's station.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "bookingId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Booking ID."
                                            )
                                    ),
                                    "required",
                                    List.of("bookingId")
                            )
                    )
            );
        }

        // ============================================================
        // ADMIN TOOLS
        // ============================================================

        if (isAdmin) {

            declarations.add(
                    FunctionDeclaration.builder()
                            .name("get_system_analytics")
                            .description(
                                    "Get system-wide EV charging analytics for the administrator."
                            )
                            .build()
            );

            declarations.add(
                    FunctionDeclaration.builder()
                            .name("get_all_users")
                            .description(
                                    "Get all registered USER accounts. Passwords are never returned."
                            )
                            .build()
            );

            declarations.add(
                    FunctionDeclaration.builder()
                            .name("get_all_managers")
                            .description(
                                    "Get all MANAGER accounts. Passwords are never returned."
                            )
                            .build()
            );

            declarations.add(
                    function(
                            "create_manager",
                            "Create a new manager account and optionally assign a station.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "name", Map.of(
                                                    "type", "string"
                                            ),
                                            "email", Map.of(
                                                    "type", "string"
                                            ),
                                            "password", Map.of(
                                                    "type", "string"
                                            ),
                                            "stationId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Optional station ID to assign to the manager."
                                            )
                                    ),
                                    "required", List.of(
                                            "name",
                                            "email",
                                            "password"
                                    )
                            )
                    )
            );

            declarations.add(
                    function(
                            "toggle_user_status",
                            "Enable or disable a user account.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "userId", Map.of(
                                                    "type", "integer"
                                            )
                                    ),
                                    "required",
                                    List.of("userId")
                            )
                    )
            );

            declarations.add(
                    function(
                            "delete_user",
                            "Delete a user account.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "userId", Map.of(
                                                    "type", "integer"
                                            )
                                    ),
                                    "required",
                                    List.of("userId")
                            )
                    )
            );

            declarations.add(
                    FunctionDeclaration.builder()
                            .name("get_all_stations")
                            .description(
                                    "Get all EV charging stations in the system."
                            )
                            .build()
            );

            declarations.add(
                    function(
                            "get_all_chargers",
                            "Get chargers across all stations when stationId is omitted, or chargers for a specific station when stationId is provided.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "stationId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Optional station ID. Omit it to retrieve chargers across all stations."
                                            )
                                    )
                            )
                    )
            );

            declarations.add(
                    function(
                            "admin_add_charger",
                            "Add a charger to a specified station as an administrator.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "stationId", Map.of(
                                                    "type", "integer"
                                            ),
                                            "type", Map.of(
                                                    "type", "string",
                                                    "description",
                                                    "Charger type such as FAST, NORMAL, or SUPER."
                                            ),
                                            "chargerNumber", Map.of(
                                                    "type", "string"
                                            )
                                    ),
                                    "required", List.of(
                                            "stationId",
                                            "type",
                                            "chargerNumber"
                                    )
                            )
                    )
            );

            declarations.add(
                    function(
                            "admin_remove_charger",
                            "Remove a charger as an administrator.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "chargerId", Map.of(
                                                    "type", "integer"
                                            )
                                    ),
                                    "required",
                                    List.of("chargerId")
                            )
                    )
            );

            declarations.add(
                    function(
                            "set_charger_maintenance",
                            "Enable or disable maintenance mode for a charger as an administrator.",
                            Map.of(
                                    "type", "object",
                                    "properties", Map.of(
                                            "chargerId", Map.of(
                                                    "type", "integer",
                                                    "description",
                                                    "Charger ID."
                                            ),
                                            "maintenance", Map.of(
                                                    "type", "boolean",
                                                    "description",
                                                    "True to place in maintenance, false to restore active status."
                                            )
                                    ),
                                    "required", List.of(
                                            "chargerId",
                                            "maintenance"
                                    )
                            )
                    )
            );
            declarations.add(
                    FunctionDeclaration.builder()
                            .name("view_all_bookings")
                            .description(
                                    "Get all bookings in the system."
                            )
                            .build()
            );
        }

        return declarations;
    }

    private FunctionDeclaration function(
            String name,
            String description,
            Map<String, Object> schema
    ) {
        return FunctionDeclaration.builder()
                .name(name)
                .description(description)
                .parametersJsonSchema(schema)
                .build();
    }

    private boolean hasRole(
            Authentication authentication,
            String role
    ) {
        return authentication != null &&
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                role.equals(
                                        authority.getAuthority()
                                ));
    }

    private String buildSystemInstruction(
            Authentication authentication
    ) {
        String role =
                authentication.getAuthorities()
                        .stream()
                        .findFirst()
                        .map(authority ->
                                authority.getAuthority())
                        .orElse("ROLE_UNKNOWN");

        return """
                You are the AI assistant for an EV Charging Management System.

                Authenticated role: %s

                Your role determines which operations you may perform.

                SECURITY RULES:
                1. Never invent database information.
                2. Use an available function whenever current system data is required.
                3. Never claim an operation was performed unless the backend actually executed it.
                4. Never attempt to bypass authorization.
                5. Only use functions supplied to you for the authenticated role.
                6. Never ask the user for an internal user ID when the backend can determine it from JWT authentication.
                7. Never substitute another user's identity.
                8. Never expose passwords, JWT tokens, API keys, SMTP passwords, or other secrets.
                9. Never fabricate booking IDs, station IDs, charger IDs, users, managers, or system statistics.
                10. For "my" information, the backend determines the authenticated identity from the JWT.
                11. Manager operations automatically apply only to the authenticated manager's assigned station.
                12. Administrator operations may operate system-wide only through administrator tools.
                13. For destructive or state-changing requests, clearly understand what the user requested before calling the tool.
                14. If required information is missing, ask the user for that information rather than guessing.
                15. Give concise, clear, user-friendly answers.
                16. Backend authorization is authoritative even if a tool is requested by the model.
                17. When the user provides a station name, city, address, or other station-identifying text instead of a station ID, use the search_stations function first. Do not ask the user for a station ID when the station can be resolved from the provided name or location.
                """.formatted(role);
    }
}
