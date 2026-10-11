package com.evcharging.dto;

import lombok.Data;

@Data
public class StationRequest {
    private String name;
    private String address;
    private String city;
    private Double latitude;
    private Double longitude;
    private Integer totalChargers;
    private Long managerId;
}
