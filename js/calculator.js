// Pure calculation functions for Scope 1 & Scope 2 emissions
// All functions take data objects and return results — no side effects

export function calculateScope2(facilityArea, eui, gridEF) {
    const estimatedElectricity = facilityArea * eui;
    const emissions = estimatedElectricity * gridEF;
    return { estimatedElectricity, emissions };
}
