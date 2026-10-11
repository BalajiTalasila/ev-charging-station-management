package com.evcharging.pattern.strategy;

import com.evcharging.model.Slot;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Optional;

@Component("FIFO")
public class FifoAllocationStrategy implements SlotAllocationStrategy {
    @Override
    public Optional<Slot> allocate(List<Slot> availableSlots) {
        return availableSlots.stream().findFirst();
    }
}
