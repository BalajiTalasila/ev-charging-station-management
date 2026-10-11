package com.evcharging.repository;

import com.evcharging.model.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StationRepository extends JpaRepository<Station, Long> {
    List<Station> findByIsActiveTrue();
    List<Station> findByCityIgnoreCase(String city);
    Optional<Station> findByManagerId(Long managerId);

    @Query(value = """
        SELECT *, (6371 * acos(cos(radians(:lat)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(:lng)) + sin(radians(:lat)) *
        sin(radians(latitude)))) AS distance
        FROM stations WHERE is_active = true
        HAVING distance <= :radius
        ORDER BY distance
        """, nativeQuery = true)
    List<Station> findNearbyStations(@Param("lat") double lat,
                                      @Param("lng") double lng,
                                      @Param("radius") double radius);
}
