package com.evcharging.service;

import com.evcharging.dto.StationRequest;
import com.evcharging.model.*;
import com.evcharging.model.Slot.SlotState;
import com.evcharging.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class StationService {

    private final StationRepository stationRepository;
    private final SlotRepository slotRepository;
    private final UserRepository userRepository;
    private final ChargerRepository chargerRepository;

    @Transactional(readOnly = true)

    public List<Map<String, Object>> getNearbyStations(double lat, double lng) {
        List<Station> stations = stationRepository.findNearbyStations(lat, lng, 30.0);
        return stations.stream().map(s -> {
            Map<String, Object> map = toStationMap(s);
            double distance = calculateDistance(lat, lng, s.getLatitude(), s.getLongitude());
            map.put("distance", Math.round(distance * 10.0) / 10.0);
            return map;
        }).toList();
    }

    private double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
        final int R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    @Transactional(readOnly = true)

    public List<Map<String, Object>> getStationsByCity(String city) {
        List<Station> stations = stationRepository.findByCityIgnoreCase(city);
        return stations.stream().map(this::toStationMap).toList();
    }

    @Transactional(readOnly = true)

    public List<Map<String, Object>> getAllStations() {
        return stationRepository.findAll().stream().map(this::toStationMap).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getStationById(Long id) {
        Station s = stationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Station not found"));
        return toStationMap(s);
    }

    public Station createStation(StationRequest req) {
        Station station = Station.builder()
                .name(req.getName())
                .address(req.getAddress())
                .city(req.getCity())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .totalChargers(req.getTotalChargers())
                .isActive(true)
                .build();

        if (req.getManagerId() != null) {
            station.setManager(
                    userRepository.findById(req.getManagerId()).orElse(null)
            );
        }

        return stationRepository.save(station);
    }

    public Station updateStation(Long id, StationRequest req) {
        Station station = stationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Station not found"));

        station.setName(req.getName());
        station.setAddress(req.getAddress());
        station.setCity(req.getCity());
        station.setLatitude(req.getLatitude());
        station.setLongitude(req.getLongitude());
        station.setTotalChargers(req.getTotalChargers());

        if (req.getManagerId() != null) {
            station.setManager(
                    userRepository.findById(req.getManagerId()).orElse(null)
            );
        }

        return stationRepository.save(station);
    }

    public void deleteStation(Long id) {
        stationRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getManagerStation(Long managerId) {
        Station s = stationRepository.findByManagerId(managerId)
                .orElseThrow(() -> new RuntimeException("No station assigned"));

        return toStationMap(s);
    }

    private Map<String, Object> toStationMap(Station s) {
        long available =
                slotRepository.countByStationIdAndSlotState(
                        s.getId(),
                        SlotState.AVAILABLE
                );

        long total =
                slotRepository.countByStationIdAndSlotState(
                        s.getId(),
                        SlotState.AVAILABLE
                )
                + slotRepository.countByStationIdAndSlotState(
                        s.getId(),
                        SlotState.RESERVED
                )
                + slotRepository.countByStationIdAndSlotState(
                        s.getId(),
                        SlotState.CHARGING
                );

        long actualChargers =
                chargerRepository.findByStationId(s.getId()).size();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", s.getId());
        map.put("name", s.getName());
        map.put("address", s.getAddress());
        map.put("city", s.getCity());
        map.put("latitude", s.getLatitude());
        map.put("longitude", s.getLongitude());
        map.put("totalChargers", actualChargers);
        map.put("availableSlots", available);
        map.put("totalSlots", total);
        map.put("isActive", s.getIsActive());

        if (s.getManager() != null) {
            map.put("managerId", s.getManager().getId());
            map.put("managerName", s.getManager().getName());
        }

        return map;
    }
}
