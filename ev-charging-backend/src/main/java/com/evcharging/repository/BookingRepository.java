
package com.evcharging.repository;

import com.evcharging.model.Booking;
import com.evcharging.model.Booking.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Booking> findAllByOrderByCreatedAtDesc();

    List<Booking> findByStationIdOrderByCreatedAtDesc(Long stationId);

    List<Booking> findByStatus(BookingStatus status);

    Optional<Booking> findByChargerIdAndStatus(
            Long chargerId,
            BookingStatus status
    );

    // Charger is occupied only if an active booking covers the current time.
    @Query("SELECT b FROM Booking b WHERE b.charger.id = :chargerId " +
           "AND b.status = 'ACTIVE' " +
           "AND b.startTime <= :now AND b.endTime > :now")
    Optional<Booking> findActiveNow(
            @Param("chargerId") Long chargerId,
            @Param("now") LocalDateTime now
    );

    // Check overlapping bookings in the requested time window.
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.charger.id = :chargerId " +
           "AND b.status = 'ACTIVE' " +
           "AND b.startTime < :endTime AND b.endTime > :startTime")
    long countOverlappingBookings(
            @Param("chargerId") Long chargerId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );

    // Find active bookings overlapping the specified day.
    @Query("SELECT b FROM Booking b WHERE b.charger.id = :chargerId " +
           "AND b.status = 'ACTIVE' " +
           "AND b.startTime < :dayEnd AND b.endTime > :dayStart")
    List<Booking> findByChargerAndDate(
            @Param("chargerId") Long chargerId,
            @Param("dayStart") LocalDateTime dayStart,
            @Param("dayEnd") LocalDateTime dayEnd
    );

    // Find active bookings whose end time has passed.
    @Query("SELECT b FROM Booking b WHERE b.status = 'ACTIVE' " +
           "AND b.endTime <= :now")
    List<Booking> findExpiredActiveBookings(
            @Param("now") LocalDateTime now
    );

    long countByStatus(BookingStatus status);

    long countByStationId(Long stationId);

    long countByChargerId(Long chargerId);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.createdAt >= :from")
    long countTodayBookings(@Param("from") LocalDateTime from);

    // Estimated energy for completed bookings since the specified date.
    @Query("SELECT COALESCE(SUM(b.charger.powerOutput * b.durationMinutes / 60.0), 0) " +
           "FROM Booking b WHERE b.status = 'COMPLETED' AND b.createdAt >= :from")
    double sumEnergyDeliveredSince(@Param("from") LocalDateTime from);

    // Daily booking counts, grouped by booking creation date.
    @Query("""
        SELECT FUNCTION('DATE', b.createdAt), COUNT(b)
        FROM Booking b
        WHERE b.createdAt >= :from
          AND b.createdAt < :to
        GROUP BY FUNCTION('DATE', b.createdAt)
        ORDER BY FUNCTION('DATE', b.createdAt)
        """)
    List<Object[]> countBookingsByCreatedDate(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    // Daily estimated energy from completed bookings, grouped by creation date.
    @Query("""
        SELECT FUNCTION('DATE', b.createdAt),
               COALESCE(
                   SUM(b.charger.powerOutput * b.durationMinutes / 60.0),
                   0
               )
        FROM Booking b
        WHERE b.status = 'COMPLETED'
          AND b.createdAt >= :from
          AND b.createdAt < :to
        GROUP BY FUNCTION('DATE', b.createdAt)
        ORDER BY FUNCTION('DATE', b.createdAt)
        """)
    List<Object[]> sumEnergyByCreatedDate(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );
}
