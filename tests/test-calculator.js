import {
    calculateScope2,
    calculateEquipmentEmissions,
    calculateFleetEmissions,
    calculateFacility,
    aggregateFacilities,
    getBenchmarkComparison
} from '../js/calculator.js';

const results = document.getElementById('results');
let passed = 0;
let failed = 0;

function assert(name, actual, expected, tolerance = 1) {
    const pass = Math.abs(actual - expected) <= tolerance;
    if (pass) {
        passed++;
        results.innerHTML += `<div class="pass">PASS: ${name} — got ${actual.toFixed(2)}</div>`;
    } else {
        failed++;
        results.innerHTML += `<div class="fail">FAIL: ${name} — expected ${expected}, got ${actual.toFixed(2)}</div>`;
    }
}

function section(name) {
    results.innerHTML += `<h3 style="margin-top:1rem">${name}</h3>`;
}

// ── Scope 2 Tests ──
section('Scope 2 — Grid Electricity');

const s2 = calculateScope2(500, 180, 0.82);
assert('S2: estimated kWh', s2.estimatedElectricity, 90000);
assert('S2: emissions kgCO2e', s2.emissions, 73800);

const s2custom = calculateScope2(500, 100, 0.82);
assert('S2 custom EUI: kWh', s2custom.estimatedElectricity, 50000);
assert('S2 custom EUI: emissions', s2custom.emissions, 41000);

const s2zero = calculateScope2(0, 180, 0.82);
assert('S2 zero area: emissions', s2zero.emissions, 0);

// ── Equipment Emissions Tests ──
section('Scope 1 — Equipment');

const boiler = calculateEquipmentEmissions(500, 18, 2.02, 1.0);
assert('Boiler: fuel use', boiler.estimatedFuelUse, 9000);
assert('Boiler: emissions', boiler.emissions, 18180);

const cooking = calculateEquipmentEmissions(200, 2, 2.98, 3.0);
assert('Cooking restaurant: fuel use', cooking.estimatedFuelUse, 1200);
assert('Cooking restaurant: emissions', cooking.emissions, 3576);

const gen = calculateEquipmentEmissions(1000, 1.2, 2.68, 1.0);
assert('Generator: fuel use', gen.estimatedFuelUse, 1200);
assert('Generator: emissions', gen.emissions, 3216);

// ── Fleet Tests ──
section('Scope 1 — Fleet Vehicles');

const fleet = calculateFleetEmissions(5, 15000, 0.08, 2.31);
assert('Fleet 5 cars: fuel litres', fleet.estimatedFuelUse, 6000);
assert('Fleet 5 cars: emissions', fleet.emissions, 13860);

const trucks = calculateFleetEmissions(2, 50000, 0.25, 2.68);
assert('Fleet 2 trucks: fuel litres', trucks.estimatedFuelUse, 25000);
assert('Fleet 2 trucks: emissions', trucks.emissions, 67000);

const noFleet = calculateFleetEmissions(0, 15000, 0.08, 2.31);
assert('Fleet 0 vehicles: emissions', noFleet.emissions, 0);

// ── Facility Aggregation Tests ──
section('Multi-Facility Aggregation');

const facilities = [
    { name: 'HQ', scope1Total: 5000, scope2Total: 20000 },
    { name: 'Warehouse', scope1Total: 2000, scope2Total: 8000 }
];
const agg = aggregateFacilities(facilities);
assert('Aggregation: total scope1', agg.scope1Total, 7000);
assert('Aggregation: total scope2', agg.scope2Total, 28000);
assert('Aggregation: grand total', agg.grandTotal, 35000);

// ── Benchmark Tests ──
section('Benchmark Comparison');

const bench = getBenchmarkComparison(30000, 500, 'office', '4');
assert('Benchmark: emissions per m2', bench.emissionsPerM2, 60);
assert('Benchmark: avg > 0', bench.avgEmissionsPerM2 > 0 ? 1 : 0, 1, 0);
assert('Benchmark: good practice > 0', bench.goodPracticePerM2 > 0 ? 1 : 0, 1, 0);

// ── Summary ──
results.innerHTML += `<div class="summary">${passed} passed, ${failed} failed</div>`;
if (failed > 0) {
    document.title = `FAIL (${failed})`;
} else {
    document.title = `ALL PASS (${passed})`;
}
