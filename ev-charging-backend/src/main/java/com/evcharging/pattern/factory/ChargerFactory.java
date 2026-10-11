package com.evcharging.pattern.factory;

import com.evcharging.model.Charger;
import com.evcharging.model.Charger.ChargerType;

// Factory Pattern: creates charger configurations based on type
public class ChargerFactory {

    public static ChargerConfig createCharger(ChargerType type) {
        return switch (type) {
            case FAST -> new FastChargerConfig();
            case NORMAL -> new NormalChargerConfig();
            case SUPER -> new SuperChargerConfig();
        };
    }

    public interface ChargerConfig {
        double getPowerOutput();
        double getCostPerUnit();
        String getDescription();
    }

    public static class FastChargerConfig implements ChargerConfig {
        @Override public double getPowerOutput() { return 50.0; }
        @Override public double getCostPerUnit() { return 12.0; }
        @Override public String getDescription() { return "Fast Charger - 50kW DC"; }
    }

    public static class NormalChargerConfig implements ChargerConfig {
        @Override public double getPowerOutput() { return 22.0; }
        @Override public double getCostPerUnit() { return 8.0; }
        @Override public String getDescription() { return "Normal Charger - 22kW AC"; }
    }

    public static class SuperChargerConfig implements ChargerConfig {
        @Override public double getPowerOutput() { return 150.0; }
        @Override public double getCostPerUnit() { return 18.0; }
        @Override public String getDescription() { return "Super Charger - 150kW DC Ultra-Fast"; }
    }
}
