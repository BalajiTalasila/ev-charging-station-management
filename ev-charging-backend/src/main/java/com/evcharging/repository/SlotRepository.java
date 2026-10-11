package com.evcharging.repository;

import com.evcharging.model.Slot;
import com.evcharging.model.Slot.SlotState;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SlotRepository extends JpaRepository<Slot, Long> {
    List<Slot> findByStationId(Long stationId);
    List<Slot> findByChargerId(Long chargerId);
    List<Slot> findByChargerIdAndSlotState(Long chargerId, SlotState state);
    long countByStationIdAndSlotState(Long stationId, SlotState state);
    long countByChargerId(Long chargerId);
    long countByChargerIdAndSlotState(Long chargerId, SlotState state);
}
