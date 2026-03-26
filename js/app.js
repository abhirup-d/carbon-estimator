import { calculateFacility, aggregateFacilities, getBenchmarkComparison } from './calculator.js';
import { renderBuilding, clearBuilding } from './visualizer.js';
import { renderDashboard } from './dashboard.js';

// ── Unit conversion ──────────────────────────────────────────────────────────
const SQM_PER_SQFT = 0.092903;
function toSqm(value, unit) { return unit === 'sqft' ? value * SQM_PER_SQFT : value; }
function fromSqm(value, unit) { return unit === 'sqft' ? value / SQM_PER_SQFT : value; }

// ── App State ────────────────────────────────────────────────────────────────
export const appState = {
    currentStep: 1,
    location: { country: null, region: null, city: null },
    currentFacility: {
        name: '',
        facilityType: null,
        area: 0,
        areaUnit: 'sqm',
        customEUI: null,
        buildingAge: 'standard',  // 'old' | 'standard' | 'modern'
        equipment: {
            heating_boiler: false,
            generator: false,
            cooking: false,
            furnace: false,
            fleet_car: 0,
            fleet_van: 0,
            fleet_truck: 0
        },
        equipmentEfficiency: {
            heating_boiler: 'standard',
            generator: 'standard',
            cooking: 'standard',
            furnace: 'standard',
            fleet: 'standard'
        }
    },
    facilities: [],
    data: {},
    overrides: {}
};

// ── Facility type labels ─────────────────────────────────────────────────────
const FACILITY_TYPE_LABELS = {
    office:              'Office',
    retail:              'Retail / Shop',
    warehouse:           'Warehouse',
    light_manufacturing: 'Light Manufacturing',
    heavy_manufacturing: 'Heavy Manufacturing',
    restaurant:          'Restaurant',
    hospital:            'Hospital / Clinic',
    hotel:               'Hotel',
    residential:         'Residential',
    school:              'School / University'
};

// ── Equipment labels & descriptions ─────────────────────────────────────────
const EQUIPMENT_META = {
    heating_boiler: { label: 'Heating Boiler',      description: 'Gas or oil-fired space heating boiler' },
    generator:      { label: 'Backup Generator',    description: 'Diesel backup generator for emergency power' },
    cooking:        { label: 'Cooking Equipment',   description: 'Commercial gas cooking appliances' },
    furnace:        { label: 'Industrial Furnace',  description: 'High-temperature furnace or kiln' }
};

// ── Data Loader ──────────────────────────────────────────────────────────────
async function loadData() {
    const files = [
        { file: 'countries.json',          key: 'countries' },
        { file: 'climate-zones.json',      key: 'climateZones' },
        { file: 'emission-factors.json',   key: 'emissionFactors' },
        { file: 'fuel-factors.json',       key: 'fuelFactors' },
        { file: 'eui-benchmarks.json',     key: 'euiBenchmarks' },
        { file: 'equipment-profiles.json', key: 'equipmentProfiles' },
        { file: 'cities-hdd-cdd.json',    key: 'citiesHddCdd' }
    ];

    const results = await Promise.all(
        files.map(({ file }) => fetch(`data/${file}`).then(r => r.json()))
    );

    files.forEach(({ key }, i) => {
        appState.data[key] = results[i];
    });
}

// ── Lookups builder ──────────────────────────────────────────────────────────
function getLookups() {
    const { location, currentFacility, data } = appState;
    const regionCode = location.region;
    const countryCode = location.country;

    // Climate zone: region lookup, fallback to country default
    const climateZone = (data.climateZones && regionCode && data.climateZones[regionCode])
        ? String(data.climateZones[regionCode])
        : '4';

    // Grid EF: region lookup, fallback to _XX country code
    const emissionFactors = data.emissionFactors || {};
    const gridEF = emissionFactors[regionCode]
        ?? emissionFactors[`_${countryCode}`]
        ?? emissionFactors['_XX']
        ?? 0.5;

    // Country default fuel mix
    const countryData = (data.countries || {})[countryCode] || {};
    const defaultFuelMix = {};
    if (countryData.defaultFuelMix) {
        // The calculator expects: defaultFuelMix[facilityType][equipmentKey]
        // But the data stores it flat — wrap it per facilityType
        // Actually looking at calculator.js: defaultFuelMix[facilityType][key]
        // countries.json stores a flat map of equipment key -> fuel
        // We need to make it work for all facility types
        Object.keys(FACILITY_TYPE_LABELS).forEach(ft => {
            defaultFuelMix[ft] = countryData.defaultFuelMix;
        });
    }

    // Unit system
    const unitSystem = countryData.unitSystem || 'metric';

    // Fuel factors: flatten .default values
    const rawFuelFactors = data.fuelFactors || {};
    const fuelFactors = {};
    Object.entries(rawFuelFactors).forEach(([key, val]) => {
        if (key.startsWith('_')) return;
        fuelFactors[key] = (typeof val === 'object' && val.default !== undefined)
            ? val.default
            : val;
    });

    // Equipment profiles: normalize benchmark field name
    // equipment-profiles.json uses "byClimateZone", calculator.js expects "benchmark"
    const rawProfiles = data.equipmentProfiles || {};
    const equipmentProfiles = {};
    Object.entries(rawProfiles).forEach(([key, profile]) => {
        const normalized = { ...profile };
        if (profile.byClimateZone && !profile.benchmark) {
            normalized.benchmark = profile.byClimateZone;
        }
        // Normalize facilityMultiplier vs facilityMultipliers
        if (profile.facilityMultiplier && !profile.facilityMultipliers) {
            const { _default, ...rest } = profile.facilityMultiplier;
            normalized.facilityMultipliers = rest;
            normalized.defaultMultiplier = _default || 1.0;
        }
        // Default fuel from fuelKey
        if (!normalized.defaultFuel && profile.fuelKey) {
            normalized.defaultFuel = profile.fuelKey === 'heating_boiler' ? 'natural_gas'
                : profile.fuelKey === 'generator' ? 'diesel'
                : profile.fuelKey === 'cooking' ? 'natural_gas'
                : profile.fuelKey === 'furnace' ? 'natural_gas'
                : profile.fuelKey === 'fleet_car' ? 'gasoline'
                : 'diesel';
        }
        equipmentProfiles[key] = normalized;
    });

    // eui-benchmarks.json stores { electricity, heating } objects per zone.
    // calculator.js expects plain numbers (total EUI = electricity + heating).
    // Flatten here so the calculator gets a single kWh/m²/yr number per zone.
    const rawEuiBenchmarks = data.euiBenchmarks || {};
    const euiBenchmarks = {};
    Object.entries(rawEuiBenchmarks).forEach(([facilityType, zones]) => {
        euiBenchmarks[facilityType] = {};
        Object.entries(zones).forEach(([zone, val]) => {
            if (typeof val === 'object' && val !== null) {
                euiBenchmarks[facilityType][zone] = (val.electricity || 0) + (val.heating || 0);
            } else {
                euiBenchmarks[facilityType][zone] = val;
            }
        });
    });

    // HDD/CDD: city-level lookup for precise climate calculation
    let hdd = null;
    let cdd = null;
    const citiesData = data.citiesHddCdd || {};
    const regionCities = citiesData[regionCode];
    if (regionCities) {
        const selectedCity = location.city;
        if (selectedCity && regionCities.cities) {
            const cityData = regionCities.cities.find(c => c.name === selectedCity);
            if (cityData) {
                hdd = cityData.hdd;
                cdd = cityData.cdd;
            }
        }
        // Fallback to region default
        if (hdd == null && regionCities._default) {
            hdd = regionCities._default.hdd;
            cdd = regionCities._default.cdd;
        }
    }

    return {
        climateZone,
        gridEF,
        euiBenchmarks,
        equipmentProfiles,
        fuelFactors,
        countryCode,
        defaultFuelMix,
        unitSystem,
        hdd,
        cdd
    };
}

// ── Compute current facility ─────────────────────────────────────────────────
function computeCurrentFacility() {
    const { currentFacility, overrides } = appState;
    const lookups = getLookups();

    // Building age multiplier: adjusts EUI for building quality/age
    const AGE_MULTIPLIERS = { old: 1.3, standard: 1.0, modern: 0.75 };
    const ageMultiplier = AGE_MULTIPLIERS[currentFacility.buildingAge] || 1.0;

    // Apply EUI override (if user set custom EUI, don't apply age multiplier)
    let euiOverride = overrides.eui != null ? Number(overrides.eui) : currentFacility.customEUI;

    // Apply grid EF override
    const gridEFOverride = overrides.gridEF != null ? Number(overrides.gridEF) : lookups.gridEF;

    const facility = {
        ...currentFacility,
        area: toSqm(currentFacility.area, currentFacility.areaUnit),
        customEUI: euiOverride,
        buildingAgeMultiplier: euiOverride ? 1.0 : ageMultiplier
    };

    const result = calculateFacility(facility, { ...lookups, gridEF: gridEFOverride });

    // Apply usage overrides to scope1 items
    if (result.scope1Breakdown && overrides.fuelUse) {
        result.scope1Breakdown = result.scope1Breakdown.map(item => {
            if (overrides.fuelUse[item.type] != null) {
                const overriddenUsage = Number(overrides.fuelUse[item.type]);
                const fuelEF = lookups.fuelFactors[item.fuelType] || 0;
                return {
                    ...item,
                    estimatedFuelUse: overriddenUsage,
                    emissions: overriddenUsage * fuelEF
                };
            }
            return item;
        });
        result.scope1Total = result.scope1Breakdown.reduce((sum, i) => sum + i.emissions, 0);
    }

    return result;
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
function renderProgressBar() {
    const steps = ['Location', 'Facility', 'Equipment', 'Review', 'Finish'];
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    bar.id = 'progress-bar';

    steps.forEach((label, idx) => {
        const stepNum = idx + 1;
        const item = document.createElement('div');
        item.className = 'progress-step';
        item.dataset.step = stepNum;
        item.innerHTML = `<span class="step-num">${stepNum}</span><span class="step-label">${label}</span>`;
        bar.appendChild(item);
    });

    return bar;
}

function updateProgressBar() {
    const items = document.querySelectorAll('.progress-step');
    items.forEach(item => {
        const n = Number(item.dataset.step);
        item.classList.remove('active', 'completed');
        if (n === appState.currentStep) item.classList.add('active');
        else if (n < appState.currentStep) item.classList.add('completed');
    });
}

// ── Step Navigation ──────────────────────────────────────────────────────────
function showStep(n) {
    appState.currentStep = n;
    document.querySelectorAll('.wizard-step').forEach(el => {
        el.classList.toggle('hidden', Number(el.dataset.step) !== n);
    });
    updateProgressBar();

    // Step 4 needs to re-render its content each time it's shown
    if (n === 4) renderStep4Content();
}

// ── Step 1: Location ─────────────────────────────────────────────────────────
function renderStep1() {
    const step = document.createElement('div');
    step.className = 'wizard-step hidden';
    step.dataset.step = '1';

    const countries = appState.data.countries || {};
    const sortedCountries = Object.entries(countries)
        .map(([code, info]) => ({ code, name: info.name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    step.innerHTML = `
        <div class="step-header">
            <h2>Step 1: Location</h2>
            <p>Select your country and region to get the right emission factors.</p>
        </div>
        <div class="step-body">
            <div class="form-group">
                <label for="country-select">Country</label>
                <select id="country-select">
                    <option value="">-- Select a country --</option>
                    ${sortedCountries.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" id="region-group" style="display:none;">
                <label for="region-select">Region / State</label>
                <select id="region-select">
                    <option value="">-- Select a region --</option>
                </select>
            </div>
            <div class="form-group" id="city-group" style="display:none;">
                <label for="city-select">City (for precise climate data)</label>
                <select id="city-select">
                    <option value="">-- Use regional average --</option>
                </select>
                <small>Optional — selecting a city uses local HDD/CDD data for more accurate estimates.</small>
            </div>
        </div>
        <div class="step-footer">
            <button id="step1-next" class="btn-primary" disabled>Next &rarr;</button>
        </div>
    `;

    return step;
}

function bindStep1Events() {
    const countrySelect = document.getElementById('country-select');
    const regionGroup   = document.getElementById('region-group');
    const regionSelect  = document.getElementById('region-select');
    const nextBtn       = document.getElementById('step1-next');

    countrySelect.addEventListener('change', () => {
        const code = countrySelect.value;
        appState.location.country = code || null;
        appState.location.region = null;

        // Reset region
        regionSelect.innerHTML = '<option value="">-- Select a region --</option>';
        regionGroup.style.display = 'none';
        nextBtn.disabled = true;

        if (!code) return;

        const countryData = appState.data.countries[code] || {};

        // Set default area unit based on unit system
        if (countryData.unitSystem === 'imperial') {
            appState.currentFacility.areaUnit = 'sqft';
        } else {
            appState.currentFacility.areaUnit = 'sqm';
        }

        // Populate regions
        const regions = countryData.regions || [];
        regions.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.code;
            opt.textContent = r.name;
            regionSelect.appendChild(opt);
        });

        if (regions.length > 0) {
            regionGroup.style.display = '';
        }
    });

    const cityGroup  = document.getElementById('city-group');
    const citySelect = document.getElementById('city-select');

    regionSelect.addEventListener('change', () => {
        const code = regionSelect.value;
        appState.location.region = code || null;
        appState.location.city = null;
        nextBtn.disabled = !(appState.location.country && appState.location.region);

        // Populate city dropdown if HDD/CDD data exists for this region
        citySelect.innerHTML = '<option value="">-- Use regional average --</option>';
        cityGroup.style.display = 'none';

        if (code) {
            const citiesData = appState.data.citiesHddCdd || {};
            const regionCities = citiesData[code];
            if (regionCities && regionCities.cities && regionCities.cities.length > 0) {
                regionCities.cities.forEach(city => {
                    const opt = document.createElement('option');
                    opt.value = city.name;
                    opt.textContent = `${city.name} (HDD: ${city.hdd}, CDD: ${city.cdd})`;
                    citySelect.appendChild(opt);
                });
                cityGroup.style.display = '';
            }
        }
    });

    citySelect.addEventListener('change', () => {
        appState.location.city = citySelect.value || null;
    });

    nextBtn.addEventListener('click', () => {
        if (appState.location.country && appState.location.region) {
            showStep(2);
        }
    });
}

// ── Step 2: Facility Details ─────────────────────────────────────────────────
function renderStep2() {
    const step = document.createElement('div');
    step.className = 'wizard-step hidden';
    step.dataset.step = '2';

    const typeOptions = Object.entries(FACILITY_TYPE_LABELS)
        .map(([val, label]) => `<option value="${val}">${label}</option>`)
        .join('');

    step.innerHTML = `
        <div class="step-header">
            <h2>Step 2: Facility Details</h2>
            <p>Tell us about the building you want to estimate.</p>
        </div>
        <div class="step-body">
            <div class="form-group">
                <label for="facility-name">Facility Name (optional)</label>
                <input type="text" id="facility-name" placeholder="e.g. Head Office, Warehouse A" />
            </div>
            <div class="form-group">
                <label for="facility-type">Facility Type</label>
                <select id="facility-type">
                    <option value="">-- Select type --</option>
                    ${typeOptions}
                </select>
            </div>
            <div class="form-group area-group">
                <label for="facility-area">Floor Area</label>
                <div class="area-input-row">
                    <input type="number" id="facility-area" min="1" step="1" placeholder="0" />
                    <button id="unit-toggle" class="btn-secondary" type="button">sq m</button>
                </div>
            </div>
            <div class="form-group">
                <label for="building-age">Building Age & Condition</label>
                <select id="building-age">
                    <option value="old">Pre-2000 / Poor insulation</option>
                    <option value="standard" selected>2000–2015 / Standard</option>
                    <option value="modern">Post-2015 / High-efficiency</option>
                </select>
                <small>Adjusts energy estimates: older buildings use ~30% more, modern ~25% less.</small>
            </div>
            <div class="form-group custom-eui-group">
                <button id="custom-eui-toggle" class="btn-text" type="button">+ Custom EUI (advanced)</button>
                <div id="custom-eui-section" class="hidden">
                    <label for="custom-eui-input">Custom Energy Use Intensity (kWh/m²/yr)</label>
                    <input type="number" id="custom-eui-input" min="1" step="1" placeholder="Leave blank to use benchmark" />
                    <small>Override the default EUI benchmark for this facility type and climate zone.</small>
                </div>
            </div>
        </div>
        <div class="step-footer">
            <button id="step2-back" class="btn-secondary">&larr; Back</button>
            <button id="step2-next" class="btn-primary" disabled>Next &rarr;</button>
        </div>
    `;

    return step;
}

function bindStep2Events() {
    const nameInput      = document.getElementById('facility-name');
    const typeSelect     = document.getElementById('facility-type');
    const areaInput      = document.getElementById('facility-area');
    const unitToggle     = document.getElementById('unit-toggle');
    const buildingAgeSelect = document.getElementById('building-age');
    const customEUIBtn   = document.getElementById('custom-eui-toggle');
    const customEUISection = document.getElementById('custom-eui-section');
    const customEUIInput = document.getElementById('custom-eui-input');
    const backBtn        = document.getElementById('step2-back');
    const nextBtn        = document.getElementById('step2-next');

    // Sync initial unit label
    unitToggle.textContent = appState.currentFacility.areaUnit === 'sqft' ? 'sq ft' : 'sq m';

    function checkStep2Valid() {
        nextBtn.disabled = !(typeSelect.value && areaInput.value && Number(areaInput.value) > 0);
    }

    nameInput.addEventListener('input', () => {
        appState.currentFacility.name = nameInput.value.trim();
    });

    buildingAgeSelect.addEventListener('change', () => {
        appState.currentFacility.buildingAge = buildingAgeSelect.value;
    });

    typeSelect.addEventListener('change', () => {
        appState.currentFacility.facilityType = typeSelect.value || null;
        checkStep2Valid();

        if (typeSelect.value) {
            const visualPanel = document.getElementById('visual-panel');
            renderBuilding(visualPanel, typeSelect.value, appState.currentFacility.equipment);
        }
    });

    areaInput.addEventListener('input', () => {
        appState.currentFacility.area = Number(areaInput.value) || 0;
        checkStep2Valid();
    });

    unitToggle.addEventListener('click', () => {
        const currentUnit = appState.currentFacility.areaUnit;
        const currentValue = Number(areaInput.value) || 0;
        const areaInSqm = toSqm(currentValue, currentUnit);

        if (currentUnit === 'sqm') {
            appState.currentFacility.areaUnit = 'sqft';
            unitToggle.textContent = 'sq ft';
            const converted = currentValue > 0 ? Math.round(fromSqm(areaInSqm, 'sqft')) : 0;
            areaInput.value = converted || '';
        } else {
            appState.currentFacility.areaUnit = 'sqm';
            unitToggle.textContent = 'sq m';
            const converted = currentValue > 0 ? Math.round(areaInSqm) : 0;
            areaInput.value = converted || '';
        }

        appState.currentFacility.area = Number(areaInput.value) || 0;
        checkStep2Valid();
    });

    customEUIBtn.addEventListener('click', () => {
        customEUISection.classList.toggle('hidden');
    });

    customEUIInput.addEventListener('input', () => {
        const val = Number(customEUIInput.value);
        appState.currentFacility.customEUI = val > 0 ? val : null;
    });

    backBtn.addEventListener('click', () => showStep(1));

    nextBtn.addEventListener('click', () => {
        if (typeSelect.value && areaInput.value && Number(areaInput.value) > 0) {
            showStep(3);
        }
    });
}

// ── Step 3: Equipment ────────────────────────────────────────────────────────
function renderStep3() {
    const step = document.createElement('div');
    step.className = 'wizard-step hidden';
    step.dataset.step = '3';

    const checkboxItems = Object.entries(EQUIPMENT_META).map(([key, meta]) => `
        <div class="equipment-item">
            <input type="checkbox" class="equip-checkbox" data-key="${key}" />
            <div class="eq-info">
                <strong>${meta.label}</strong>
                <span>${meta.description}</span>
            </div>
            <select class="eq-efficiency hidden" data-key="${key}">
                <option value="old">Old / Inefficient</option>
                <option value="standard" selected>Standard</option>
                <option value="high_efficiency">High-Efficiency</option>
            </select>
        </div>
    `).join('');

    step.innerHTML = `
        <div class="step-header">
            <h2>Step 3: On-Site Equipment</h2>
            <p>Select equipment that burns fuel on-site (Scope 1 sources).</p>
        </div>
        <div class="step-body">
            <div class="equipment-list">
                <h3>Area-Based Equipment</h3>
                ${checkboxItems}
            </div>
            <div class="fleet-section">
                <h3>Fleet Vehicles</h3>
                <p class="fleet-note">Enter the number of company-owned vehicles.</p>
                <div class="fleet-inputs">
                    <div class="fleet-row">
                        <label for="fleet-car">Cars</label>
                        <input type="number" id="fleet-car" min="0" step="1" value="0" data-key="fleet_car" />
                    </div>
                    <div class="fleet-row">
                        <label for="fleet-van">Vans</label>
                        <input type="number" id="fleet-van" min="0" step="1" value="0" data-key="fleet_van" />
                    </div>
                    <div class="fleet-row">
                        <label for="fleet-truck">Trucks</label>
                        <input type="number" id="fleet-truck" min="0" step="1" value="0" data-key="fleet_truck" />
                    </div>
                </div>
                <div class="fleet-efficiency">
                    <label for="fleet-efficiency">Vehicle Age & Efficiency</label>
                    <select id="fleet-efficiency">
                        <option value="old">Older fleet (pre-2015, higher consumption)</option>
                        <option value="standard" selected>Average fleet (2015–2022)</option>
                        <option value="high_efficiency">Modern fleet (post-2022, fuel-efficient / hybrid)</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="step-footer">
            <button id="step3-back" class="btn-secondary">&larr; Back</button>
            <button id="step3-next" class="btn-primary">Review Estimates &rarr;</button>
        </div>
    `;

    return step;
}

function bindStep3Events() {
    const visualPanel = document.getElementById('visual-panel');

    // Checkboxes — show/hide efficiency selector when toggled
    document.querySelectorAll('.equip-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const key = cb.dataset.key;
            appState.currentFacility.equipment[key] = cb.checked;
            // Show/hide the efficiency dropdown for this equipment
            const effSelect = cb.closest('.equipment-item').querySelector('.eq-efficiency');
            if (effSelect) {
                effSelect.classList.toggle('hidden', !cb.checked);
            }
            renderBuilding(visualPanel, appState.currentFacility.facilityType, appState.currentFacility.equipment);
        });
    });

    // Equipment efficiency selectors
    document.querySelectorAll('.eq-efficiency').forEach(sel => {
        sel.addEventListener('change', () => {
            appState.currentFacility.equipmentEfficiency[sel.dataset.key] = sel.value;
        });
    });

    // Fleet number inputs
    document.querySelectorAll('.fleet-inputs input[type="number"]').forEach(input => {
        input.addEventListener('input', () => {
            const key = input.dataset.key;
            appState.currentFacility.equipment[key] = Math.max(0, Number(input.value) || 0);
            renderBuilding(visualPanel, appState.currentFacility.facilityType, appState.currentFacility.equipment);
        });
    });

    // Fleet efficiency
    const fleetEffSel = document.getElementById('fleet-efficiency');
    if (fleetEffSel) {
        fleetEffSel.addEventListener('change', () => {
            appState.currentFacility.equipmentEfficiency.fleet = fleetEffSel.value;
        });
    }

    document.getElementById('step3-back').addEventListener('click', () => showStep(2));
    document.getElementById('step3-next').addEventListener('click', () => showStep(4));
}

// ── Step 4: Review ───────────────────────────────────────────────────────────
function renderStep4() {
    const step = document.createElement('div');
    step.className = 'wizard-step hidden';
    step.dataset.step = '4';

    step.innerHTML = `
        <div class="step-header">
            <h2>Step 4: Review Estimates</h2>
            <p>Review and fine-tune the emissions estimate for this facility.</p>
        </div>
        <div id="step4-content" class="step-body">
            <!-- Dynamically populated -->
        </div>
        <div class="step-footer">
            <button id="step4-back" class="btn-secondary">&larr; Back</button>
            <button id="step4-confirm" class="btn-primary">Looks Good &rarr;</button>
        </div>
    `;

    return step;
}

function renderStep4Content() {
    const contentEl = document.getElementById('step4-content');
    if (!contentEl) return;

    const result = computeCurrentFacility();
    const { currentFacility } = appState;
    const displayArea = currentFacility.area;
    const unit = currentFacility.areaUnit;
    const areaInSqm = toSqm(displayArea, unit);

    // Scope 1 table rows
    const hasScope1 = result.scope1Breakdown && result.scope1Breakdown.length > 0;
    let scope1HTML = '';

    if (hasScope1) {
        const rows = result.scope1Breakdown.map(item => {
            const overrideKey = item.type;
            const currentUsage = (appState.overrides.fuelUse && appState.overrides.fuelUse[overrideKey] != null)
                ? appState.overrides.fuelUse[overrideKey]
                : item.estimatedFuelUse;

            const displayName = item.count != null
                ? `Fleet: ${item.type.replace('fleet_', '').replace('_', ' ')} (×${item.count})`
                : (EQUIPMENT_META[item.type] ? EQUIPMENT_META[item.type].label : item.type);

            return `
                <tr>
                    <td>${displayName}</td>
                    <td>${item.fuelType.replace(/_/g, ' ')}</td>
                    <td><input type="number" class="scope1-override" data-equipment="${overrideKey}"
                        value="${currentUsage.toFixed(1)}" step="0.1" min="0" /></td>
                    <td>${item.emissions.toFixed(0)} kgCO2e</td>
                </tr>
            `;
        }).join('');

        scope1HTML = `
            <div class="review-section">
                <h3>Scope 1 — On-Site Fuel Combustion</h3>
                <table class="review-table">
                    <thead>
                        <tr>
                            <th>Equipment</th>
                            <th>Fuel Type</th>
                            <th>Est. Usage / yr</th>
                            <th>Emissions</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="section-total">Scope 1 Total: <strong>${result.scope1Total.toFixed(0)} kgCO2e/yr</strong></div>
            </div>
        `;
    }

    const euiOverrideVal = (appState.overrides.eui != null) ? appState.overrides.eui : result.euiUsed;
    const gridEFOverrideVal = (appState.overrides.gridEF != null) ? appState.overrides.gridEF : result.gridEFUsed;

    contentEl.innerHTML = `
        <div class="facility-summary">
            <strong>${currentFacility.name || 'Unnamed Facility'}</strong> —
            ${FACILITY_TYPE_LABELS[currentFacility.facilityType] || currentFacility.facilityType} |
            ${displayArea.toLocaleString()} ${unit === 'sqft' ? 'sq ft' : 'm²'}
            ${unit === 'sqft' ? `(${areaInSqm.toFixed(0)} m²)` : ''} |
            Building: ${{ old: 'Pre-2000', standard: '2000–2015', modern: 'Post-2015' }[currentFacility.buildingAge] || 'Standard'}
        </div>

        <div class="review-section">
            <h3>Scope 2 — Grid Electricity</h3>
            <div class="review-row">
                <span>Energy Use Intensity (EUI)</span>
                <span>
                    <input type="number" id="eui-override" class="review-override"
                        value="${euiOverrideVal.toFixed(1)}" step="0.1" min="1" />
                    <span class="unit-label">kWh/m²/yr</span>
                </span>
            </div>
            <div class="review-row">
                <span>Estimated Annual Electricity</span>
                <span><strong>${result.estimatedElectricity.toFixed(0)}</strong> kWh/yr</span>
            </div>
            <div class="review-row">
                <span>Grid Emission Factor</span>
                <span>
                    <input type="number" id="gridef-override" class="review-override"
                        value="${gridEFOverrideVal.toFixed(4)}" step="0.0001" min="0.001" />
                    <span class="unit-label">kgCO2e/kWh</span>
                </span>
            </div>
            <div class="section-total">Scope 2 Total: <strong>${result.scope2Total.toFixed(0)} kgCO2e/yr</strong></div>
        </div>

        ${scope1HTML}

        <div class="grand-total">
            Grand Total: <strong>${(result.scope1Total + result.scope2Total).toFixed(0)} kgCO2e/yr</strong>
        </div>
    `;

    // Bind override inputs
    const euiInput = document.getElementById('eui-override');
    const gridEFInput = document.getElementById('gridef-override');

    euiInput.addEventListener('change', () => {
        appState.overrides.eui = Number(euiInput.value) || null;
        renderStep4Content();
    });

    gridEFInput.addEventListener('change', () => {
        appState.overrides.gridEF = Number(gridEFInput.value) || null;
        renderStep4Content();
    });

    contentEl.querySelectorAll('.scope1-override').forEach(input => {
        input.addEventListener('change', () => {
            if (!appState.overrides.fuelUse) appState.overrides.fuelUse = {};
            appState.overrides.fuelUse[input.dataset.equipment] = Number(input.value);
            renderStep4Content();
        });
    });

    // Bind step 4 buttons (they're outside content but need re-binding if re-rendered)
    bindStep4Buttons();
}

function bindStep4Buttons() {
    const backBtn    = document.getElementById('step4-back');
    const confirmBtn = document.getElementById('step4-confirm');

    // Clone to remove any old listeners
    const newBack = backBtn.cloneNode(true);
    const newConfirm = confirmBtn.cloneNode(true);
    backBtn.replaceWith(newBack);
    confirmBtn.replaceWith(newConfirm);

    newBack.addEventListener('click', () => showStep(3));

    newConfirm.addEventListener('click', () => {
        const result = computeCurrentFacility();
        const { currentFacility, location } = appState;

        const facilityRecord = {
            ...currentFacility,
            // Flatten result fields to top level so dashboard can access them directly
            ...result,
            // Keep area in sqm for dashboard display
            area: toSqm(currentFacility.area, currentFacility.areaUnit),
            areaSqm: toSqm(currentFacility.area, currentFacility.areaUnit),
            // Keep facilityType accessible as both .facilityType and .type
            type: currentFacility.facilityType,
            location: { ...location },
            results: result,
            overrides: { ...appState.overrides }
        };

        appState.facilities.push(facilityRecord);

        // Reset overrides
        appState.overrides = {};

        showStep(5);
        updateStep5Count();
    });
}

// ── Step 5: Next Actions ──────────────────────────────────────────────────────
function renderStep5() {
    const step = document.createElement('div');
    step.className = 'wizard-step hidden';
    step.dataset.step = '5';

    step.innerHTML = `
        <div class="step-header">
            <h2>Facility Added!</h2>
            <p id="step5-count">You have added <strong>0</strong> facility so far.</p>
        </div>
        <div class="step-body step5-actions">
            <div class="action-card">
                <h3>Add Another Facility</h3>
                <p>Add another building or site to get a combined emissions picture.</p>
                <button id="add-another-btn" class="btn-secondary">+ Add Another Facility</button>
            </div>
            <div class="action-card">
                <h3>View Results</h3>
                <p>See the full emissions dashboard with charts and a breakdown.</p>
                <button id="view-results-btn" class="btn-primary">View Results &rarr;</button>
            </div>
        </div>
    `;

    return step;
}

function updateStep5Count() {
    const countEl = document.getElementById('step5-count');
    if (!countEl) return;
    const n = appState.facilities.length;
    countEl.innerHTML = `You have added <strong>${n}</strong> facilit${n === 1 ? 'y' : 'ies'} so far.`;
}

function bindStep5Events() {
    document.getElementById('add-another-btn').addEventListener('click', () => {
        // Reset current facility
        appState.currentFacility = {
            name: '',
            facilityType: null,
            area: 0,
            areaUnit: appState.currentFacility.areaUnit, // preserve unit preference
            customEUI: null,
            buildingAge: 'standard',
            equipment: {
                heating_boiler: false,
                generator: false,
                cooking: false,
                furnace: false,
                fleet_car: 0,
                fleet_van: 0,
                fleet_truck: 0
            },
            equipmentEfficiency: {
                heating_boiler: 'standard',
                generator: 'standard',
                cooking: 'standard',
                furnace: 'standard',
                fleet: 'standard'
            }
        };
        appState.overrides = {};

        // Clear form fields
        const facilityNameEl = document.getElementById('facility-name');
        const facilityTypeEl = document.getElementById('facility-type');
        const facilityAreaEl = document.getElementById('facility-area');
        const customEUIInput = document.getElementById('custom-eui-input');
        const customEUISection = document.getElementById('custom-eui-section');
        if (facilityNameEl) facilityNameEl.value = '';
        if (facilityTypeEl) facilityTypeEl.value = '';
        if (facilityAreaEl) facilityAreaEl.value = '';
        if (customEUIInput) customEUIInput.value = '';
        if (customEUISection) customEUISection.classList.add('hidden');

        // Uncheck equipment
        document.querySelectorAll('.equip-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.fleet-inputs input[type="number"]').forEach(input => input.value = '0');

        // Clear visualization
        const visualPanel = document.getElementById('visual-panel');
        clearBuilding(visualPanel);

        showStep(2);
    });

    document.getElementById('view-results-btn').addEventListener('click', () => {
        // Hide wizard and visual panels, show dashboard
        document.getElementById('wizard-panel').classList.add('hidden');
        document.getElementById('visual-panel').classList.add('hidden');
        const dashboardEl = document.getElementById('dashboard');
        dashboardEl.classList.remove('hidden');

        renderDashboard(dashboardEl, appState.facilities, appState.data);
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    try {
        await loadData();
    } catch (err) {
        console.error('Failed to load data files:', err);
        document.getElementById('wizard-panel').innerHTML =
            '<p class="error">Failed to load application data. Please refresh the page.</p>';
        return;
    }

    const wizardPanel = document.getElementById('wizard-panel');

    // Render progress bar
    const progressBar = renderProgressBar();
    wizardPanel.appendChild(progressBar);

    // Render all 5 steps into DOM
    wizardPanel.appendChild(renderStep1());
    wizardPanel.appendChild(renderStep2());
    wizardPanel.appendChild(renderStep3());
    wizardPanel.appendChild(renderStep4());
    wizardPanel.appendChild(renderStep5());

    // Bind event listeners for all steps
    bindStep1Events();
    bindStep2Events();
    bindStep3Events();
    // Step 4 buttons are bound dynamically in renderStep4Content
    bindStep5Events();

    // Show step 1
    showStep(1);
}

init();
