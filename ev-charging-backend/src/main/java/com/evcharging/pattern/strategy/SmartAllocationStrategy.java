package com.evcharging.pattern.strategy;

import com.evcharging.model.Slot;
import org.springframework.stereotype.Component;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

// Picks slot with lowest charger ID to balance load across chargers
@Component("SMART")
public class SmartAllocationStrategy implements SlotAllocationStrategy {
    @Override
    public Optional<Slot> allocate(List<Slot> availableSlots) {
        return availableSlots.stream()
                .min(Comparator.comparing(s -> s.getCharger().getId()));
    }
}
