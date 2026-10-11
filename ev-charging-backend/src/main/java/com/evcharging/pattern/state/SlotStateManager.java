package com.evcharging.pattern.state;

import com.evcharging.model.Slot;
import com.evcharging.model.Slot.SlotState;

// State Pattern: enforces valid slot state transitions
public class SlotStateManager {

    public static SlotState transition(SlotState current, SlotEvent event) {
        return switch (current) {
            case AVAILABLE -> switch (event) {
                case BOOK -> SlotState.RESERVED;
                case SET_MAINTENANCE -> SlotState.MAINTENANCE;
                default -> throw new IllegalStateException("Cannot " + event + " an AVAILABLE slot");
            };
            case RESERVED -> switch (event) {
                case START_CHARGING -> SlotState.CHARGING;
                case CANCEL -> SlotState.AVAILABLE;
                default -> throw new IllegalStateException("Cannot " + event + " a RESERVED slot");
            };
            case CHARGING -> switch (event) {
                case COMPLETE -> SlotState.AVAILABLE;
                default -> throw new IllegalStateException("Cannot " + event + " a CHARGING slot");
            };
            case MAINTENANCE -> switch (event) {
                case RELEASE -> SlotState.AVAILABLE;
                default -> throw new IllegalStateException("Cannot " + event + " a MAINTENANCE slot");
            };
        };
    }

    public enum SlotEvent {
        BOOK, CANCEL, START_CHARGING, COMPLETE, SET_MAINTENANCE, RELEASE
    }
}
