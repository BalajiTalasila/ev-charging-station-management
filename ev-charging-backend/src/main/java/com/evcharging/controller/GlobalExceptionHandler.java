package com.evcharging.controller;

import com.google.genai.errors.ClientException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ClientException.class)
    public ResponseEntity<Map<String, String>> handleGeminiClientException(ClientException ex) {
        String message = ex.getMessage();

        if (message != null && (
                message.contains("429") ||
                message.contains("RESOURCE_EXHAUSTED") ||
                message.contains("quota")
        )) {
            return ResponseEntity
                    .status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(
                            "error", "AI service is temporarily rate-limited. Please try again shortly."
                    ));
        }

        return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(Map.of(
                        "error", "AI service is temporarily unavailable."
                ));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        return ResponseEntity
                .badRequest()
                .body(Map.of(
                        "error",
                        ex.getMessage() == null ? "Request failed." : ex.getMessage()
                ));
    }
}