package com.evcharging.dto;

import lombok.Data;

@Data
public class BookingRequest {
    private Long chargerId;
    private Integer durationMinutes;
    private Integer batteryPercentage;
}
