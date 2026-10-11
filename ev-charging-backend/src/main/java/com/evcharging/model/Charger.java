package com.evcharging.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chargers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Charger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id", nullable = false)
    private Station station;

    @Enumerated(EnumType.STRING)
    @Column(name = "charger_type", nullable = false)
    private ChargerType chargerType;

    @Column(name = "charger_number", nullable = false, length = 20)
    private String chargerNumber;

    @Column(name = "power_output")
    private Double powerOutput;

    @Enumerated(EnumType.STRING)
    private ChargerStatus status = ChargerStatus.ACTIVE;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum ChargerType {
        FAST, NORMAL, SUPER
    }

    public enum ChargerStatus {
        ACTIVE, MAINTENANCE, INACTIVE
    }
}
