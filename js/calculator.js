// Pure calculation functions for Scope 1 & Scope 2 emissions
// All functions take data objects and return results — no side effects

// ── Uncertainty multipliers by facility type ──
// Proxy-based estimation has inherent variance. These factors represent
// the typical range of energy consumption for a given facility type,
// driven by: building age, envelope quality, occupancy, operational hours.
// Source: derived from CBECS/CIBSE distribution data (10th-90th percentile).
const UNCERTAINTY = {
    office:              { low: 0.65, high: 1.45 },
    retail:              { low: 0.60, high: 1.50 },
    warehouse:           { low: 0.55, high: 1.60 },
    light_manufacturing: { low: 0.50, high: 1.70 },
    heavy_manufacturing: { low: 0.45, high: 1.80 },
    restaurant:          { low: 0.60, high: 1.50 },
    hospital:            { low: 0.70, high: 1.35 },
    hotel:               { low: 0.65, high: 1.45 },
    residential:         { low: 0.55, high: 1.60 },
    school:              { low: 0.65, high: 1.45 }
};

// BENCHMARKS table removed — benchmark comparison now computed dynamically
// using the same EUI model + user's actual grid EF (see getBenchmarkComparison)

/**
 * Calculate Scope 2 emissions from grid electricity.
 * @param {number} facilityArea - Floor area in m²
 * @param {number} eui - Energy Use Intensity in kWh/m²/yr
 * @param {number} gridEF - Grid emission factor in kgCO2e/kWh
 * @returns {{ estimatedElectricity: number, emissions: number }}
 */
export function calculateScope2(facilityArea, eui, gridEF) {
    const estimatedElectricity = facilityArea * eui;
    const emissions = estimatedElectricity * gridEF;
    return { estimatedElectricity, emissions };
}

// ── HDD/CDD-based EUI calculation ──
// Reference climate: zone 4 (mixed) ≈ HDD 2500, CDD 1000
const REF_HDD = 2500;
const REF_CDD = 1000;

// Base electrical EUI (non-HVAC) by facility type in kWh/m2/yr
// This is the plug/lighting/process load that doesn't vary with climate
const BASE_ELECTRICAL = {
    office: 65, retail: 75, warehouse: 25, light_manufacturing: 120,
    heavy_manufacturing: 250, restaurant: 140, hospital: 150, hotel: 85,
    residential: 30, school: 55
};

// Cooling coefficient: kWh per m2 per CDD
const COOLING_COEFF = {
    office: 0.045, retail: 0.050, warehouse: 0.015, light_manufacturing: 0.040,
    heavy_manufacturing: 0.045, restaurant: 0.055, hospital: 0.060, hotel: 0.050,
    residential: 0.025, school: 0.035
};

// Heating coefficient: kWh-equivalent per m2 per HDD (thermal, for Scope 1 boiler calc)
const HEATING_COEFF = {
    office: 0.035, retail: 0.030, warehouse: 0.020, light_manufacturing: 0.035,
    heavy_manufacturing: 0.035, restaurant: 0.040, hospital: 0.050, hotel: 0.045,
    residential: 0.040, school: 0.035
};

/**
 * Calculate EUI from HDD/CDD instead of zone lookup.
 * Returns total electrical EUI in kWh/m2/yr.
 */
export function calculateEUIFromHDDCDD(facilityType, hdd, cdd) {
    const base = BASE_ELECTRICAL[facilityType] || 65;
    const coolingCoeff = COOLING_COEFF[facilityType] || 0.04;
    const coolingEUI = cdd * coolingCoeff;
    return base + coolingEUI;
}

/**
 * Calculate heating energy demand from HDD (used for boiler Scope 1 adjustment).
 * Returns kWh-thermal per m2 per year.
 */
export function calculateHeatingDemand(facilityType, hdd) {
    const coeff = HEATING_COEFF[facilityType] || 0.035;
    return hdd * coeff;
}

/**
 * Calculate Scope 1 emissions from area-based equipment (boilers, generators, cooking, furnaces).
 * @param {number} facilityArea - Floor area in m²
 * @param {number} benchmark - Fuel use benchmark in kWh/m²/yr (or equivalent unit per m²)
 * @param {number} fuelEF - Fuel emission factor in kgCO2e/unit
 * @param {number} facilityMultiplier - Facility-type multiplier (default 1.0)
 * @returns {{ estimatedFuelUse: number, emissions: number }}
 */
export function calculateEquipmentEmissions(facilityArea, benchmark, fuelEF, facilityMultiplier) {
    const estimatedFuelUse = facilityArea * benchmark * facilityMultiplier;
    const emissions = estimatedFuelUse * fuelEF;
    return { estimatedFuelUse, emissions };
}

/**
 * Calculate Scope 1 emissions from a fleet of vehicles.
 * @param {number} count - Number of vehicles
 * @param {number} annualKm - Annual kilometres driven per vehicle
 * @param {number} fuelConsumptionPerKm - Fuel consumption in litres/km
 * @param {number} fuelEF - Fuel emission factor in kgCO2e/litre
 * @returns {{ estimatedFuelUse: number, emissions: number }}
 */
export function calculateFleetEmissions(count, annualKm, fuelConsumptionPerKm, fuelEF) {
    const estimatedFuelUse = count * annualKm * fuelConsumptionPerKm;
    const emissions = estimatedFuelUse * fuelEF;
    return { estimatedFuelUse, emissions };
}

/**
 * Orchestrator: calculate all emissions for a single facility.
 * @param {object} facility - { area, facilityType, equipment, customEUI }
 * @param {object} lookups  - { climateZone, gridEF, euiBenchmarks, equipmentProfiles, fuelFactors, countryCode, defaultFuelMix }
 * @returns {object} Full emissions breakdown
 */
export function calculateFacility(facility, lookups) {
    const {
        area,
        facilityType,
        equipment = {},
        customEUI = null,
        buildingAgeMultiplier = 1.0,
        equipmentEfficiency = {}
    } = facility;

    // Equipment efficiency multipliers
    // Old/inefficient equipment uses more fuel, high-efficiency uses less
    const EFF_MULTIPLIERS = { old: 1.35, standard: 1.0, high_efficiency: 0.70 };

    const {
        climateZone,
        gridEF,
        euiBenchmarks = {},
        equipmentProfiles = {},
        fuelFactors = {},
        countryCode,
        defaultFuelMix = {},
        hdd = null,
        cdd = null
    } = lookups;

    // ── Scope 2 ──
    let euiUsed = customEUI;
    let euiMethod = 'custom';
    if (euiUsed == null) {
        if (hdd != null && cdd != null) {
            // HDD/CDD-based calculation (more precise)
            euiUsed = calculateEUIFromHDDCDD(facilityType, hdd, cdd) * buildingAgeMultiplier;
            euiMethod = 'hdd_cdd';
        } else {
            // Fallback: zone-based lookup
            const zoneMap = euiBenchmarks[facilityType] || {};
            euiUsed = (zoneMap[climateZone] || zoneMap['4'] || 80) * buildingAgeMultiplier;
            euiMethod = 'zone';
        }
    }
    const gridEFUsed = gridEF;
    const scope2Result = calculateScope2(area, euiUsed, gridEFUsed);

    // ── Scope 1: area-based equipment ──
    const areaEquipmentKeys = ['heating_boiler', 'generator', 'cooking', 'furnace'];
    const scope1Breakdown = [];
    let scope1Total = 0;

    for (const key of areaEquipmentKeys) {
        const isChecked = equipment[key] === true || equipment[key] === 1;
        if (!isChecked) continue;

        const profile = equipmentProfiles[key] || {};
        const benchmarkByZone = profile.benchmark || {};
        const benchmark = benchmarkByZone[climateZone] || benchmarkByZone['4'] || 0;

        // Facility multiplier: some profiles vary by facility type
        const multiplierMap = profile.facilityMultipliers || {};
        const facilityMultiplier = multiplierMap[facilityType] || profile.defaultMultiplier || 1.0;

        // Fuel type from facility default mix or profile default
        const fuelType = (defaultFuelMix[facilityType] && defaultFuelMix[facilityType][key])
            || profile.defaultFuel
            || 'natural_gas';
        const fuelEF = fuelFactors[fuelType] || 0;

        // Equipment efficiency multiplier
        const effMultiplier = EFF_MULTIPLIERS[equipmentEfficiency[key]] || 1.0;
        const totalMultiplier = facilityMultiplier * effMultiplier;

        const result = calculateEquipmentEmissions(area, benchmark, fuelEF, totalMultiplier);
        scope1Total += result.emissions;
        scope1Breakdown.push({ type: key, fuelType, efficiency: equipmentEfficiency[key] || 'standard', ...result });
    }

    // ── Scope 1: fleet vehicles ──
    const fleetKeys = ['fleet_car', 'fleet_van', 'fleet_truck'];
    for (const key of fleetKeys) {
        const count = equipment[key] || 0;
        if (count <= 0) continue;

        const profile = equipmentProfiles[key] || {};
        const kmByCountry = profile.annualKm || {};
        const annualKm = kmByCountry[countryCode] || kmByCountry['default'] || 15000;

        const fuelType = (defaultFuelMix[facilityType] && defaultFuelMix[facilityType][key])
            || profile.defaultFuel
            || 'diesel';
        const fuelEF = fuelFactors[fuelType] || 0;

        const fleetEffMultiplier = EFF_MULTIPLIERS[equipmentEfficiency.fleet] || 1.0;
        const fuelConsumptionPerKm = (profile.fuelConsumptionPerKm || 0.08) * fleetEffMultiplier;
        const result = calculateFleetEmissions(count, annualKm, fuelConsumptionPerKm, fuelEF);
        scope1Total += result.emissions;
        scope1Breakdown.push({ type: key, count, fuelType, efficiency: equipmentEfficiency.fleet || 'standard', ...result });
    }

    const midTotal = scope1Total + scope2Result.emissions;
    const u = UNCERTAINTY[facilityType] || { low: 0.60, high: 1.50 };

    return {
        scope1Total,
        scope2Total: scope2Result.emissions,
        estimatedElectricity: scope2Result.estimatedElectricity,
        euiUsed,
        euiMethod,
        gridEFUsed,
        climateZone,
        hdd,
        cdd,
        scope2Detail: scope2Result,
        scope1Breakdown,
        uncertainty: {
            low: midTotal * u.low,
            mid: midTotal,
            high: midTotal * u.high,
            lowFactor: u.low,
            highFactor: u.high
        }
    };
}

/**
 * Aggregate emissions across multiple facilities.
 * @param {Array<{ scope1Total: number, scope2Total: number }>} facilities
 * @returns {{ scope1Total: number, scope2Total: number, grandTotal: number }}
 */
export function aggregateFacilities(facilities) {
    let scope1Total = 0;
    let scope2Total = 0;
    let uncertaintyLow = 0;
    let uncertaintyHigh = 0;
    for (const f of facilities) {
        scope1Total += f.scope1Total || 0;
        scope2Total += f.scope2Total || 0;
        if (f.uncertainty) {
            uncertaintyLow += f.uncertainty.low;
            uncertaintyHigh += f.uncertainty.high;
        }
    }
    const grandTotal = scope1Total + scope2Total;
    return {
        scope1Total,
        scope2Total,
        grandTotal,
        uncertainty: {
            low: uncertaintyLow || grandTotal * 0.6,
            mid: grandTotal,
            high: uncertaintyHigh || grandTotal * 1.5
        }
    };
}

/**
 * Compare a facility's emissions intensity against dynamically computed benchmarks.
 *
 * Average = what a standard-condition building (no age/efficiency adjustments) would emit
 *   at this exact location, using the same EUI model + the user's actual grid EF.
 *
 * Good Practice = what a modern (0.75× EUI), high-efficiency (0.70× equipment) building
 *   would emit. These multipliers come from the same building age and equipment efficiency
 *   factors used in the calculation, representing post-2015 construction with best-in-class
 *   equipment (condensing boilers, modern generators).
 *
 * @param {number} totalEmissions - Actual calculated kgCO2e/yr for this facility
 * @param {number} area - Floor area in m²
 * @param {string} facilityType - e.g. 'office', 'warehouse'
 * @param {number} gridEF - The user's actual grid EF (kgCO2e/kWh)
 * @param {number|null} hdd - Heating Degree Days (or null for zone fallback)
 * @param {number|null} cdd - Cooling Degree Days (or null for zone fallback)
 * @param {object|null} euiBenchmarks - Zone-based EUI lookup (fallback)
 * @param {string|null} climateZone - ASHRAE zone (fallback)
 * @returns {{ emissionsPerM2, avgEmissionsPerM2, goodPracticePerM2, percentDiff }}
 */
export function getBenchmarkComparison(totalEmissions, area, facilityType, gridEF, hdd, cdd, euiBenchmarks, climateZone) {
    const emissionsPerM2 = area > 0 ? totalEmissions / area : 0;

    // Compute the "average" EUI for a standard building at this location
    let avgEUI;
    if (hdd != null && cdd != null) {
        avgEUI = calculateEUIFromHDDCDD(facilityType, hdd, cdd); // no age multiplier
    } else if (euiBenchmarks && euiBenchmarks[facilityType]) {
        const zoneMap = euiBenchmarks[facilityType];
        avgEUI = zoneMap[climateZone] || zoneMap['4'] || 80;
    } else {
        avgEUI = BASE_ELECTRICAL[facilityType] || 65;
    }

    // Average benchmark: standard building, standard equipment, at user's actual grid EF
    // Scope 2 only (Scope 1 varies too much by equipment selection to benchmark meaningfully)
    const avgEmissionsPerM2 = avgEUI * gridEF;

    // Good practice: modern building (0.75× EUI) at same location
    // Represents post-2015 high-efficiency construction
    const goodPracticePerM2 = avgEUI * 0.75 * gridEF;

    const percentDiff = avgEmissionsPerM2 > 0
        ? ((emissionsPerM2 - avgEmissionsPerM2) / avgEmissionsPerM2) * 100
        : 0;

    return { emissionsPerM2, avgEmissionsPerM2, goodPracticePerM2, percentDiff };
}
