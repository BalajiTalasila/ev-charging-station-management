package com.evcharging.repository;

import com.evcharging.model.Charger;
import com.evcharging.model.Charger.ChargerType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChargerRepository extends JpaRepository<Charger, Long> {
    List<Charger> findByStationId(Long stationId);
    List<Charger> findByStationIdAndChargerType(Long stationId, ChargerType type);
    long countByStationIdAndStatus(Long stationId, Charger.ChargerStatus status);
}
