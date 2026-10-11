package com.evcharging.pattern.strategy;

import com.evcharging.model.Slot;
import java.util.List;
import java.util.Optional;

// Strategy Pattern: pluggable slot allocation algorithms
public interface SlotAllocationStrategy {
    Optional<Slot> allocate(List<Slot> availableSlots);
}
