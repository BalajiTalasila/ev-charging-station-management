package com.evcharging.repository;

import com.evcharging.model.Waitlist;
import com.evcharging.model.Waitlist.WaitlistStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface WaitlistRepository extends JpaRepository<Waitlist, Long> {

    List<Waitlist> findByChargerIdAndStatusOrderByPriorityScoreDescJoinedAtAsc(Long chargerId, WaitlistStatus status);

    Optional<Waitlist> findByChargerIdAndStatus(Long chargerId, WaitlistStatus status);

    List<Waitlist> findByUserIdAndStatusOrderByJoinedAtDesc(Long userId, WaitlistStatus status);

    Optional<Waitlist> findByChargerIdAndUserIdAndStatus(Long chargerId, Long userId, WaitlistStatus status);

    // Get position of user in waitlist for a charger
    @Query("SELECT COUNT(w) FROM Waitlist w WHERE w.charger.id = :chargerId AND w.status = 'WAITING' AND (w.priorityScore > :score OR (w.priorityScore = :score AND w.joinedAt < :joinedAt))")
    long countAheadInQueue(@Param("chargerId") Long chargerId,
                           @Param("score") Integer score,
                           @Param("joinedAt") java.time.LocalDateTime joinedAt);

    boolean existsByChargerIdAndUserIdAndStatus(Long chargerId, Long userId, WaitlistStatus status);

    List<Waitlist> findByStatusAndNotifiedAtBefore(
            WaitlistStatus status,
            java.time.LocalDateTime notifiedAt
    );
}
