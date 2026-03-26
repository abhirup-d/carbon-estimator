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

// ── Benchmark data: average kgCO2e/m2/yr by facility type and climate zone ──
const BENCHMARKS = {
    office:              { "1": 95, "2": 85, "3": 80, "4": 75, "5": 72, "6": 70, "7": 68, "8": 66 },
    retail:              { "1": 105, "2": 95, "3": 88, "4": 82, "5": 78, "6": 75, "7": 72, "8": 70 },
    warehouse:           { "1": 35, "2": 32, "3": 30, "4": 28, "5": 26, "6": 25, "7": 24, "8": 23 },
    light_manufacturing: { "1": 130, "2": 120, "3": 112, "4": 105, "5": 100, "6": 97, "7": 94, "8": 92 },
    heavy_manufacturing: { "1": 210, "2": 198, "3": 188, "4": 180, "5": 174, "6": 170, "7": 166, "8": 162 },
    restaurant:          { "1": 160, "2": 148, "3": 140, "4": 132, "5": 126, "6": 122, "7": 118, "8": 115 },
    hospital:            { "1": 170, "2": 158, "3": 148, "4": 140, "5": 134, "6": 130, "7": 126, "8": 122 },
    hotel:               { "1": 115, "2": 105, "3": 98, "4": 92, "5": 88, "6": 85, "7": 82, "8": 80 },
    residential:         { "1": 42, "2": 38, "3": 35, "4": 33, "5": 31, "6": 30, "7": 29, "8": 28 },
    school:              { "1": 78, "2": 72, "3": 66, "4": 62, "5": 58, "6": 56, "7": 54, "8": 52 }
};

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
        customEUI = null
    } = facility;

    const {
        climateZone,
        gridEF,
        euiBenchmarks = {},
        equipmentProfiles = {},
        fuelFactors = {},
        countryCode,
        defaultFuelMix = {}
    } = lookups;

    // ── Scope 2 ──
    let euiUsed = customEUI;
    if (euiUsed == null) {
        const zoneMap = euiBenchmarks[facilityType] || {};
        euiUsed = zoneMap[climateZone] || zoneMap['4'] || 80;
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

        const result = calculateEquipmentEmissions(area, benchmark, fuelEF, facilityMultiplier);
        scope1Total += result.emissions;
        scope1Breakdown.push({ type: key, fuelType, ...result });
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

        const fuelConsumptionPerKm = profile.fuelConsumptionPerKm || 0.08;
        const result = calculateFleetEmissions(count, annualKm, fuelConsumptionPerKm, fuelEF);
        scope1Total += result.emissions;
        scope1Breakdown.push({ type: key, count, fuelType, ...result });
    }

    const midTotal = scope1Total + scope2Result.emissions;
    const u = UNCERTAINTY[facilityType] || { low: 0.60, high: 1.50 };

    return {
        scope1Total,
        scope2Total: scope2Result.emissions,
        estimatedElectricity: scope2Result.estimatedElectricity,
        euiUsed,
        gridEFUsed,
        climateZone,
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
 * Compare a facility's emissions intensity against sector benchmarks.
 * @param {number} totalEmissions - Total kgCO2e/yr
 * @param {number} area - Floor area in m²
 * @param {string} facilityType - e.g. 'office', 'warehouse'
 * @param {string} climateZone - Climate zone key e.g. '4'
 * @returns {{ emissionsPerM2: number, avgEmissionsPerM2: number, goodPracticePerM2: number, percentDiff: number }}
 */
export function getBenchmarkComparison(totalEmissions, area, facilityType, climateZone) {
    const emissionsPerM2 = area > 0 ? totalEmissions / area : 0;

    const zoneMap = BENCHMARKS[facilityType] || BENCHMARKS['office'];
    const avgEmissionsPerM2 = zoneMap[climateZone] || zoneMap['4'] || 80;
    const goodPracticePerM2 = avgEmissionsPerM2 * 0.6;
    const percentDiff = avgEmissionsPerM2 > 0
        ? ((emissionsPerM2 - avgEmissionsPerM2) / avgEmissionsPerM2) * 100
        : 0;

    return { emissionsPerM2, avgEmissionsPerM2, goodPracticePerM2, percentDiff };
}
