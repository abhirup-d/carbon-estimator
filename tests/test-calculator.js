import { calculateScope2 } from '../js/calculator.js';

const results = document.getElementById('results');
let passed = 0;
let failed = 0;

function assert(name, actual, expected, tolerance = 0.01) {
    const pass = Math.abs(actual - expected) < tolerance;
    if (pass) {
        passed++;
        results.innerHTML += `<div class="pass">PASS: ${name} — got ${actual.toFixed(4)}</div>`;
    } else {
        failed++;
        results.innerHTML += `<div class="fail">FAIL: ${name} — expected ${expected}, got ${actual}</div>`;
    }
}

function assertObj(name, actual, expectedKey, expectedVal, tolerance = 0.01) {
    assert(name, actual[expectedKey], expectedVal, tolerance);
}

// Test: Scope 2 basic calculation
// 500 m2 office, EUI 150 kWh/m2/yr, grid EF 0.82 kgCO2e/kWh (India)
const scope2 = calculateScope2(500, 150, 0.82);
assertObj('Scope 2: estimated electricity', scope2, 'estimatedElectricity', 75000, 1);
assertObj('Scope 2: emissions', scope2, 'emissions', 61500, 1);

// Summary
results.innerHTML += `<div class="summary">${passed} passed, ${failed} failed</div>`;
