package com.evcharging.service;

import com.evcharging.model.*;
import com.evcharging.model.Booking.BookingStatus;
import com.evcharging.model.Charger.ChargerStatus;
import com.evcharging.model.Charger.ChargerType;
import com.evcharging.model.Slot.SlotState;
import com.evcharging.model.Waitlist.WaitlistStatus;
import com.evcharging.pattern.factory.ChargerFactory;
import com.evcharging.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ChargerService {

    private final ChargerRepository chargerRepository;
    private final SlotRepository slotRepository;
    private final StationRepository stationRepository;

    @Lazy @Autowired private BookingRepository bookingRepository;
    @Lazy @Autowired private WaitlistRepository waitlistRepository;

    public Map<String, Object> addChargerWithSlots(Long stationId, String type, String chargerNumber, int numberOfSlots) {
        Charger charger = addCharger(stationId, type, chargerNumber);
        List<Slot> slots = new ArrayList<>();
        for (int i = 1; i <= numberOfSlots; i++) {
            Slot slot = Slot.builder()
                    .slotNumber(chargerNumber + "-S" + i)
                    .slotState(SlotState.AVAILABLE)
                    .charger(charger)
                    .station(charger.getStation())
                    .build();
            slots.add(slotRepository.save(slot));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("charger", charger);
        result.put("slotsCreated", slots.size());
        return result;
    }

    public Charger addCharger(Long stationId, String type, String chargerNumber) {
        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> new RuntimeException("Station not found"));
        ChargerType chargerType = ChargerType.valueOf(type);
        ChargerFactory.ChargerConfig config = ChargerFactory.createCharger(chargerType);

        Charger charger = Charger.builder()
                .station(station)
                .chargerType(chargerType)
                .chargerNumber(chargerNumber)
                .powerOutput(config.getPowerOutput())
                .status(ChargerStatus.ACTIVE)
                .build();
        return chargerRepository.save(charger);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getStationChargers(Long stationId) {
        return chargerRepository.findByStationId(stationId).stream().map(c -> {
            long available = slotRepository.countByChargerIdAndSlotState(
                    c.getId(),
                    SlotState.AVAILABLE
            );
            long total = slotRepository.countByChargerId(c.getId());
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", c.getId());
            map.put("chargerNumber", c.getChargerNumber());
            map.put("chargerType", c.getChargerType());
            map.put("powerOutput", c.getPowerOutput());
            map.put("status", c.getStatus());
            map.put("totalSlots", total);
            map.put("slots", slotRepository.findByChargerId(c.getId()).stream().map(s -> {
                Map<String, Object> sm = new LinkedHashMap<>();
                sm.put("id", s.getId());
                sm.put("slotNumber", s.getSlotNumber());
                sm.put("slotState", s.getSlotState());
                return sm;
            }).toList());
            return map;
        }).toList();
    }

    public Charger setMaintenance(Long chargerId, boolean maintenance) {
        Charger charger = chargerRepository.findById(chargerId)
                .orElseThrow(() -> new RuntimeException("Charger not found"));
        charger.setStatus(maintenance ? ChargerStatus.MAINTENANCE : ChargerStatus.ACTIVE);
        return chargerRepository.save(charger);
    }

    public Slot updateSlotState(Long slotId, String state) {
        Slot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new RuntimeException("Slot not found"));
        slot.setSlotState(SlotState.valueOf(state));
        return slotRepository.save(slot);
    }

    public void deleteCharger(Long chargerId) {
        if (!chargerRepository.existsById(chargerId)) {
            throw new RuntimeException("Charger not found");
        }

        long bookingCount = bookingRepository.countByChargerId(chargerId);

        if (bookingCount > 0) {
            throw new RuntimeException(
                    "Cannot delete charger because it has " + bookingCount + " booking(s) associated with it"
            );
        }

        // Remove dependent slots first because slots.charger_id
        // does not currently use ON DELETE CASCADE.
        slotRepository.deleteAll(slotRepository.findByChargerId(chargerId));

        chargerRepository.deleteById(chargerId);
    }

    // For user-facing view: shows each charger with AVAILABLE/OCCUPIED status + waitlist count
    public List<Map<String, Object>> getStationChargersWithStatus(Long stationId) {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        return chargerRepository.findByStationId(stationId).stream().map(c -> {
            // Only "occupied now" if there's an active booking whose time window covers right now
            Optional<Booking> currentBooking = bookingRepository.findActiveNow(c.getId(), now);
            long waitlistCount = waitlistRepository
                    .findByChargerIdAndStatusOrderByPriorityScoreDescJoinedAtAsc(c.getId(), WaitlistStatus.WAITING)
                    .size();

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", c.getId());
            map.put("chargerNumber", c.getChargerNumber());
            map.put("chargerType", c.getChargerType());
            map.put("powerOutput", c.getPowerOutput());
            map.put("status", c.getStatus());
            map.put("occupied", currentBooking.isPresent());
            map.put("waitlistCount", waitlistCount);
            if (currentBooking.isPresent()) {
                map.put("freeAt", currentBooking.get().getEndTime());
            }
            return map;
        }).toList();
    }
}
