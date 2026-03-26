// Results dashboard renderer
import { aggregateFacilities, getBenchmarkComparison } from './calculator.js';

// ── Color map for emission sources ──────────────────────────────────────────
const SOURCE_COLORS = {
    'Electricity':    '#5B8DEF',
    'Natural Gas':    '#F5A623',
    'Diesel':         '#8E8E93',
    'Gasoline':       '#636366',
    'Lpg':            '#FFD60A',
    'Fuel Oil':       '#AF52DE',
    'Fleet Vehicles': '#34C759'
};

const DEFAULT_COLOR = '#AAAAAA';

// Fleet equipment keys — grouped into "Fleet Vehicles" in the donut
const FLEET_KEYS = new Set(['fleet_car', 'fleet_van', 'fleet_truck']);

// ── Helpers ──────────────────────────────────────────────────────────────────

function kgToTonne(kg) {
    return kg / 1000;
}

function fmt(tonne, decimals = 2) {
    return tonne.toFixed(decimals);
}

function capitalize(str) {
    if (!str) return str;
    return str
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/**
 * Aggregate emissions by display source across all facilities.
 * Returns Map<label, kgCO2e>
 */
function aggregateBySource(facilities) {
    const map = new Map();

    for (const facility of facilities) {
        // Scope 2: Electricity
        const elec = facility.scope2Total || 0;
        map.set('Electricity', (map.get('Electricity') || 0) + elec);

        // Scope 1 breakdown
        for (const item of (facility.scope1Breakdown || [])) {
            const equipment = item.equipment || item.type || '';
            let label;
            if (FLEET_KEYS.has(equipment)) {
                label = 'Fleet Vehicles';
            } else {
                // Capitalize the fuel type
                const ft = item.fuelType || 'unknown';
                label = capitalize(ft);
            }
            map.set(label, (map.get(label) || 0) + (item.emissions || 0));
        }
    }

    return map;
}

// ── SVG Donut Chart ──────────────────────────────────────────────────────────

function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad)
    };
}

function arcPath(cx, cy, outerR, innerR, startAngle, endAngle) {
    // Clamp sweep so full circle doesn't collapse
    const sweep = Math.min(endAngle - startAngle, 359.9999);
    const end = startAngle + sweep;

    const o1 = polarToCartesian(cx, cy, outerR, startAngle);
    const o2 = polarToCartesian(cx, cy, outerR, end);
    const i1 = polarToCartesian(cx, cy, innerR, end);
    const i2 = polarToCartesian(cx, cy, innerR, startAngle);

    const largeArc = sweep > 180 ? 1 : 0;

    return [
        `M ${o1.x} ${o1.y}`,
        `A ${outerR} ${outerR} 0 ${largeArc} 1 ${o2.x} ${o2.y}`,
        `L ${i1.x} ${i1.y}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${i2.x} ${i2.y}`,
        'Z'
    ].join(' ');
}

function buildDonutChart(sourceMap, totalKg) {
    const cx = 100, cy = 100, outerR = 80, innerR = 50;
    const totalTonne = kgToTonne(totalKg);

    const entries = [...sourceMap.entries()].filter(([, kg]) => kg > 0);
    const paths = [];
    let currentAngle = 0;

    for (const [label, kg] of entries) {
        const pct = totalKg > 0 ? kg / totalKg : 0;
        const angleSweep = pct * 360;
        const color = SOURCE_COLORS[label] || DEFAULT_COLOR;
        const tonne = kgToTonne(kg);
        const tooltipText = `${label}: ${fmt(tonne)} tCO2e (${(pct * 100).toFixed(1)}%)`;

        const d = arcPath(cx, cy, outerR, innerR, currentAngle, currentAngle + angleSweep);
        paths.push(`<path d="${d}" fill="${color}" stroke="#fff" stroke-width="1.5"><title>${tooltipText}</title></path>`);
        currentAngle += angleSweep;
    }

    // Center text
    const centerText = `
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="14" font-weight="700" fill="#1a1a1a">${fmt(totalTonne)}</text>
        <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="9" fill="#555">tCO2e/yr</text>
    `;

    const svg = `
        <svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="Emissions by source donut chart">
            ${paths.join('\n')}
            ${centerText}
        </svg>
    `;

    // Legend
    const legendItems = entries.map(([label, kg]) => {
        const color = SOURCE_COLORS[label] || DEFAULT_COLOR;
        const tonne = kgToTonne(kg);
        const pct = totalKg > 0 ? (kg / totalKg * 100).toFixed(1) : '0.0';
        return `
            <div class="legend-item">
                <span class="legend-color" style="background:${color}"></span>
                <span class="legend-label">${label}</span>
                <span class="legend-pct">${fmt(tonne)} t (${pct}%)</span>
            </div>
        `;
    }).join('');

    return `
        <div class="donut-chart-wrap">
            ${svg}
            <div class="donut-legend">${legendItems}</div>
        </div>
    `;
}

// ── Facility Table ───────────────────────────────────────────────────────────

function buildFacilityTable(facilities) {
    if (facilities.length <= 1) return '';

    let totalScope1 = 0, totalScope2 = 0;

    const rows = facilities.map(f => {
        const s1 = kgToTonne(f.scope1Total || 0);
        const s2 = kgToTonne(f.scope2Total || 0);
        const tot = s1 + s2;
        totalScope1 += f.scope1Total || 0;
        totalScope2 += f.scope2Total || 0;
        return `
            <tr>
                <td>${f.name || 'Unnamed'}</td>
                <td>${capitalize(f.type || f.facilityType || '')}</td>
                <td>${(f.area || 0).toLocaleString()}</td>
                <td>${fmt(s1)}</td>
                <td>${fmt(s2)}</td>
                <td><strong>${fmt(tot)}</strong></td>
            </tr>
        `;
    }).join('');

    const totalT1 = kgToTonne(totalScope1);
    const totalT2 = kgToTonne(totalScope2);
    const grandTotal = totalT1 + totalT2;

    return `
        <table class="facility-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Area (m²)</th>
                    <th>Scope 1 (tCO2e)</th>
                    <th>Scope 2 (tCO2e)</th>
                    <th>Total (tCO2e)</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td colspan="3"><strong>Total</strong></td>
                    <td><strong>${fmt(totalT1)}</strong></td>
                    <td><strong>${fmt(totalT2)}</strong></td>
                    <td><strong>${fmt(grandTotal)}</strong></td>
                </tr>
            </tfoot>
        </table>
    `;
}

// ── Benchmark Bars ───────────────────────────────────────────────────────────

function buildBenchmarkBars(facilities) {
    const sections = facilities.map(facility => {
        const totalEmissions = (facility.scope1Total || 0) + (facility.scope2Total || 0);
        const area = facility.area || 1;
        const type = facility.type || facility.facilityType || 'office';
        const zone = String(facility.climateZone || '4');
        const gridEF = facility.gridEFUsed || 0.5;
        const hdd = facility.hdd != null ? facility.hdd : null;
        const cdd = facility.cdd != null ? facility.cdd : null;

        const { emissionsPerM2, avgEmissionsPerM2, goodPracticePerM2, percentDiff } =
            getBenchmarkComparison(totalEmissions, area, type, gridEF, hdd, cdd, null, zone);

        const maxVal = Math.max(emissionsPerM2, avgEmissionsPerM2, goodPracticePerM2) * 1.3 || 1;

        const yourPct  = (emissionsPerM2    / maxVal * 100).toFixed(1);
        const avgPct   = (avgEmissionsPerM2 / maxVal * 100).toFixed(1);
        const goodPct  = (goodPracticePerM2 / maxVal * 100).toFixed(1);

        const diffAbs  = Math.abs(percentDiff).toFixed(1);
        const isAbove  = percentDiff > 0;
        const diffText = isAbove
            ? `${diffAbs}% above average`
            : `${diffAbs}% below average`;
        const diffClass = isAbove ? 'diff-above' : 'diff-below';

        const facilityLabel = facilities.length > 1
            ? `<h4 class="benchmark-facility-name">${facility.name || 'Facility'}</h4>`
            : '';

        return `
            <div class="benchmark-facility">
                ${facilityLabel}
                <div class="bench-bar-group">
                    <div class="bench-bar-row">
                        <span class="bench-label">Your estimate</span>
                        <div class="bench-bar-track">
                            <div class="bench-bar yours" style="width:${yourPct}%"></div>
                        </div>
                        <span class="bench-value">${emissionsPerM2.toFixed(1)} kg/m²</span>
                    </div>
                    <div class="bench-bar-row">
                        <span class="bench-label">Average</span>
                        <div class="bench-bar-track">
                            <div class="bench-bar average" style="width:${avgPct}%"></div>
                        </div>
                        <span class="bench-value">${avgEmissionsPerM2.toFixed(1)} kg/m²</span>
                    </div>
                    <div class="bench-bar-row">
                        <span class="bench-label">Good practice</span>
                        <div class="bench-bar-track">
                            <div class="bench-bar good" style="width:${goodPct}%"></div>
                        </div>
                        <span class="bench-value">${goodPracticePerM2.toFixed(1)} kg/m²</span>
                    </div>
                </div>
                <p class="bench-diff ${diffClass}">${diffText}</p>
                <p class="bench-note">Average = standard building at your location &amp; grid. Good practice = post-2015 high-efficiency building (0.75× EUI).</p>
            </div>
        `;
    }).join('');

    return `<div class="benchmark-container">${sections}</div>`;
}

// ── Assumptions Panel ────────────────────────────────────────────────────────

function buildAssumptionsPanel(facilities) {
    const items = facilities.map(f => {
        const equipRows = (f.scope1Breakdown || []).map(item => {
            const equipName = capitalize(item.equipment || item.type || '');
            const fuel = capitalize(item.fuelType || '');
            const usage = (item.estimatedFuelUse || 0).toFixed(1);
            const unit = item.fuelUnit || 'units';
            const emissions = kgToTonne(item.emissions || 0).toFixed(3);
            return `<li>${equipName} — ${fuel}, ~${usage} ${unit}/yr, ${emissions} tCO2e</li>`;
        }).join('');

        const elecKwh  = (f.estimatedElectricity || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
        const euiVal   = (f.euiUsed || 0).toFixed(1);
        const gridEFVal = (f.gridEFUsed || 0).toFixed(3);
        const zone     = f.climateZone || 'N/A';

        return `
            <div class="assumption-facility">
                <h4>${f.name || 'Facility'}</h4>
                <ul class="assumption-list">
                    <li>Climate zone: ${zone}</li>
                    <li>EUI used: ${euiVal} kWh/m²/yr</li>
                    <li>Grid emission factor: ${gridEFVal} kgCO2e/kWh</li>
                    <li>Estimated electricity: ${elecKwh} kWh/yr</li>
                    ${equipRows}
                </ul>
            </div>
        `;
    }).join('');

    return `
        <div class="collapsible">
            <button class="collapsible-header" aria-expanded="false">
                Assumptions &amp; Methodology
                <span class="collapsible-icon" aria-hidden="true">&#9660;</span>
            </button>
            <div class="collapsed-content">
                ${items}
                <p class="assumption-note">
                    All estimates use area-based benchmarks. Scope 2 uses grid emission factors
                    for the selected country/region. Scope 1 uses IPCC default emission factors.
                    Figures are indicative only and should be validated with metered data.
                </p>
            </div>
        </div>
    `;
}

// ── CSV Export ───────────────────────────────────────────────────────────────

function buildCSV(facilities) {
    const lines = [];

    // Verification header
    const allVerified = facilities.every(f => f.orenVerified);
    const anyVerified = facilities.some(f => f.orenVerified);
    const status = allVerified ? 'OREN VERIFIED' : anyVerified ? 'PARTIALLY VERIFIED' : 'UNVERIFIED ESTIMATE';
    lines.push(`Carbon Emission Estimate — ${status}`);
    lines.push('Generated by Oren Carbon Emission Estimator');
    lines.push('Methodology: See methodology.html for full documentation of sources and assumptions');
    lines.push('');

    // Summary section
    lines.push('Summary');
    lines.push('Facility,Type,Area (m2),Scope 1 (tCO2e),Scope 2 (tCO2e),Total (tCO2e),Verified');
    for (const f of facilities) {
        const s1 = kgToTonne(f.scope1Total || 0).toFixed(3);
        const s2 = kgToTonne(f.scope2Total || 0).toFixed(3);
        const tot = (parseFloat(s1) + parseFloat(s2)).toFixed(3);
        const name = (f.name || 'Unnamed').replace(/,/g, ' ');
        const type = (f.type || f.facilityType || '').replace(/,/g, ' ');
        lines.push(`${name},${type},${f.area || 0},${s1},${s2},${tot},${f.orenVerified ? 'Yes' : 'No'}`);
    }

    lines.push('');
    lines.push('Detailed Breakdown');
    lines.push('Facility,Source,Fuel Type,Usage,Unit,Emissions (tCO2e)');

    for (const f of facilities) {
        const fname = (f.name || 'Unnamed').replace(/,/g, ' ');

        // Scope 2 row
        const elec = kgToTonne(f.scope2Total || 0).toFixed(3);
        const elecKwh = (f.estimatedElectricity || 0).toFixed(0);
        lines.push(`${fname},Electricity,Grid,${elecKwh},kWh,${elec}`);

        // Scope 1 rows
        for (const item of (f.scope1Breakdown || [])) {
            const equip = (item.equipment || item.type || '').replace(/,/g, ' ');
            const fuel  = (item.fuelType || '').replace(/,/g, ' ');
            const usage = (item.estimatedFuelUse || 0).toFixed(2);
            const unit  = (item.fuelUnit || 'units').replace(/,/g, ' ');
            const em    = kgToTonne(item.emissions || 0).toFixed(3);
            lines.push(`${fname},${equip},${fuel},${usage},${unit},${em}`);
        }
    }

    return lines.join('\n');
}

function exportCSV(facilities) {
    const csv = buildCSV(facilities);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carbon-emissions-estimate.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportPDF() {
    window.print();
}

// ── Main render ──────────────────────────────────────────────────────────────

/**
 * Render the results dashboard.
 * @param {HTMLElement} container  - The #dashboard DOM element
 * @param {Array}       facilities - Array of completed facility result objects
 * @param {object}      data       - App-level data (unused here, reserved for future use)
 */
export function renderDashboard(container, facilities, data) {
    const agg = aggregateFacilities(facilities);
    const { scope1Total, scope2Total, grandTotal } = agg;

    const totalTonne   = kgToTonne(grandTotal);
    const scope1Tonne  = kgToTonne(scope1Total);
    const scope2Tonne  = kgToTonne(scope2Total);

    // Check if any facility is Oren Verified
    const anyVerified = facilities.some(f => f.orenVerified);
    const allVerified = facilities.every(f => f.orenVerified);
    const verificationStatus = allVerified ? 'verified' : anyVerified ? 'partial' : 'unverified';
    const verificationLabel = allVerified ? 'Oren Verified' : anyVerified ? 'Partially Verified' : 'Unverified Estimate';
    const verificationClass = allVerified ? 'verified' : anyVerified ? 'partial' : 'unverified';

    const sourceMap    = aggregateBySource(facilities);

    // Build inner HTML sections
    const donutHTML      = buildDonutChart(sourceMap, grandTotal);
    const tableHTML      = buildFacilityTable(facilities);
    const benchmarkHTML  = buildBenchmarkBars(facilities);
    const assumptionsHTML = buildAssumptionsPanel(facilities);

    // Facility table card only rendered for multi-facility
    const tableCard = facilities.length > 1
        ? `<div class="dash-card"><h3>Facility Breakdown</h3>${tableHTML}</div>`
        : '';

    const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    container.innerHTML = `
        <div class="dashboard-wrapper">
            <!-- Print-only report header -->
            <div class="report-header print-only">
                <div class="report-logo">
                    <img src="svg/oren-logo.png" alt="Oren" style="height: 40px;" />
                </div>
                <div class="report-title">
                    <h1 style="font-size: 1.3rem; margin: 0;">Carbon Emission Estimate</h1>
                    <p style="font-size: 0.8rem; color: #636366; margin: 0.15rem 0 0 0;">
                        Report generated: ${reportDate} |
                        Status: <strong style="color: ${allVerified ? '#2E7D32' : '#BF360C'}">${verificationLabel}</strong>
                    </p>
                </div>
            </div>

            <header class="dash-header no-print">
                <button id="back-to-wizard" class="btn-text">&larr; Add more facilities</button>
                <h1>Your Carbon Footprint Estimate</h1>
            </header>

            <div class="dash-headline">
                <div class="verification-badge ${verificationClass}">
                    <span class="verification-icon">${allVerified ? '&#10003;' : '&#9888;'}</span>
                    <span>${verificationLabel}</span>
                    <a href="methodology.html" target="_blank" class="verification-link no-print">View methodology</a>
                </div>
                <div class="headline-total">
                    <span class="headline-number">${fmt(totalTonne, 1)}</span>
                    <span class="headline-unit">tCO2e / year</span>
                </div>
                <div class="uncertainty-range">
                    <span class="range-label">Estimated range:</span>
                    <span class="range-values">${fmt(kgToTonne(agg.uncertainty.low), 1)} — ${fmt(kgToTonne(agg.uncertainty.high), 1)} tCO2e</span>
                    <div class="range-bar-track">
                        <div class="range-bar-fill"></div>
                        <div class="range-bar-marker" style="left: ${((grandTotal - agg.uncertainty.low) / (agg.uncertainty.high - agg.uncertainty.low) * 100).toFixed(0)}%"></div>
                    </div>
                    <div class="range-labels">
                        <span>Low</span><span>Best estimate</span><span>High</span>
                    </div>
                </div>
                <div class="headline-badges">
                    <div class="badge scope1">
                        <span>Scope 1: ${fmt(scope1Tonne)} tCO2e</span>
                    </div>
                    <div class="badge scope2">
                        <span>Scope 2: ${fmt(scope2Tonne)} tCO2e</span>
                    </div>
                </div>
            </div>

            <div class="dash-grid">
                <div class="dash-card">
                    <h3>Emissions by Source</h3>
                    ${donutHTML}
                </div>

                ${tableCard}

                <div class="dash-card">
                    <h3>Benchmark Comparison</h3>
                    ${benchmarkHTML}
                </div>

                <div class="dash-card">
                    ${assumptionsHTML}
                </div>
            </div>

            <!-- Print-only footer -->
            <div class="report-footer print-only">
                <div style="border-top: 1px solid #e5e5ea; padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #2E7D32;">Oren</strong> Carbon Emission Estimator
                        <span style="color: #8e8e93;"> | </span>
                        <span style="font-size: 0.75rem; color: #8e8e93;">Powered by open data from IPCC, IEA, CEA, EPA, DESNZ, EEA, Ember</span>
                    </div>
                    <div style="font-size: 0.75rem; color: #8e8e93;">
                        www.orennow.com | Full methodology: methodology.html
                    </div>
                </div>
                <p style="font-size: 0.7rem; color: #AEAEB2; margin-top: 0.5rem;">
                    This estimate is based on facility characteristics and benchmark data. ${allVerified
                        ? 'This is an Oren Verified estimate — building quality and equipment efficiency data were provided for enhanced accuracy.'
                        : 'This is an unverified estimate — building quality and equipment efficiency data were not provided. Provide these for an Oren Verified estimate with higher accuracy.'}
                </p>
            </div>

            <div class="dash-export no-print">
                <button id="export-csv" class="btn-secondary">Download CSV</button>
                <button id="export-pdf" class="btn-secondary">Download PDF</button>
                <a href="methodology.html" target="_blank" class="btn-secondary" style="text-decoration:none;text-align:center;">Methodology</a>
            </div>
        </div>
    `;

    // ── Event listeners ──────────────────────────────────────────────────────

    container.querySelector('#back-to-wizard').addEventListener('click', () => {
        container.classList.add('hidden');
        const wizardPanel = document.getElementById('wizard-panel');
        const visualPanel = document.getElementById('visual-panel');
        if (wizardPanel) wizardPanel.classList.remove('hidden');
        if (visualPanel) visualPanel.classList.remove('hidden');
    });

    container.querySelector('#export-csv').addEventListener('click', () => {
        exportCSV(facilities);
    });

    container.querySelector('#export-pdf').addEventListener('click', () => {
        exportPDF();
    });

    // Collapsible assumptions panel
    container.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            if (!content) return;
            const isExpanded = content.classList.toggle('expanded');
            header.setAttribute('aria-expanded', String(isExpanded));
        });
    });
}
