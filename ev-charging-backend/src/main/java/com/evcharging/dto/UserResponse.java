package com.evcharging.dto;

import com.evcharging.model.User.Role;
import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String name,
        String email,
        String phone,
        String vehicleNumber,
        String city,
        Role role,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
