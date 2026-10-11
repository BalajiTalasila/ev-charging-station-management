package com.evcharging.ai.dto;

public record AiChatRequest(
        String message,
        Boolean confirmed
) {
}
