package com.evcharging.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "waitlist")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Waitlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "charger_id", nullable = false)
    private Charger charger;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id", nullable = false)
    private Station station;

    @Column(name = "battery_percentage", nullable = false)
    private Integer batteryPercentage;

    // Lower battery = higher priority score
    @Column(name = "priority_score", nullable = false)
    private Integer priorityScore;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    private WaitlistStatus status = WaitlistStatus.WAITING;

    @Column(name = "joined_at", updatable = false)
    private LocalDateTime joinedAt;

    @Column(name = "notified_at")
    private LocalDateTime notifiedAt;

    @PrePersist
    protected void onCreate() {
        joinedAt = LocalDateTime.now();
        priorityScore = 100 - batteryPercentage; // higher score = higher priority
    }

    public enum WaitlistStatus {
        WAITING, NOTIFIED, BOOKED, EXPIRED
    }
}
