# Carbon Emission Estimator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully offline, single-page web app that estimates Scope 1 & 2 carbon emissions from static facility characteristics (type, area, location, equipment) using country-specific benchmarks and emission factors.

**Architecture:** Vanilla JS single-page app with a wizard UI (left panel) and isometric SVG visualization (right panel). All data bundled as static JSON. ES modules, no build step, no framework. A single `appState` object manages wizard state and facility data. Calculator module is pure functions consuming the JSON data.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES modules), inline SVG

**Spec:** `docs/superpowers/specs/2026-03-26-carbon-emission-estimator-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Entry point: loads CSS, mounts wizard sections + dashboard + SVG viewport |
| `css/styles.css` | All styling: two-panel layout, wizard steps, dashboard, responsive breakpoints |
| `js/app.js` | App controller: state management, wizard step transitions, data loading, event wiring |
| `js/calculator.js` | Pure calculation functions: Scope 1, Scope 2, fleet, aggregation, benchmarks |
| `js/visualizer.js` | Isometric SVG renderer: building selection, equipment overlay, scaling, animation |
| `js/dashboard.js` | Results rendering: donut chart, facility table, benchmark bar, assumptions panel, export |
| `data/countries.json` | Country metadata: name, code, unit system, default fuel mix, regions |
| `data/climate-zones.json` | Country/region → ASHRAE climate zone (1-8) mapping |
| `data/emission-factors.json` | Grid EFs (kgCO2e/kWh) by country and region |
| `data/fuel-factors.json` | Fuel EFs (kgCO2e/unit) by fuel type, with country overrides |
| `data/eui-benchmarks.json` | EUI (kWh/m2/yr) by facility type x climate zone |
| `data/equipment-profiles.json` | Fuel consumption benchmarks by equipment x climate zone x facility |
| `tests/test.html` | Browser-based test runner for calculator.js |
| `tests/test-calculator.js` | Unit tests for all calculator functions |

---

### Task 1: Project Scaffolding & Test Harness

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `js/app.js`
- Create: `js/calculator.js`
- Create: `js/visualizer.js`
- Create: `js/dashboard.js`
- Create: `tests/test.html`
- Create: `tests/test-calculator.js`

- [ ] **Step 1: Create directory structure**

```bash
cd /Users/abhirup/Desktop/Zero/Delivery/EFs/Estimator
mkdir -p css js data svg/buildings svg/equipment tests
```

- [ ] **Step 2: Create minimal index.html**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carbon Emission Estimator</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div id="app">
        <div id="wizard-panel"></div>
        <div id="visual-panel"></div>
        <div id="dashboard" class="hidden"></div>
    </div>
    <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create stub JS modules**

Create `js/calculator.js`:

```javascript
// Pure calculation functions for Scope 1 & Scope 2 emissions
// All functions take data objects and return results — no side effects

export function calculateScope2(facilityArea, eui, gridEF) {
    const estimatedElectricity = facilityArea * eui;
    const emissions = estimatedElectricity * gridEF;
    return { estimatedElectricity, emissions };
}
```

Create `js/app.js`:

```javascript
import { calculateScope2 } from './calculator.js';

const appState = {
    currentStep: 1,
    location: { country: null, region: null },
    facilities: [],
    data: {}
};

async function init() {
    console.log('Carbon Emission Estimator initialized');
}

init();
```

Create `js/visualizer.js`:

```javascript
// Isometric SVG building renderer
export function renderBuilding(container, facilityType, equipment) {
    // stub
}
```

Create `js/dashboard.js`:

```javascript
// Results dashboard renderer
export function renderDashboard(container, facilities, data) {
    // stub
}
```

- [ ] **Step 4: Create minimal CSS**

Create `css/styles.css`:

```css
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a2e;
    background: #f8f9fa;
    min-height: 100vh;
}

#app {
    display: grid;
    grid-template-columns: 40% 60%;
    min-height: 100vh;
}

#wizard-panel {
    padding: 2rem;
    background: #ffffff;
    overflow-y: auto;
}

#visual-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f2f5;
    position: sticky;
    top: 0;
    height: 100vh;
}

#dashboard {
    grid-column: 1 / -1;
}

.hidden {
    display: none !important;
}

@media (max-width: 768px) {
    #app {
        grid-template-columns: 1fr;
    }
    #visual-panel {
        position: relative;
        height: 300px;
    }
}
```

- [ ] **Step 5: Create test harness**

Create `tests/test.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Calculator Tests</title>
    <style>
        body { font-family: monospace; padding: 2rem; }
        .pass { color: green; }
        .fail { color: red; font-weight: bold; }
        .summary { margin-top: 1rem; font-size: 1.2em; border-top: 2px solid #333; padding-top: 1rem; }
    </style>
</head>
<body>
    <h1>Carbon Emission Estimator — Tests</h1>
    <div id="results"></div>
    <script type="module" src="test-calculator.js"></script>
</body>
</html>
```

Create `tests/test-calculator.js`:

```javascript
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
```

- [ ] **Step 6: Verify test harness works**

Open `tests/test.html` in a browser (or use a local server):

```bash
cd /Users/abhirup/Desktop/Zero/Delivery/EFs/Estimator
python3 -m http.server 8080 &
# Open http://localhost:8080/tests/test.html
# Expected: "2 passed, 0 failed"
```

- [ ] **Step 7: Commit**

```bash
git init
git add index.html css/styles.css js/app.js js/calculator.js js/visualizer.js js/dashboard.js tests/test.html tests/test-calculator.js
git commit -m "feat: project scaffolding with test harness and stub modules"
```

---

### Task 2: Country & Climate Data Files

**Files:**
- Create: `data/countries.json`
- Create: `data/climate-zones.json`

- [ ] **Step 1: Create countries.json**

Create `data/countries.json` with all 19 G20 nations. Each country has: code (ISO 3166-1 alpha-2), name, unitSystem (metric/imperial), defaultFuelMix (which fuels are common for each equipment type), and regions array.

```json
{
  "AR": {
    "name": "Argentina",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "AR-B", "name": "Buenos Aires" },
      { "code": "AR-C", "name": "Ciudad de Buenos Aires" },
      { "code": "AR-X", "name": "Cordoba" },
      { "code": "AR-S", "name": "Santa Fe" },
      { "code": "AR-OTHER", "name": "Other regions" }
    ]
  },
  "AU": {
    "name": "Australia",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "AU-NSW", "name": "New South Wales" },
      { "code": "AU-VIC", "name": "Victoria" },
      { "code": "AU-QLD", "name": "Queensland" },
      { "code": "AU-SA", "name": "South Australia" },
      { "code": "AU-WA", "name": "Western Australia" },
      { "code": "AU-TAS", "name": "Tasmania" },
      { "code": "AU-NT", "name": "Northern Territory" },
      { "code": "AU-ACT", "name": "Australian Capital Territory" }
    ]
  },
  "BR": {
    "name": "Brazil",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "lpg",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "BR-SP", "name": "Sao Paulo" },
      { "code": "BR-RJ", "name": "Rio de Janeiro" },
      { "code": "BR-MG", "name": "Minas Gerais" },
      { "code": "BR-RS", "name": "Rio Grande do Sul" },
      { "code": "BR-OTHER", "name": "Other regions" }
    ]
  },
  "CA": {
    "name": "Canada",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "CA-ON", "name": "Ontario" },
      { "code": "CA-QC", "name": "Quebec" },
      { "code": "CA-BC", "name": "British Columbia" },
      { "code": "CA-AB", "name": "Alberta" },
      { "code": "CA-SK", "name": "Saskatchewan" },
      { "code": "CA-MB", "name": "Manitoba" },
      { "code": "CA-NS", "name": "Nova Scotia" },
      { "code": "CA-OTHER", "name": "Other provinces" }
    ]
  },
  "CN": {
    "name": "China",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "CN-BJ", "name": "Beijing" },
      { "code": "CN-SH", "name": "Shanghai" },
      { "code": "CN-GD", "name": "Guangdong" },
      { "code": "CN-ZJ", "name": "Zhejiang" },
      { "code": "CN-JS", "name": "Jiangsu" },
      { "code": "CN-SD", "name": "Shandong" },
      { "code": "CN-OTHER", "name": "Other provinces" }
    ]
  },
  "FR": {
    "name": "France",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "diesel",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "FR-IDF", "name": "Ile-de-France" },
      { "code": "FR-OTHER", "name": "Other regions" }
    ]
  },
  "DE": {
    "name": "Germany",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "diesel",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "DE-BY", "name": "Bavaria" },
      { "code": "DE-NW", "name": "North Rhine-Westphalia" },
      { "code": "DE-BE", "name": "Berlin" },
      { "code": "DE-OTHER", "name": "Other states" }
    ]
  },
  "IN": {
    "name": "India",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "lpg",
      "furnace": "fuel_oil",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "IN-MH", "name": "Maharashtra" },
      { "code": "IN-DL", "name": "Delhi" },
      { "code": "IN-KA", "name": "Karnataka" },
      { "code": "IN-TN", "name": "Tamil Nadu" },
      { "code": "IN-GJ", "name": "Gujarat" },
      { "code": "IN-UP", "name": "Uttar Pradesh" },
      { "code": "IN-WB", "name": "West Bengal" },
      { "code": "IN-RJ", "name": "Rajasthan" },
      { "code": "IN-AP", "name": "Andhra Pradesh" },
      { "code": "IN-TG", "name": "Telangana" },
      { "code": "IN-KL", "name": "Kerala" },
      { "code": "IN-PB", "name": "Punjab" },
      { "code": "IN-HR", "name": "Haryana" },
      { "code": "IN-MP", "name": "Madhya Pradesh" },
      { "code": "IN-OTHER", "name": "Other states" }
    ]
  },
  "ID": {
    "name": "Indonesia",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "fuel_oil",
      "cooking": "lpg",
      "furnace": "fuel_oil",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "ID-JK", "name": "Jakarta" },
      { "code": "ID-JB", "name": "West Java" },
      { "code": "ID-JT", "name": "Central Java" },
      { "code": "ID-JI", "name": "East Java" },
      { "code": "ID-OTHER", "name": "Other provinces" }
    ]
  },
  "IT": {
    "name": "Italy",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "diesel",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "IT-MI", "name": "Lombardy" },
      { "code": "IT-RM", "name": "Lazio" },
      { "code": "IT-OTHER", "name": "Other regions" }
    ]
  },
  "JP": {
    "name": "Japan",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "JP-TK", "name": "Tokyo / Kanto" },
      { "code": "JP-OS", "name": "Osaka / Kansai" },
      { "code": "JP-HK", "name": "Hokkaido" },
      { "code": "JP-OTHER", "name": "Other regions" }
    ]
  },
  "MX": {
    "name": "Mexico",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "lpg",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "MX-CMX", "name": "Mexico City" },
      { "code": "MX-JAL", "name": "Jalisco" },
      { "code": "MX-NLE", "name": "Nuevo Leon" },
      { "code": "MX-OTHER", "name": "Other states" }
    ]
  },
  "RU": {
    "name": "Russia",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "RU-MOW", "name": "Moscow" },
      { "code": "RU-SPE", "name": "Saint Petersburg" },
      { "code": "RU-OTHER", "name": "Other regions" }
    ]
  },
  "SA": {
    "name": "Saudi Arabia",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "lpg",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "SA-RUH", "name": "Riyadh" },
      { "code": "SA-JED", "name": "Jeddah / Western" },
      { "code": "SA-DMM", "name": "Dammam / Eastern" },
      { "code": "SA-OTHER", "name": "Other regions" }
    ]
  },
  "ZA": {
    "name": "South Africa",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "lpg",
      "furnace": "fuel_oil",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "ZA-GT", "name": "Gauteng" },
      { "code": "ZA-WC", "name": "Western Cape" },
      { "code": "ZA-KZN", "name": "KwaZulu-Natal" },
      { "code": "ZA-OTHER", "name": "Other provinces" }
    ]
  },
  "KR": {
    "name": "South Korea",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "KR-SEL", "name": "Seoul Capital Area" },
      { "code": "KR-OTHER", "name": "Other regions" }
    ]
  },
  "TR": {
    "name": "Turkey",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "diesel",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "TR-IST", "name": "Istanbul" },
      { "code": "TR-ANK", "name": "Ankara" },
      { "code": "TR-IZM", "name": "Izmir" },
      { "code": "TR-OTHER", "name": "Other regions" }
    ]
  },
  "GB": {
    "name": "United Kingdom",
    "unitSystem": "metric",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "diesel",
      "fleet_van": "diesel",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "GB-ENG", "name": "England" },
      { "code": "GB-SCT", "name": "Scotland" },
      { "code": "GB-WLS", "name": "Wales" },
      { "code": "GB-NIR", "name": "Northern Ireland" }
    ]
  },
  "US": {
    "name": "United States",
    "unitSystem": "imperial",
    "defaultFuelMix": {
      "heating_boiler": "natural_gas",
      "cooking": "natural_gas",
      "furnace": "natural_gas",
      "generator": "diesel",
      "fleet_car": "gasoline",
      "fleet_van": "gasoline",
      "fleet_truck": "diesel"
    },
    "regions": [
      { "code": "US-CAMX", "name": "California" },
      { "code": "US-ERCT", "name": "Texas (ERCOT)" },
      { "code": "US-FRCC", "name": "Florida" },
      { "code": "US-MROE", "name": "Midwest (MROE)" },
      { "code": "US-NEWE", "name": "New England" },
      { "code": "US-NWPP", "name": "Northwest" },
      { "code": "US-NYLI", "name": "New York" },
      { "code": "US-RFCE", "name": "Mid-Atlantic" },
      { "code": "US-RMPA", "name": "Rocky Mountain" },
      { "code": "US-SRMV", "name": "South / Mississippi Valley" },
      { "code": "US-SRTV", "name": "South / Tennessee Valley" },
      { "code": "US-OTHER", "name": "Other regions" }
    ]
  }
}
```

- [ ] **Step 2: Create climate-zones.json**

Create `data/climate-zones.json`. Maps each country region to ASHRAE climate zone (1=very hot, 8=subarctic). These determine heating/cooling multipliers.

```json
{
  "AR-B": 3, "AR-C": 3, "AR-X": 3, "AR-S": 3, "AR-OTHER": 3,
  "AU-NSW": 3, "AU-VIC": 4, "AU-QLD": 2, "AU-SA": 3, "AU-WA": 3, "AU-TAS": 5, "AU-NT": 1, "AU-ACT": 4,
  "BR-SP": 2, "BR-RJ": 1, "BR-MG": 2, "BR-RS": 3, "BR-OTHER": 2,
  "CA-ON": 6, "CA-QC": 7, "CA-BC": 5, "CA-AB": 7, "CA-SK": 7, "CA-MB": 7, "CA-NS": 6, "CA-OTHER": 6,
  "CN-BJ": 4, "CN-SH": 3, "CN-GD": 2, "CN-ZJ": 3, "CN-JS": 3, "CN-SD": 4, "CN-OTHER": 4,
  "FR-IDF": 4, "FR-OTHER": 4,
  "DE-BY": 5, "DE-NW": 5, "DE-BE": 5, "DE-OTHER": 5,
  "IN-MH": 1, "IN-DL": 2, "IN-KA": 1, "IN-TN": 1, "IN-GJ": 1, "IN-UP": 2, "IN-WB": 2, "IN-RJ": 1, "IN-AP": 1, "IN-TG": 1, "IN-KL": 1, "IN-PB": 2, "IN-HR": 2, "IN-MP": 2, "IN-OTHER": 1,
  "ID-JK": 1, "ID-JB": 1, "ID-JT": 1, "ID-JI": 1, "ID-OTHER": 1,
  "IT-MI": 4, "IT-RM": 3, "IT-OTHER": 3,
  "JP-TK": 4, "JP-OS": 4, "JP-HK": 6, "JP-OTHER": 4,
  "MX-CMX": 2, "MX-JAL": 2, "MX-NLE": 2, "MX-OTHER": 2,
  "RU-MOW": 6, "RU-SPE": 6, "RU-OTHER": 7,
  "SA-RUH": 1, "SA-JED": 1, "SA-DMM": 1, "SA-OTHER": 1,
  "ZA-GT": 3, "ZA-WC": 3, "ZA-KZN": 2, "ZA-OTHER": 3,
  "KR-SEL": 4, "KR-OTHER": 4,
  "TR-IST": 3, "TR-ANK": 4, "TR-IZM": 3, "TR-OTHER": 4,
  "GB-ENG": 5, "GB-SCT": 5, "GB-WLS": 5, "GB-NIR": 5,
  "US-CAMX": 3, "US-ERCT": 2, "US-FRCC": 2, "US-MROE": 6, "US-NEWE": 5, "US-NWPP": 5, "US-NYLI": 5, "US-RFCE": 4, "US-RMPA": 5, "US-SRMV": 3, "US-SRTV": 4, "US-OTHER": 4
}
```

- [ ] **Step 3: Commit**

```bash
git add data/countries.json data/climate-zones.json
git commit -m "feat: add country metadata and climate zone data for G20 nations"
```

---

### Task 3: Emission Factor & Fuel Data Files

**Files:**
- Create: `data/emission-factors.json`
- Create: `data/fuel-factors.json`

- [ ] **Step 1: Create emission-factors.json**

Create `data/emission-factors.json`. Grid emission factors in kgCO2e/kWh by region. Sources: IEA 2023, CEA (India), EPA eGRID (US), country energy agencies. Where regional data exists, each region has its own value. Country-level fallback is under the `"_default"` key.

```json
{
  "AR-B": 0.310, "AR-C": 0.310, "AR-X": 0.310, "AR-S": 0.310, "AR-OTHER": 0.310,
  "_AR": 0.310,

  "AU-NSW": 0.790, "AU-VIC": 0.980, "AU-QLD": 0.810, "AU-SA": 0.350, "AU-WA": 0.690, "AU-TAS": 0.150, "AU-NT": 0.640, "AU-ACT": 0.790,
  "_AU": 0.730,

  "BR-SP": 0.075, "BR-RJ": 0.075, "BR-MG": 0.075, "BR-RS": 0.075, "BR-OTHER": 0.075,
  "_BR": 0.075,

  "CA-ON": 0.030, "CA-QC": 0.002, "CA-BC": 0.011, "CA-AB": 0.540, "CA-SK": 0.650, "CA-MB": 0.003, "CA-NS": 0.690, "CA-OTHER": 0.340,
  "_CA": 0.120,

  "CN-BJ": 0.581, "CN-SH": 0.555, "CN-GD": 0.500, "CN-ZJ": 0.525, "CN-JS": 0.571, "CN-SD": 0.614, "CN-OTHER": 0.581,
  "_CN": 0.581,

  "FR-IDF": 0.052, "FR-OTHER": 0.052,
  "_FR": 0.052,

  "DE-BY": 0.380, "DE-NW": 0.380, "DE-BE": 0.380, "DE-OTHER": 0.380,
  "_DE": 0.380,

  "IN-MH": 0.820, "IN-DL": 0.900, "IN-KA": 0.730, "IN-TN": 0.780, "IN-GJ": 0.850, "IN-UP": 0.920, "IN-WB": 0.900, "IN-RJ": 0.870, "IN-AP": 0.800, "IN-TG": 0.800, "IN-KL": 0.550, "IN-PB": 0.860, "IN-HR": 0.880, "IN-MP": 0.890, "IN-OTHER": 0.820,
  "_IN": 0.820,

  "ID-JK": 0.760, "ID-JB": 0.760, "ID-JT": 0.760, "ID-JI": 0.760, "ID-OTHER": 0.760,
  "_ID": 0.760,

  "IT-MI": 0.260, "IT-RM": 0.260, "IT-OTHER": 0.260,
  "_IT": 0.260,

  "JP-TK": 0.470, "JP-OS": 0.470, "JP-HK": 0.470, "JP-OTHER": 0.470,
  "_JP": 0.470,

  "MX-CMX": 0.420, "MX-JAL": 0.420, "MX-NLE": 0.420, "MX-OTHER": 0.420,
  "_MX": 0.420,

  "RU-MOW": 0.330, "RU-SPE": 0.330, "RU-OTHER": 0.330,
  "_RU": 0.330,

  "SA-RUH": 0.590, "SA-JED": 0.590, "SA-DMM": 0.590, "SA-OTHER": 0.590,
  "_SA": 0.590,

  "ZA-GT": 0.950, "ZA-WC": 0.950, "ZA-KZN": 0.950, "ZA-OTHER": 0.950,
  "_ZA": 0.950,

  "KR-SEL": 0.460, "KR-OTHER": 0.460,
  "_KR": 0.460,

  "TR-IST": 0.440, "TR-ANK": 0.440, "TR-IZM": 0.440, "TR-OTHER": 0.440,
  "_TR": 0.440,

  "GB-ENG": 0.207, "GB-SCT": 0.207, "GB-WLS": 0.207, "GB-NIR": 0.207,
  "_GB": 0.207,

  "US-CAMX": 0.225, "US-ERCT": 0.380, "US-FRCC": 0.390, "US-MROE": 0.540, "US-NEWE": 0.230, "US-NWPP": 0.280, "US-NYLI": 0.230, "US-RFCE": 0.340, "US-RMPA": 0.550, "US-SRMV": 0.430, "US-SRTV": 0.400, "US-OTHER": 0.380,
  "_US": 0.380
}
```

- [ ] **Step 2: Create fuel-factors.json**

Create `data/fuel-factors.json`. Fuel emission factors with IPCC 2006 defaults and country-specific overrides where applicable. Units: kgCO2e per unit (m3 for gas, litre for liquids, kg for LPG).

```json
{
  "natural_gas": {
    "unit": "m3",
    "unitLabel": "cubic metres",
    "default": 2.02,
    "_comment": "kgCO2e per m3, IPCC 2006"
  },
  "diesel": {
    "unit": "litre",
    "unitLabel": "litres",
    "default": 2.68,
    "_comment": "kgCO2e per litre, IPCC 2006"
  },
  "gasoline": {
    "unit": "litre",
    "unitLabel": "litres",
    "default": 2.31,
    "_comment": "kgCO2e per litre, IPCC 2006"
  },
  "lpg": {
    "unit": "kg",
    "unitLabel": "kilograms",
    "default": 2.98,
    "_comment": "kgCO2e per kg, IPCC 2006"
  },
  "fuel_oil": {
    "unit": "litre",
    "unitLabel": "litres",
    "default": 3.15,
    "_comment": "kgCO2e per litre, IPCC 2006 (heavy fuel oil)"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add data/emission-factors.json data/fuel-factors.json
git commit -m "feat: add grid emission factors and fuel emission factors for G20"
```

---

### Task 4: EUI Benchmarks & Equipment Profiles

**Files:**
- Create: `data/eui-benchmarks.json`
- Create: `data/equipment-profiles.json`

- [ ] **Step 1: Create eui-benchmarks.json**

Create `data/eui-benchmarks.json`. Energy Use Intensity in kWh/m2/year by facility type and ASHRAE climate zone. `electricity` is total electrical EUI (includes cooling). `heating` is thermal energy for space heating (separate from electricity). Sources: CBECS, CIBSE TM46, BEE India, ASHRAE 90.1 baselines.

```json
{
  "office": {
    "1": { "electricity": 180, "heating": 5 },
    "2": { "electricity": 160, "heating": 15 },
    "3": { "electricity": 140, "heating": 40 },
    "4": { "electricity": 130, "heating": 70 },
    "5": { "electricity": 120, "heating": 100 },
    "6": { "electricity": 115, "heating": 140 },
    "7": { "electricity": 110, "heating": 180 },
    "8": { "electricity": 105, "heating": 210 }
  },
  "retail": {
    "1": { "electricity": 200, "heating": 5 },
    "2": { "electricity": 180, "heating": 15 },
    "3": { "electricity": 160, "heating": 35 },
    "4": { "electricity": 150, "heating": 60 },
    "5": { "electricity": 140, "heating": 90 },
    "6": { "electricity": 135, "heating": 120 },
    "7": { "electricity": 130, "heating": 150 },
    "8": { "electricity": 125, "heating": 180 }
  },
  "warehouse": {
    "1": { "electricity": 60, "heating": 2 },
    "2": { "electricity": 55, "heating": 8 },
    "3": { "electricity": 50, "heating": 20 },
    "4": { "electricity": 45, "heating": 40 },
    "5": { "electricity": 40, "heating": 60 },
    "6": { "electricity": 38, "heating": 80 },
    "7": { "electricity": 35, "heating": 100 },
    "8": { "electricity": 33, "heating": 120 }
  },
  "light_manufacturing": {
    "1": { "electricity": 250, "heating": 10 },
    "2": { "electricity": 230, "heating": 25 },
    "3": { "electricity": 210, "heating": 50 },
    "4": { "electricity": 200, "heating": 80 },
    "5": { "electricity": 190, "heating": 110 },
    "6": { "electricity": 185, "heating": 140 },
    "7": { "electricity": 180, "heating": 170 },
    "8": { "electricity": 175, "heating": 200 }
  },
  "heavy_manufacturing": {
    "1": { "electricity": 400, "heating": 20 },
    "2": { "electricity": 380, "heating": 40 },
    "3": { "electricity": 360, "heating": 70 },
    "4": { "electricity": 350, "heating": 100 },
    "5": { "electricity": 340, "heating": 130 },
    "6": { "electricity": 335, "heating": 160 },
    "7": { "electricity": 330, "heating": 190 },
    "8": { "electricity": 325, "heating": 220 }
  },
  "restaurant": {
    "1": { "electricity": 300, "heating": 10 },
    "2": { "electricity": 280, "heating": 25 },
    "3": { "electricity": 260, "heating": 50 },
    "4": { "electricity": 250, "heating": 80 },
    "5": { "electricity": 240, "heating": 110 },
    "6": { "electricity": 235, "heating": 140 },
    "7": { "electricity": 230, "heating": 170 },
    "8": { "electricity": 225, "heating": 200 }
  },
  "hospital": {
    "1": { "electricity": 320, "heating": 15 },
    "2": { "electricity": 300, "heating": 35 },
    "3": { "electricity": 280, "heating": 65 },
    "4": { "electricity": 270, "heating": 100 },
    "5": { "electricity": 260, "heating": 135 },
    "6": { "electricity": 255, "heating": 170 },
    "7": { "electricity": 250, "heating": 200 },
    "8": { "electricity": 245, "heating": 230 }
  },
  "hotel": {
    "1": { "electricity": 220, "heating": 10 },
    "2": { "electricity": 200, "heating": 25 },
    "3": { "electricity": 180, "heating": 50 },
    "4": { "electricity": 170, "heating": 80 },
    "5": { "electricity": 160, "heating": 110 },
    "6": { "electricity": 155, "heating": 140 },
    "7": { "electricity": 150, "heating": 170 },
    "8": { "electricity": 145, "heating": 200 }
  },
  "residential": {
    "1": { "electricity": 80, "heating": 3 },
    "2": { "electricity": 70, "heating": 15 },
    "3": { "electricity": 60, "heating": 35 },
    "4": { "electricity": 55, "heating": 60 },
    "5": { "electricity": 50, "heating": 85 },
    "6": { "electricity": 48, "heating": 110 },
    "7": { "electricity": 45, "heating": 135 },
    "8": { "electricity": 43, "heating": 160 }
  },
  "school": {
    "1": { "electricity": 150, "heating": 5 },
    "2": { "electricity": 135, "heating": 15 },
    "3": { "electricity": 120, "heating": 35 },
    "4": { "electricity": 110, "heating": 60 },
    "5": { "electricity": 100, "heating": 85 },
    "6": { "electricity": 95, "heating": 110 },
    "7": { "electricity": 90, "heating": 135 },
    "8": { "electricity": 85, "heating": 160 }
  }
}
```

- [ ] **Step 2: Create equipment-profiles.json**

Create `data/equipment-profiles.json`. Fuel consumption benchmarks per equipment type. For area-based equipment: fuel units per m2 per year, indexed by climate zone. For vehicles: per-vehicle annual consumption. `fuelKey` references the equipment type in country `defaultFuelMix` to determine which fuel is used.

```json
{
  "heating_boiler": {
    "fuelKey": "heating_boiler",
    "basis": "area",
    "description": "Heating boiler (space heating)",
    "byClimateZone": {
      "1": 0.5,
      "2": 2.0,
      "3": 5.0,
      "4": 9.0,
      "5": 13.0,
      "6": 18.0,
      "7": 24.0,
      "8": 30.0
    },
    "_comment": "m3 natural gas (or equivalent litres fuel oil) per m2 per year. Zone 1 = minimal heating, Zone 8 = heavy heating."
  },
  "generator": {
    "fuelKey": "generator",
    "basis": "area",
    "description": "Backup diesel generator",
    "byClimateZone": {
      "1": 1.2,
      "2": 1.0,
      "3": 0.8,
      "4": 0.6,
      "5": 0.5,
      "6": 0.5,
      "7": 0.5,
      "8": 0.5
    },
    "_comment": "Litres diesel per m2 per year. Higher in hot zones (more outages/AC backup). Assumes ~200 hours/year run time for typical backup."
  },
  "cooking": {
    "fuelKey": "cooking",
    "basis": "area",
    "description": "Commercial cooking equipment",
    "facilityMultiplier": {
      "restaurant": 3.0,
      "hotel": 1.5,
      "hospital": 1.2,
      "residential": 0.8,
      "_default": 0.3
    },
    "byClimateZone": {
      "1": 2.0,
      "2": 2.0,
      "3": 2.0,
      "4": 2.0,
      "5": 2.0,
      "6": 2.0,
      "7": 2.0,
      "8": 2.0
    },
    "_comment": "kg LPG (or m3 natural gas) per m2 per year. Uniform across climate (cooking not weather-dependent). facilityMultiplier adjusts for intensity."
  },
  "furnace": {
    "fuelKey": "furnace",
    "basis": "area",
    "description": "Industrial furnace or kiln",
    "facilityMultiplier": {
      "heavy_manufacturing": 2.5,
      "light_manufacturing": 1.5,
      "_default": 0.5
    },
    "byClimateZone": {
      "1": 15.0,
      "2": 15.0,
      "3": 15.0,
      "4": 15.0,
      "5": 15.0,
      "6": 15.0,
      "7": 15.0,
      "8": 15.0
    },
    "_comment": "m3 natural gas (or litres fuel oil) per m2 per year. Climate-independent (process heat). facilityMultiplier adjusts for industry."
  },
  "fleet_car": {
    "fuelKey": "fleet_car",
    "basis": "count",
    "description": "Company car",
    "annualKm": {
      "AR": 15000, "AU": 15000, "BR": 15000, "CA": 18000, "CN": 15000,
      "FR": 15000, "DE": 15000, "IN": 15000, "ID": 12000, "IT": 15000,
      "JP": 10000, "MX": 15000, "RU": 15000, "SA": 20000, "ZA": 15000,
      "KR": 15000, "TR": 15000, "GB": 13000, "US": 20000,
      "_default": 15000
    },
    "fuelConsumptionPerKm": 0.08,
    "_comment": "Litres per km (gasoline/diesel). Average passenger car."
  },
  "fleet_van": {
    "fuelKey": "fleet_van",
    "basis": "count",
    "description": "Company van",
    "annualKm": {
      "AR": 20000, "AU": 20000, "BR": 20000, "CA": 22000, "CN": 20000,
      "FR": 20000, "DE": 20000, "IN": 25000, "ID": 20000, "IT": 20000,
      "JP": 15000, "MX": 20000, "RU": 20000, "SA": 25000, "ZA": 20000,
      "KR": 20000, "TR": 20000, "GB": 18000, "US": 24000,
      "_default": 20000
    },
    "fuelConsumptionPerKm": 0.12,
    "_comment": "Litres per km (diesel). Light commercial vehicle."
  },
  "fleet_truck": {
    "fuelKey": "fleet_truck",
    "basis": "count",
    "description": "Company truck",
    "annualKm": {
      "AR": 40000, "AU": 40000, "BR": 40000, "CA": 45000, "CN": 40000,
      "FR": 35000, "DE": 35000, "IN": 50000, "ID": 35000, "IT": 35000,
      "JP": 30000, "MX": 40000, "RU": 40000, "SA": 45000, "ZA": 40000,
      "KR": 35000, "TR": 40000, "GB": 35000, "US": 50000,
      "_default": 40000
    },
    "fuelConsumptionPerKm": 0.25,
    "_comment": "Litres per km (diesel). Medium/heavy truck."
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add data/eui-benchmarks.json data/equipment-profiles.json
git commit -m "feat: add EUI benchmarks and equipment fuel consumption profiles"
```

---

### Task 5: Calculator Module — Full Implementation

**Files:**
- Modify: `js/calculator.js`
- Modify: `tests/test-calculator.js`

- [ ] **Step 1: Write failing tests for all calculator functions**

Replace `tests/test-calculator.js` entirely:

```javascript
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

// 500 m2 office in India (climate zone 1), EUI=180, grid EF=0.82
const s2 = calculateScope2(500, 180, 0.82);
assert('S2: estimated kWh', s2.estimatedElectricity, 90000);
assert('S2: emissions kgCO2e', s2.emissions, 73800);

// Custom EUI override
const s2custom = calculateScope2(500, 100, 0.82);
assert('S2 custom EUI: kWh', s2custom.estimatedElectricity, 50000);
assert('S2 custom EUI: emissions', s2custom.emissions, 41000);

// Zero area
const s2zero = calculateScope2(0, 180, 0.82);
assert('S2 zero area: emissions', s2zero.emissions, 0);

// ── Equipment Emissions Tests ──
section('Scope 1 — Equipment');

// Heating boiler: 500 m2, climate zone 6, benchmark=18 m3/m2/yr, natural gas EF=2.02
const boiler = calculateEquipmentEmissions(500, 18, 2.02, 1.0);
assert('Boiler: fuel use', boiler.estimatedFuelUse, 9000);
assert('Boiler: emissions', boiler.emissions, 18180);

// Cooking in restaurant: 200 m2, benchmark=2 kg/m2/yr, LPG EF=2.98, facilityMultiplier=3.0
const cooking = calculateEquipmentEmissions(200, 2, 2.98, 3.0);
assert('Cooking restaurant: fuel use', cooking.estimatedFuelUse, 1200);
assert('Cooking restaurant: emissions', cooking.emissions, 3576);

// Generator in hot zone: 1000 m2, benchmark=1.2 L/m2/yr, diesel EF=2.68
const gen = calculateEquipmentEmissions(1000, 1.2, 2.68, 1.0);
assert('Generator: fuel use', gen.estimatedFuelUse, 1200);
assert('Generator: emissions', gen.emissions, 3216);

// ── Fleet Tests ──
section('Scope 1 — Fleet Vehicles');

// 5 cars, 15000 km/yr, 0.08 L/km, gasoline EF=2.31
const fleet = calculateFleetEmissions(5, 15000, 0.08, 2.31);
assert('Fleet 5 cars: fuel litres', fleet.estimatedFuelUse, 6000);
assert('Fleet 5 cars: emissions', fleet.emissions, 13860);

// 2 trucks, 50000 km/yr, 0.25 L/km, diesel EF=2.68
const trucks = calculateFleetEmissions(2, 50000, 0.25, 2.68);
assert('Fleet 2 trucks: fuel litres', trucks.estimatedFuelUse, 25000);
assert('Fleet 2 trucks: emissions', trucks.emissions, 67000);

// Zero vehicles
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

// 500 m2 office, 30 tCO2e, country avg EUI intensity → benchmark
const bench = getBenchmarkComparison(30000, 500, 'office', '4');
assert('Benchmark: emissions per m2', bench.emissionsPerM2, 60);
// bench.avgEmissionsPerM2 and bench.goodPracticePerM2 are looked up from embedded data
// Just verify they exist and are positive
assert('Benchmark: avg > 0', bench.avgEmissionsPerM2 > 0 ? 1 : 0, 1, 0);
assert('Benchmark: good practice > 0', bench.goodPracticePerM2 > 0 ? 1 : 0, 1, 0);

// ── Summary ──
results.innerHTML += `<div class="summary">${passed} passed, ${failed} failed</div>`;
if (failed > 0) {
    document.title = `FAIL (${failed})`;
} else {
    document.title = `ALL PASS (${passed})`;
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/abhirup/Desktop/Zero/Delivery/EFs/Estimator
python3 -m http.server 8080 &
# Open http://localhost:8080/tests/test.html
# Expected: Multiple FAILs — functions not yet exported
```

- [ ] **Step 3: Implement full calculator.js**

Replace `js/calculator.js`:

```javascript
// calculator.js — Pure calculation functions for Scope 1 & Scope 2 emissions
// All functions are side-effect-free. They take numbers/objects and return results.

/**
 * Scope 2: Grid electricity emissions
 * @param {number} facilityArea - m2
 * @param {number} eui - kWh/m2/year (from benchmarks or user override)
 * @param {number} gridEF - kgCO2e/kWh
 * @returns {{ estimatedElectricity: number, emissions: number }}
 */
export function calculateScope2(facilityArea, eui, gridEF) {
    const estimatedElectricity = facilityArea * eui;
    const emissions = estimatedElectricity * gridEF;
    return { estimatedElectricity, emissions };
}

/**
 * Scope 1: Area-based equipment emissions (boiler, generator, cooking, furnace)
 * @param {number} facilityArea - m2
 * @param {number} benchmark - fuel units per m2 per year (from equipment profile by climate zone)
 * @param {number} fuelEF - kgCO2e per fuel unit
 * @param {number} facilityMultiplier - multiplier for facility type (1.0 if none)
 * @returns {{ estimatedFuelUse: number, emissions: number }}
 */
export function calculateEquipmentEmissions(facilityArea, benchmark, fuelEF, facilityMultiplier) {
    const estimatedFuelUse = facilityArea * benchmark * facilityMultiplier;
    const emissions = estimatedFuelUse * fuelEF;
    return { estimatedFuelUse, emissions };
}

/**
 * Scope 1: Fleet vehicle emissions
 * @param {number} count - number of vehicles
 * @param {number} annualKm - km per vehicle per year
 * @param {number} fuelConsumptionPerKm - litres per km
 * @param {number} fuelEF - kgCO2e per litre
 * @returns {{ estimatedFuelUse: number, emissions: number }}
 */
export function calculateFleetEmissions(count, annualKm, fuelConsumptionPerKm, fuelEF) {
    const estimatedFuelUse = count * annualKm * fuelConsumptionPerKm;
    const emissions = estimatedFuelUse * fuelEF;
    return { estimatedFuelUse, emissions };
}

/**
 * Calculate all emissions for a single facility.
 * This is the main orchestrator that calls the above functions.
 *
 * @param {object} facility - { area, facilityType, equipment, customEUI }
 * @param {object} lookups - { climateZone, gridEF, euiBenchmarks, equipmentProfiles, fuelFactors, countryCode, defaultFuelMix }
 * @returns {object} - { scope1Total, scope2Total, scope2Detail, scope1Breakdown[], estimatedElectricity }
 */
export function calculateFacility(facility, lookups) {
    const { area, facilityType, equipment, customEUI } = facility;
    const { climateZone, gridEF, euiBenchmarks, equipmentProfiles, fuelFactors, countryCode, defaultFuelMix } = lookups;

    // Scope 2
    const zoneStr = String(climateZone);
    const euiData = euiBenchmarks[facilityType]?.[zoneStr];
    const eui = customEUI || euiData?.electricity || 150;
    const scope2 = calculateScope2(area, eui, gridEF);

    // Scope 1
    const scope1Breakdown = [];
    let scope1Total = 0;

    const areaEquipment = ['heating_boiler', 'generator', 'cooking', 'furnace'];

    for (const eqType of areaEquipment) {
        if (!equipment[eqType]) continue;

        const profile = equipmentProfiles[eqType];
        if (!profile) continue;

        const benchmark = profile.byClimateZone[zoneStr] || 0;
        const fuelKey = defaultFuelMix[profile.fuelKey] || 'natural_gas';
        const fuelEF = fuelFactors[fuelKey]?.default || 2.02;

        let facilityMultiplier = 1.0;
        if (profile.facilityMultiplier) {
            facilityMultiplier = profile.facilityMultiplier[facilityType] || profile.facilityMultiplier._default || 1.0;
        }

        const result = calculateEquipmentEmissions(area, benchmark, fuelEF, facilityMultiplier);

        scope1Breakdown.push({
            equipment: eqType,
            fuelType: fuelKey,
            fuelUnit: fuelFactors[fuelKey]?.unit || 'unit',
            estimatedFuelUse: result.estimatedFuelUse,
            emissions: result.emissions
        });

        scope1Total += result.emissions;
    }

    // Fleet vehicles
    const fleetTypes = ['fleet_car', 'fleet_van', 'fleet_truck'];
    for (const vType of fleetTypes) {
        const count = equipment[vType] || 0;
        if (count === 0) continue;

        const profile = equipmentProfiles[vType];
        if (!profile) continue;

        const annualKm = profile.annualKm[countryCode] || profile.annualKm._default || 15000;
        const fuelKey = defaultFuelMix[profile.fuelKey] || 'diesel';
        const fuelEF = fuelFactors[fuelKey]?.default || 2.68;

        const result = calculateFleetEmissions(count, annualKm, profile.fuelConsumptionPerKm, fuelEF);

        scope1Breakdown.push({
            equipment: vType,
            fuelType: fuelKey,
            fuelUnit: fuelFactors[fuelKey]?.unit || 'litre',
            count: count,
            estimatedFuelUse: result.estimatedFuelUse,
            emissions: result.emissions
        });

        scope1Total += result.emissions;
    }

    return {
        scope1Total,
        scope2Total: scope2.emissions,
        estimatedElectricity: scope2.estimatedElectricity,
        euiUsed: eui,
        gridEFUsed: gridEF,
        climateZone,
        scope2Detail: {
            fuelType: 'electricity',
            estimatedElectricity: scope2.estimatedElectricity,
            emissions: scope2.emissions
        },
        scope1Breakdown
    };
}

/**
 * Aggregate results across multiple facilities
 * @param {Array<{scope1Total: number, scope2Total: number}>} facilities
 * @returns {{ scope1Total: number, scope2Total: number, grandTotal: number }}
 */
export function aggregateFacilities(facilities) {
    let scope1Total = 0;
    let scope2Total = 0;

    for (const f of facilities) {
        scope1Total += f.scope1Total;
        scope2Total += f.scope2Total;
    }

    return {
        scope1Total,
        scope2Total,
        grandTotal: scope1Total + scope2Total
    };
}

// Benchmark data: average kgCO2e per m2 per year by facility type and climate zone
// Derived from combining EUI benchmarks with global average grid EFs (~0.45 kgCO2e/kWh)
// and average Scope 1 intensity. Used for comparison only.
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
 * Compare a facility's emissions to benchmarks
 * @param {number} totalEmissions - kgCO2e/year (scope1 + scope2)
 * @param {number} area - m2
 * @param {string} facilityType
 * @param {string} climateZone
 * @returns {{ emissionsPerM2, avgEmissionsPerM2, goodPracticePerM2, percentDiff }}
 */
export function getBenchmarkComparison(totalEmissions, area, facilityType, climateZone) {
    const emissionsPerM2 = area > 0 ? totalEmissions / area : 0;
    const zoneStr = String(climateZone);
    const avgEmissionsPerM2 = BENCHMARKS[facilityType]?.[zoneStr] || 80;
    const goodPracticePerM2 = avgEmissionsPerM2 * 0.6; // 25th percentile approximation

    const percentDiff = avgEmissionsPerM2 > 0
        ? ((emissionsPerM2 - avgEmissionsPerM2) / avgEmissionsPerM2) * 100
        : 0;

    return {
        emissionsPerM2,
        avgEmissionsPerM2,
        goodPracticePerM2,
        percentDiff
    };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
# Open http://localhost:8080/tests/test.html
# Expected: All tests PASS (16 passed, 0 failed)
```

- [ ] **Step 5: Commit**

```bash
git add js/calculator.js tests/test-calculator.js
git commit -m "feat: implement calculator module with Scope 1, Scope 2, fleet, aggregation, benchmarks"
```

---

### Task 6: Data Loading & App State Management

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Implement data loader and state manager in app.js**

Replace `js/app.js`:

```javascript
import { calculateFacility, aggregateFacilities, getBenchmarkComparison } from './calculator.js';
import { renderBuilding, clearBuilding } from './visualizer.js';
import { renderDashboard } from './dashboard.js';

// ── App State ──
export const appState = {
    currentStep: 1,
    location: { country: null, region: null },
    currentFacility: {
        name: '',
        facilityType: null,
        area: 0,
        areaUnit: 'sqm',
        customEUI: null,
        equipment: {
            heating_boiler: false,
            generator: false,
            cooking: false,
            furnace: false,
            fleet_car: 0,
            fleet_van: 0,
            fleet_truck: 0
        }
    },
    facilities: [],       // completed facilities with results
    data: {},             // loaded JSON data
    overrides: {}         // user overrides from review step
};

// ── Data Loader ──
async function loadData() {
    const files = [
        'countries', 'climate-zones', 'emission-factors',
        'fuel-factors', 'eui-benchmarks', 'equipment-profiles'
    ];
    const loaded = {};
    for (const file of files) {
        const resp = await fetch(`data/${file}.json`);
        loaded[file.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = await resp.json();
    }
    return loaded;
}

// ── Unit Conversion ──
const SQM_PER_SQFT = 0.092903;

function toSqm(value, unit) {
    return unit === 'sqft' ? value * SQM_PER_SQFT : value;
}

function fromSqm(value, unit) {
    return unit === 'sqft' ? value / SQM_PER_SQFT : value;
}

// ── Lookups ──
function getLookups() {
    const { data, location } = appState;
    const countryCode = location.country;
    const regionCode = location.region;

    const climateZone = data.climateZones[regionCode]
        || data.climateZones[`_${countryCode}`]
        || 3;

    const gridEF = data.emissionFactors[regionCode]
        || data.emissionFactors[`_${countryCode}`]
        || 0.5;

    const countryData = data.countries[countryCode] || {};
    const defaultFuelMix = countryData.defaultFuelMix || {};
    const unitSystem = countryData.unitSystem || 'metric';

    return {
        climateZone,
        gridEF,
        euiBenchmarks: data.euiBenchmarks,
        equipmentProfiles: data.equipmentProfiles,
        fuelFactors: data.fuelFactors,
        countryCode,
        defaultFuelMix,
        unitSystem
    };
}

// ── Compute current facility ──
function computeCurrentFacility() {
    const { currentFacility } = appState;
    const areaM2 = toSqm(currentFacility.area, currentFacility.areaUnit);
    const lookups = getLookups();

    return calculateFacility({
        area: areaM2,
        facilityType: currentFacility.facilityType,
        equipment: currentFacility.equipment,
        customEUI: currentFacility.customEUI
    }, lookups);
}

// ── Step Navigation ──
function showStep(stepNum) {
    appState.currentStep = stepNum;
    document.querySelectorAll('.wizard-step').forEach(el => {
        el.classList.toggle('hidden', el.dataset.step !== String(stepNum));
    });
    updateProgressBar();
}

function updateProgressBar() {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((el, i) => {
        el.classList.toggle('active', i + 1 === appState.currentStep);
        el.classList.toggle('completed', i + 1 < appState.currentStep);
    });
}

// ── Wizard Step Renderers ──

function renderStep1(container) {
    const countries = appState.data.countries;
    const sortedCodes = Object.keys(countries).sort((a, b) =>
        countries[a].name.localeCompare(countries[b].name)
    );

    container.innerHTML = `
        <div class="wizard-step" data-step="1">
            <h2>Where is your facility?</h2>
            <p class="step-desc">Select your country and region to determine local emission factors and climate data.</p>

            <label for="country-select">Country</label>
            <select id="country-select">
                <option value="">Select a country...</option>
                ${sortedCodes.map(code =>
                    `<option value="${code}">${countries[code].name}</option>`
                ).join('')}
            </select>

            <label for="region-select" class="hidden" id="region-label">Region / State</label>
            <select id="region-select" class="hidden">
                <option value="">Select a region...</option>
            </select>

            <button id="step1-next" class="btn-primary" disabled>Next</button>
        </div>
    `;

    const countrySelect = container.querySelector('#country-select');
    const regionSelect = container.querySelector('#region-select');
    const regionLabel = container.querySelector('#region-label');
    const nextBtn = container.querySelector('#step1-next');

    countrySelect.addEventListener('change', () => {
        const code = countrySelect.value;
        appState.location.country = code;
        const country = countries[code];
        if (country && country.regions.length > 0) {
            regionSelect.innerHTML = '<option value="">Select a region...</option>' +
                country.regions.map(r =>
                    `<option value="${r.code}">${r.name}</option>`
                ).join('');
            regionSelect.classList.remove('hidden');
            regionLabel.classList.remove('hidden');
            nextBtn.disabled = true;
        } else {
            regionSelect.classList.add('hidden');
            regionLabel.classList.add('hidden');
            appState.location.region = code;
            nextBtn.disabled = false;
        }

        // Set default unit based on country
        const unitSystem = country?.unitSystem || 'metric';
        appState.currentFacility.areaUnit = unitSystem === 'imperial' ? 'sqft' : 'sqm';
    });

    regionSelect.addEventListener('change', () => {
        appState.location.region = regionSelect.value;
        nextBtn.disabled = !regionSelect.value;
    });

    nextBtn.addEventListener('click', () => showStep(2));
}

function renderStep2(container) {
    const facilityTypes = [
        { value: 'office', label: 'Office' },
        { value: 'retail', label: 'Retail / Shop' },
        { value: 'warehouse', label: 'Warehouse' },
        { value: 'light_manufacturing', label: 'Light Manufacturing' },
        { value: 'heavy_manufacturing', label: 'Heavy Manufacturing' },
        { value: 'restaurant', label: 'Restaurant' },
        { value: 'hospital', label: 'Hospital / Clinic' },
        { value: 'hotel', label: 'Hotel' },
        { value: 'residential', label: 'Residential' },
        { value: 'school', label: 'School / University' }
    ];

    const unitLabel = appState.currentFacility.areaUnit === 'sqft' ? 'sq ft' : 'sq m';
    const altUnit = appState.currentFacility.areaUnit === 'sqft' ? 'sqm' : 'sqft';
    const altUnitLabel = altUnit === 'sqft' ? 'sq ft' : 'sq m';

    container.innerHTML += `
        <div class="wizard-step hidden" data-step="2">
            <h2>Tell us about your facility</h2>
            <p class="step-desc">Basic details help us estimate your energy consumption.</p>

            <label for="facility-name">Facility Name</label>
            <input type="text" id="facility-name" placeholder="e.g., Main Office, Warehouse A" />

            <label for="facility-type">Facility Type</label>
            <select id="facility-type">
                <option value="">Select type...</option>
                ${facilityTypes.map(t =>
                    `<option value="${t.value}">${t.label}</option>`
                ).join('')}
            </select>

            <label for="facility-area">Floor Area (${unitLabel})</label>
            <div class="area-input-row">
                <input type="number" id="facility-area" min="1" placeholder="e.g., 500" />
                <button id="toggle-unit" class="btn-text"  title="Switch to ${altUnitLabel}">
                    Switch to ${altUnitLabel}
                </button>
            </div>

            <div id="custom-eui-section" class="collapsed">
                <button id="toggle-eui" class="btn-text">Advanced: Set custom EUI</button>
                <div id="eui-input-wrap" class="hidden">
                    <label for="custom-eui">Custom EUI (kWh/m²/year)</label>
                    <input type="number" id="custom-eui" min="1" placeholder="Leave blank to use benchmark" />
                </div>
            </div>

            <div class="step-buttons">
                <button id="step2-back" class="btn-secondary">Back</button>
                <button id="step2-next" class="btn-primary" disabled>Next</button>
            </div>
        </div>
    `;

    const nameInput = container.querySelector('#facility-name');
    const typeSelect = container.querySelector('#facility-type');
    const areaInput = container.querySelector('#facility-area');
    const toggleUnit = container.querySelector('#toggle-unit');
    const toggleEUI = container.querySelector('#toggle-eui');
    const euiWrap = container.querySelector('#eui-input-wrap');
    const euiInput = container.querySelector('#custom-eui');
    const nextBtn = container.querySelector('#step2-next');
    const backBtn = container.querySelector('#step2-back');
    const areaLabel = container.querySelector('label[for="facility-area"]');

    function validate() {
        nextBtn.disabled = !(typeSelect.value && areaInput.value > 0);
    }

    nameInput.addEventListener('input', () => {
        appState.currentFacility.name = nameInput.value;
    });

    typeSelect.addEventListener('change', () => {
        appState.currentFacility.facilityType = typeSelect.value;
        renderBuilding(document.getElementById('visual-panel'), typeSelect.value, appState.currentFacility.equipment);
        validate();
    });

    areaInput.addEventListener('input', () => {
        appState.currentFacility.area = parseFloat(areaInput.value) || 0;
        validate();
    });

    toggleUnit.addEventListener('click', () => {
        const current = appState.currentFacility.areaUnit;
        const newUnit = current === 'sqm' ? 'sqft' : 'sqm';
        // Convert existing value
        if (appState.currentFacility.area > 0) {
            const areaM2 = toSqm(appState.currentFacility.area, current);
            appState.currentFacility.area = fromSqm(areaM2, newUnit);
            areaInput.value = Math.round(appState.currentFacility.area);
        }
        appState.currentFacility.areaUnit = newUnit;
        const label = newUnit === 'sqft' ? 'sq ft' : 'sq m';
        areaLabel.textContent = `Floor Area (${label})`;
        const alt = newUnit === 'sqft' ? 'sq m' : 'sq ft';
        toggleUnit.textContent = `Switch to ${alt}`;
    });

    toggleEUI.addEventListener('click', () => {
        euiWrap.classList.toggle('hidden');
    });

    euiInput.addEventListener('input', () => {
        appState.currentFacility.customEUI = parseFloat(euiInput.value) || null;
    });

    backBtn.addEventListener('click', () => showStep(1));
    nextBtn.addEventListener('click', () => showStep(3));
}

function renderStep3(container) {
    container.innerHTML += `
        <div class="wizard-step hidden" data-step="3">
            <h2>What equipment is on-site?</h2>
            <p class="step-desc">Check the equipment present at your facility. We'll estimate fuel consumption from benchmarks.</p>

            <div class="equipment-list">
                <label class="equipment-item">
                    <input type="checkbox" id="eq-boiler" />
                    <div class="eq-info">
                        <strong>Heating Boiler</strong>
                        <span>Space heating (gas/fuel oil)</span>
                    </div>
                </label>

                <label class="equipment-item">
                    <input type="checkbox" id="eq-generator" />
                    <div class="eq-info">
                        <strong>Backup Generator</strong>
                        <span>Diesel-powered backup</span>
                    </div>
                </label>

                <label class="equipment-item">
                    <input type="checkbox" id="eq-cooking" />
                    <div class="eq-info">
                        <strong>Cooking Equipment</strong>
                        <span>Commercial kitchen (LPG/gas)</span>
                    </div>
                </label>

                <label class="equipment-item">
                    <input type="checkbox" id="eq-furnace" />
                    <div class="eq-info">
                        <strong>Industrial Furnace / Kiln</strong>
                        <span>Process heat (gas/fuel oil)</span>
                    </div>
                </label>

                <div class="fleet-section">
                    <h3>Company Vehicles</h3>
                    <div class="fleet-row">
                        <label for="fleet-car">Cars</label>
                        <input type="number" id="fleet-car" min="0" value="0" />
                    </div>
                    <div class="fleet-row">
                        <label for="fleet-van">Vans</label>
                        <input type="number" id="fleet-van" min="0" value="0" />
                    </div>
                    <div class="fleet-row">
                        <label for="fleet-truck">Trucks</label>
                        <input type="number" id="fleet-truck" min="0" value="0" />
                    </div>
                </div>
            </div>

            <div class="step-buttons">
                <button id="step3-back" class="btn-secondary">Back</button>
                <button id="step3-next" class="btn-primary">Review Estimates</button>
            </div>
        </div>
    `;

    const eqMap = {
        'eq-boiler': 'heating_boiler',
        'eq-generator': 'generator',
        'eq-cooking': 'cooking',
        'eq-furnace': 'furnace'
    };

    for (const [elId, key] of Object.entries(eqMap)) {
        container.querySelector(`#${elId}`).addEventListener('change', (e) => {
            appState.currentFacility.equipment[key] = e.target.checked;
            renderBuilding(
                document.getElementById('visual-panel'),
                appState.currentFacility.facilityType,
                appState.currentFacility.equipment
            );
        });
    }

    const fleetMap = { 'fleet-car': 'fleet_car', 'fleet-van': 'fleet_van', 'fleet-truck': 'fleet_truck' };
    for (const [elId, key] of Object.entries(fleetMap)) {
        container.querySelector(`#${elId}`).addEventListener('input', (e) => {
            appState.currentFacility.equipment[key] = parseInt(e.target.value) || 0;
            renderBuilding(
                document.getElementById('visual-panel'),
                appState.currentFacility.facilityType,
                appState.currentFacility.equipment
            );
        });
    }

    container.querySelector('#step3-back').addEventListener('click', () => showStep(2));
    container.querySelector('#step3-next').addEventListener('click', () => {
        renderStep4Content();
        showStep(4);
    });
}

function renderStep4Content() {
    const results = computeCurrentFacility();
    const lookups = getLookups();
    const container = document.querySelector('[data-step="4"]');
    if (!container) return;

    const fuelFactors = appState.data.fuelFactors;

    let breakdownHTML = '';
    for (const item of results.scope1Breakdown) {
        const fuelLabel = item.fuelType.replace(/_/g, ' ');
        const unitLabel = fuelFactors[item.fuelType]?.unitLabel || 'units';
        breakdownHTML += `
            <tr>
                <td>${item.equipment.replace(/_/g, ' ')}</td>
                <td>${fuelLabel}</td>
                <td><input type="number" class="override-input" data-key="fuel_${item.equipment}" value="${Math.round(item.estimatedFuelUse)}" /> ${unitLabel}/yr</td>
                <td>${(item.emissions / 1000).toFixed(2)} tCO2e</td>
            </tr>
        `;
    }

    container.querySelector('.review-content').innerHTML = `
        <div class="review-section">
            <h3>Scope 2 — Electricity</h3>
            <table class="review-table">
                <tr><td>EUI used</td><td><input type="number" class="override-input" data-key="eui" value="${results.euiUsed}" /> kWh/m²/yr</td></tr>
                <tr><td>Estimated electricity</td><td>${Math.round(results.estimatedElectricity).toLocaleString()} kWh/yr</td></tr>
                <tr><td>Grid emission factor</td><td><input type="number" step="0.001" class="override-input" data-key="gridEF" value="${results.gridEFUsed}" /> kgCO2e/kWh</td></tr>
                <tr><td>Scope 2 emissions</td><td><strong>${(results.scope2Total / 1000).toFixed(2)} tCO2e/yr</strong></td></tr>
            </table>
        </div>

        ${results.scope1Breakdown.length > 0 ? `
        <div class="review-section">
            <h3>Scope 1 — On-Site Fuel</h3>
            <table class="review-table">
                <tr><th>Equipment</th><th>Fuel</th><th>Est. Usage</th><th>Emissions</th></tr>
                ${breakdownHTML}
            </table>
        </div>
        ` : '<p class="no-scope1">No Scope 1 equipment selected.</p>'}

        <div class="review-section review-total">
            <h3>Total: ${((results.scope1Total + results.scope2Total) / 1000).toFixed(2)} tCO2e/year</h3>
        </div>

        <p class="review-note">You can edit any value above. Changes will recalculate automatically.</p>
    `;

    // Store overrides on input change
    container.querySelectorAll('.override-input').forEach(input => {
        input.addEventListener('change', () => {
            appState.overrides[input.dataset.key] = parseFloat(input.value);
        });
    });
}

function renderStep4(container) {
    container.innerHTML += `
        <div class="wizard-step hidden" data-step="4">
            <h2>Review Your Estimates</h2>
            <p class="step-desc">Here's what we calculated based on benchmarks. Edit any value to refine.</p>

            <div class="review-content"></div>

            <div class="step-buttons">
                <button id="step4-back" class="btn-secondary">Back</button>
                <button id="step4-next" class="btn-primary">Looks Good</button>
            </div>
        </div>
    `;

    container.querySelector('#step4-back').addEventListener('click', () => showStep(3));
    container.querySelector('#step4-next').addEventListener('click', () => {
        // Finalize this facility
        const results = computeCurrentFacility();
        appState.facilities.push({
            name: appState.currentFacility.name || `Facility ${appState.facilities.length + 1}`,
            type: appState.currentFacility.facilityType,
            area: toSqm(appState.currentFacility.area, appState.currentFacility.areaUnit),
            areaDisplay: appState.currentFacility.area,
            areaUnit: appState.currentFacility.areaUnit,
            ...results,
            overrides: { ...appState.overrides }
        });
        showStep(5);
    });
}

function renderStep5(container) {
    container.innerHTML += `
        <div class="wizard-step hidden" data-step="5">
            <h2>What's next?</h2>
            <p class="step-desc">You've added ${appState.facilities.length} facility. Add another or view your results.</p>

            <div class="step5-actions">
                <button id="add-another" class="btn-secondary">Add Another Facility</button>
                <button id="view-results" class="btn-primary">View Results</button>
            </div>

            <div id="facilities-summary"></div>
        </div>
    `;

    container.querySelector('#add-another').addEventListener('click', () => {
        resetCurrentFacility();
        clearBuilding(document.getElementById('visual-panel'));
        showStep(2);
    });

    container.querySelector('#view-results').addEventListener('click', () => {
        document.getElementById('wizard-panel').classList.add('hidden');
        document.getElementById('visual-panel').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        renderDashboard(
            document.getElementById('dashboard'),
            appState.facilities,
            appState.data
        );
    });
}

function resetCurrentFacility() {
    appState.currentFacility = {
        name: '',
        facilityType: null,
        area: 0,
        areaUnit: appState.currentFacility.areaUnit,
        customEUI: null,
        equipment: {
            heating_boiler: false,
            generator: false,
            cooking: false,
            furnace: false,
            fleet_car: 0,
            fleet_van: 0,
            fleet_truck: 0
        }
    };
    appState.overrides = {};
}

// ── Progress Bar ──
function renderProgressBar(container) {
    const steps = ['Location', 'Facility', 'Equipment', 'Review', 'Finish'];
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    bar.innerHTML = steps.map((s, i) =>
        `<div class="progress-step ${i === 0 ? 'active' : ''}" data-step="${i + 1}">
            <span class="step-num">${i + 1}</span>
            <span class="step-label">${s}</span>
        </div>`
    ).join('');
    container.prepend(bar);
}

// ── Init ──
async function init() {
    try {
        appState.data = await loadData();
    } catch (e) {
        document.getElementById('wizard-panel').innerHTML =
            '<p class="error">Failed to load data files. Please ensure all JSON files are present in the data/ directory.</p>';
        return;
    }

    const wizard = document.getElementById('wizard-panel');
    renderProgressBar(wizard);
    renderStep1(wizard);
    renderStep2(wizard);
    renderStep3(wizard);
    renderStep4(wizard);
    renderStep5(wizard);
    showStep(1);
}

init();
```

- [ ] **Step 2: Verify app loads without errors**

```bash
# Open http://localhost:8080/ in browser
# Expected: Step 1 form renders with country dropdown, no console errors
```

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: implement wizard state machine, data loading, and step navigation"
```

---

### Task 7: Isometric SVG Visualizer

**Files:**
- Modify: `js/visualizer.js`

This task creates all 10 isometric building SVGs as inline SVG generators (no external files needed — keeps it self-contained) and the equipment overlay system.

- [ ] **Step 1: Implement visualizer.js**

Replace `js/visualizer.js`:

```javascript
// visualizer.js — Isometric SVG building renderer
// Generates inline SVGs for each facility type with equipment overlays

const COLORS = {
    office:              { wall: '#5B8DEF', wallDark: '#4A7BD4', roof: '#7BA7F7', window: '#A8D0FF' },
    retail:              { wall: '#F5A623', wallDark: '#D4901E', roof: '#F7BE5F', window: '#FDE8B5' },
    warehouse:           { wall: '#8E8E93', wallDark: '#6D6D72', roof: '#AEAEB2', window: '#C7C7CC' },
    light_manufacturing: { wall: '#34C759', wallDark: '#2AAF4C', roof: '#5DD87B', window: '#B8F0C8' },
    heavy_manufacturing: { wall: '#636366', wallDark: '#48484A', roof: '#8E8E93', window: '#AEAEB2' },
    restaurant:          { wall: '#FF6B6B', wallDark: '#E05555', roof: '#FF9B9B', window: '#FFDADA' },
    hospital:            { wall: '#FFFFFF', wallDark: '#E5E5EA', roof: '#F2F2F7', window: '#D1EAFF', accent: '#FF3B30' },
    hotel:               { wall: '#AF52DE', wallDark: '#9542C1', roof: '#C77DEB', window: '#E8C8F7' },
    residential:         { wall: '#FFD60A', wallDark: '#D4B108', roof: '#CC7744', window: '#A8D0FF' },
    school:              { wall: '#FF9F0A', wallDark: '#D4850A', roof: '#FFB84D', window: '#A8D0FF' }
};

const EQUIPMENT_ICONS = {
    heating_boiler: { color: '#FF6B35', label: 'Boiler', position: 'inside' },
    generator:      { color: '#636366', label: 'Generator', position: 'beside' },
    cooking:        { color: '#FF9F0A', label: 'Kitchen', position: 'roof' },
    furnace:        { color: '#FF3B30', label: 'Furnace', position: 'inside-right' },
    fleet_car:      { color: '#5B8DEF', label: 'Car', position: 'parking' },
    fleet_van:      { color: '#34C759', label: 'Van', position: 'parking' },
    fleet_truck:    { color: '#8E8E93', label: 'Truck', position: 'parking' }
};

function createSVGElement(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) {
        el.setAttribute(k, v);
    }
    return el;
}

// Isometric helpers — project (x, y, z) to 2D screen coords
// Using standard isometric: 30-degree angle
function isoProject(x, y, z) {
    return {
        sx: (x - y) * 0.866,
        sy: (x + y) * 0.5 - z
    };
}

function buildIsometricBox(cx, cy, w, d, h, colors) {
    const group = createSVGElement('g');

    // Top face
    const top = createSVGElement('polygon', {
        points: [
            `${cx},${cy - h}`,
            `${cx + w * 0.866},${cy - h + w * 0.5}`,
            `${cx},${cy - h + w * 0.5 + d * 0.5}`,
            `${cx - d * 0.866},${cy - h + d * 0.5}`
        ].join(' '),
        fill: colors.roof,
        stroke: '#00000015',
        'stroke-width': 0.5
    });

    // Left face
    const left = createSVGElement('polygon', {
        points: [
            `${cx},${cy - h + w * 0.5 + d * 0.5}`,
            `${cx - d * 0.866},${cy - h + d * 0.5}`,
            `${cx - d * 0.866},${cy + d * 0.5}`,
            `${cx},${cy + w * 0.5 + d * 0.5}`
        ].join(' '),
        fill: colors.wallDark,
        stroke: '#00000015',
        'stroke-width': 0.5
    });

    // Right face
    const right = createSVGElement('polygon', {
        points: [
            `${cx},${cy - h + w * 0.5 + d * 0.5}`,
            `${cx + w * 0.866},${cy - h + w * 0.5}`,
            `${cx + w * 0.866},${cy + w * 0.5}`,
            `${cx},${cy + w * 0.5 + d * 0.5}`
        ].join(' '),
        fill: colors.wall,
        stroke: '#00000015',
        'stroke-width': 0.5
    });

    group.appendChild(top);
    group.appendChild(left);
    group.appendChild(right);

    return group;
}

function addWindows(group, cx, cy, w, d, h, colors, rows, cols) {
    const winW = (w * 0.866) / (cols * 2);
    const winH = h / (rows * 2);

    // Windows on right face
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const xOff = (c + 0.5) * (w * 0.866) / cols;
            const yOff = (r + 0.5) * h / rows;
            const wx = cx + xOff - winW / 2;
            const wy = cy - h + w * 0.5 + xOff * 0.577 - yOff + winH / 2;

            const win = createSVGElement('rect', {
                x: wx,
                y: wy,
                width: winW,
                height: winH,
                fill: colors.window,
                rx: 1,
                opacity: 0.8,
                transform: `skewY(30)`
            });
            group.appendChild(win);
        }
    }
}

function buildBuilding(type, cx, cy) {
    const colors = COLORS[type] || COLORS.office;
    const group = createSVGElement('g', { class: 'building', 'data-type': type });

    // Different shapes per building type
    const configs = {
        office:              { w: 70, d: 50, h: 100, winRows: 5, winCols: 3 },
        retail:              { w: 80, d: 40, h: 50,  winRows: 2, winCols: 4 },
        warehouse:           { w: 100, d: 60, h: 45, winRows: 1, winCols: 2 },
        light_manufacturing: { w: 90, d: 55, h: 55,  winRows: 2, winCols: 3 },
        heavy_manufacturing: { w: 110, d: 70, h: 60, winRows: 1, winCols: 3 },
        restaurant:          { w: 60, d: 45, h: 40,  winRows: 2, winCols: 3 },
        hospital:            { w: 80, d: 55, h: 80,  winRows: 4, winCols: 4 },
        hotel:               { w: 65, d: 50, h: 110, winRows: 6, winCols: 3 },
        residential:         { w: 55, d: 40, h: 50,  winRows: 2, winCols: 2 },
        school:              { w: 90, d: 45, h: 45,  winRows: 2, winCols: 4 }
    };

    const cfg = configs[type] || configs.office;

    // Shadow
    const shadow = createSVGElement('ellipse', {
        cx: cx,
        cy: cy + cfg.w * 0.25 + cfg.d * 0.25 + 8,
        rx: (cfg.w + cfg.d) * 0.5,
        ry: (cfg.w + cfg.d) * 0.18,
        fill: '#00000012'
    });
    group.appendChild(shadow);

    // Main building box
    const box = buildIsometricBox(cx, cy, cfg.w, cfg.d, cfg.h, colors);
    group.appendChild(box);

    // Hospital red cross
    if (type === 'hospital') {
        const crossGroup = createSVGElement('g');
        const crossX = cx + cfg.w * 0.433;
        const crossY = cy - cfg.h * 0.7 + cfg.w * 0.25;
        crossGroup.appendChild(createSVGElement('rect', {
            x: crossX - 3, y: crossY - 8, width: 6, height: 16,
            fill: '#FF3B30', transform: 'skewY(30)'
        }));
        crossGroup.appendChild(createSVGElement('rect', {
            x: crossX - 8, y: crossY - 3, width: 16, height: 6,
            fill: '#FF3B30', transform: 'skewY(30)'
        }));
        group.appendChild(crossGroup);
    }

    // Residential pitched roof
    if (type === 'residential') {
        const roofPeak = createSVGElement('polygon', {
            points: [
                `${cx},${cy - cfg.h - 20}`,
                `${cx + cfg.w * 0.866},${cy - cfg.h + cfg.w * 0.5 - 10}`,
                `${cx},${cy - cfg.h + cfg.w * 0.5 + cfg.d * 0.5}`,
                `${cx - cfg.d * 0.866},${cy - cfg.h + cfg.d * 0.5 - 10}`
            ].join(' '),
            fill: colors.roof,
            stroke: '#00000020',
            'stroke-width': 0.5
        });
        group.appendChild(roofPeak);
    }

    return { group, config: cfg };
}

function addEquipment(svg, cx, cy, config, equipment) {
    const { w, d, h } = config;

    // Equipment positions relative to building
    const positions = {
        inside:       { x: cx - d * 0.3, y: cy + d * 0.25 },
        'inside-right': { x: cx + w * 0.5, y: cy + w * 0.15 },
        beside:       { x: cx + w * 0.866 + 20, y: cy + w * 0.5 - 10 },
        roof:         { x: cx, y: cy - h - 5 },
        parking:      { x: cx + w * 0.866 + 15, y: cy + w * 0.5 + 20 }
    };

    let parkingOffset = 0;

    for (const [eqKey, eqInfo] of Object.entries(EQUIPMENT_ICONS)) {
        const isFleet = eqKey.startsWith('fleet_');
        const isActive = isFleet ? (equipment[eqKey] > 0) : equipment[eqKey];
        if (!isActive) continue;

        const pos = positions[eqInfo.position] || positions.beside;
        const group = createSVGElement('g', {
            class: `equipment eq-${eqKey}`,
            opacity: '0',
            style: 'transition: opacity 0.4s ease'
        });

        let x = pos.x;
        let y = pos.y;

        if (eqInfo.position === 'parking') {
            y += parkingOffset;
            parkingOffset += 22;
        }

        // Equipment box
        const eqBox = buildIsometricBox(x, y, 14, 10, 12, {
            roof: eqInfo.color + '99',
            wall: eqInfo.color,
            wallDark: eqInfo.color + 'CC'
        });
        group.appendChild(eqBox);

        // Label
        const label = createSVGElement('text', {
            x: x,
            y: y - 16,
            'text-anchor': 'middle',
            fill: '#1a1a2e',
            'font-size': '9',
            'font-family': '-apple-system, sans-serif'
        });
        label.textContent = isFleet ? `${equipment[eqKey]}x ${eqInfo.label}` : eqInfo.label;
        group.appendChild(label);

        // Boiler steam animation
        if (eqKey === 'heating_boiler') {
            for (let i = 0; i < 3; i++) {
                const steam = createSVGElement('circle', {
                    cx: x + i * 4 - 4,
                    cy: y - 18,
                    r: 2,
                    fill: '#C7C7CC',
                    opacity: 0.6
                });
                const anim = createSVGElement('animate', {
                    attributeName: 'cy',
                    values: `${y - 18};${y - 30}`,
                    dur: `${1.5 + i * 0.3}s`,
                    repeatCount: 'indefinite'
                });
                const animOpacity = createSVGElement('animate', {
                    attributeName: 'opacity',
                    values: '0.6;0',
                    dur: `${1.5 + i * 0.3}s`,
                    repeatCount: 'indefinite'
                });
                steam.appendChild(anim);
                steam.appendChild(animOpacity);
                group.appendChild(steam);
            }
        }

        // Furnace glow
        if (eqKey === 'furnace') {
            const glow = createSVGElement('rect', {
                x: x - 5,
                y: y - 6,
                width: 10,
                height: 6,
                fill: '#FF3B30',
                rx: 1,
                opacity: 0.7
            });
            const animGlow = createSVGElement('animate', {
                attributeName: 'opacity',
                values: '0.4;0.8;0.4',
                dur: '2s',
                repeatCount: 'indefinite'
            });
            glow.appendChild(animGlow);
            group.appendChild(glow);
        }

        // Cooking chimney smoke
        if (eqKey === 'cooking') {
            for (let i = 0; i < 2; i++) {
                const smoke = createSVGElement('circle', {
                    cx: x + i * 6 - 3,
                    cy: y - 14,
                    r: 3,
                    fill: '#8E8E93',
                    opacity: 0.4
                });
                const anim = createSVGElement('animate', {
                    attributeName: 'cy',
                    values: `${y - 14};${y - 35}`,
                    dur: `${2 + i * 0.5}s`,
                    repeatCount: 'indefinite'
                });
                const animR = createSVGElement('animate', {
                    attributeName: 'r',
                    values: '3;6',
                    dur: `${2 + i * 0.5}s`,
                    repeatCount: 'indefinite'
                });
                smoke.appendChild(anim);
                smoke.appendChild(animR);
                group.appendChild(smoke);
            }
        }

        svg.appendChild(group);

        // Fade in
        requestAnimationFrame(() => {
            group.setAttribute('opacity', '1');
        });
    }
}

/**
 * Render building visualization
 * @param {HTMLElement} container - the #visual-panel element
 * @param {string} facilityType - e.g., 'office'
 * @param {object} equipment - { heating_boiler: bool, generator: bool, ... fleet_car: number, ... }
 */
export function renderBuilding(container, facilityType, equipment) {
    if (!facilityType) return;

    container.innerHTML = '';

    const svg = createSVGElement('svg', {
        viewBox: '0 0 400 350',
        width: '100%',
        height: '100%',
        style: 'max-width: 500px; max-height: 450px;'
    });

    // Background gradient
    const defs = createSVGElement('defs');
    const grad = createSVGElement('radialGradient', { id: 'bg-grad', cx: '50%', cy: '50%', r: '50%' });
    const stop1 = createSVGElement('stop', { offset: '0%', 'stop-color': '#f0f2f5' });
    const stop2 = createSVGElement('stop', { offset: '100%', 'stop-color': '#e5e5ea' });
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    const bg = createSVGElement('rect', { width: '400', height: '350', fill: 'url(#bg-grad)' });
    svg.appendChild(bg);

    // Ground plane
    const ground = createSVGElement('ellipse', {
        cx: 200, cy: 260, rx: 160, ry: 40,
        fill: '#d1d1d6', opacity: 0.3
    });
    svg.appendChild(ground);

    const cx = 180;
    const cy = 220;
    const { group, config } = buildBuilding(facilityType, cx, cy);
    svg.appendChild(group);

    addEquipment(svg, cx, cy, config, equipment || {});

    // Facility type label
    const typeLabel = createSVGElement('text', {
        x: 200, y: 330,
        'text-anchor': 'middle',
        fill: '#8e8e93',
        'font-size': '12',
        'font-family': '-apple-system, sans-serif'
    });
    typeLabel.textContent = facilityType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    svg.appendChild(typeLabel);

    container.appendChild(svg);
}

/**
 * Clear the building visualization
 * @param {HTMLElement} container
 */
export function clearBuilding(container) {
    container.innerHTML = `
        <div style="color: #8e8e93; font-size: 14px; text-align: center;">
            <p>Select a facility type to see the building</p>
        </div>
    `;
}
```

- [ ] **Step 2: Verify building renders when selecting a facility type**

```bash
# Open http://localhost:8080/ in browser
# Select a country + region, click Next
# Select "Office" from facility type dropdown
# Expected: Isometric office building appears in right panel
# Check boiler checkbox
# Expected: Boiler icon with steam animation appears on/near building
```

- [ ] **Step 3: Commit**

```bash
git add js/visualizer.js
git commit -m "feat: implement isometric SVG building visualizer with equipment overlays and animations"
```

---

### Task 8: Dashboard — Results Page

**Files:**
- Modify: `js/dashboard.js`

- [ ] **Step 1: Implement dashboard.js**

Replace `js/dashboard.js`:

```javascript
// dashboard.js — Results dashboard with charts, table, benchmarks, and export
import { aggregateFacilities, getBenchmarkComparison } from './calculator.js';

/**
 * Render the full results dashboard
 * @param {HTMLElement} container - #dashboard element
 * @param {Array} facilities - array of completed facility result objects
 * @param {object} data - loaded JSON data
 */
export function renderDashboard(container, facilities, data) {
    const agg = aggregateFacilities(facilities);

    container.innerHTML = `
        <div class="dashboard-wrapper">
            <header class="dash-header">
                <button id="back-to-wizard" class="btn-text">&larr; Add more facilities</button>
                <h1>Your Carbon Footprint Estimate</h1>
            </header>

            <div class="dash-headline">
                <div class="headline-number">${(agg.grandTotal / 1000).toFixed(1)}</div>
                <div class="headline-unit">tCO2e / year</div>
                <div class="headline-badges">
                    <span class="badge scope1">Scope 1: ${(agg.scope1Total / 1000).toFixed(1)} t</span>
                    <span class="badge scope2">Scope 2: ${(agg.scope2Total / 1000).toFixed(1)} t</span>
                </div>
            </div>

            <div class="dash-grid">
                <div class="dash-card">
                    <h3>Emissions by Source</h3>
                    <div id="donut-chart"></div>
                </div>

                ${facilities.length > 1 ? `
                <div class="dash-card">
                    <h3>By Facility</h3>
                    <div id="facility-table"></div>
                </div>
                ` : ''}

                <div class="dash-card">
                    <h3>How You Compare</h3>
                    <div id="benchmark-bars"></div>
                </div>

                <div class="dash-card collapsible">
                    <h3 class="collapsible-header">Assumptions & Overrides <span class="toggle-icon">+</span></h3>
                    <div id="assumptions-panel" class="collapsed-content"></div>
                </div>
            </div>

            <div class="dash-export">
                <button id="export-csv" class="btn-secondary">Download CSV</button>
                <button id="export-pdf" class="btn-secondary">Download PDF</button>
            </div>
        </div>
    `;

    renderDonutChart(container.querySelector('#donut-chart'), facilities, agg);

    if (facilities.length > 1) {
        renderFacilityTable(container.querySelector('#facility-table'), facilities, agg);
    }

    renderBenchmarkBars(container.querySelector('#benchmark-bars'), facilities);
    renderAssumptions(container.querySelector('#assumptions-panel'), facilities, data);

    // Event listeners
    container.querySelector('#back-to-wizard').addEventListener('click', () => {
        container.classList.add('hidden');
        document.getElementById('wizard-panel').classList.remove('hidden');
        document.getElementById('visual-panel').classList.remove('hidden');
    });

    container.querySelector('#export-csv').addEventListener('click', () => exportCSV(facilities, agg));
    container.querySelector('#export-pdf').addEventListener('click', () => exportPDF());

    // Collapsible
    container.querySelector('.collapsible-header')?.addEventListener('click', (e) => {
        const content = container.querySelector('.collapsed-content');
        const icon = e.currentTarget.querySelector('.toggle-icon');
        content.classList.toggle('expanded');
        icon.textContent = content.classList.contains('expanded') ? '−' : '+';
    });
}

// ── Donut Chart (SVG) ──
function renderDonutChart(container, facilities, agg) {
    const sources = {};

    // Aggregate by source across all facilities
    for (const f of facilities) {
        // Scope 2
        const s2Key = 'Electricity';
        sources[s2Key] = (sources[s2Key] || 0) + f.scope2Total;

        // Scope 1
        for (const item of f.scope1Breakdown) {
            const label = item.fuelType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const key = item.equipment.startsWith('fleet_') ? 'Fleet Vehicles' : label;
            sources[key] = (sources[key] || 0) + item.emissions;
        }
    }

    const entries = Object.entries(sources).filter(([_, v]) => v > 0);
    const total = entries.reduce((sum, [_, v]) => sum + v, 0);

    const colorMap = {
        'Electricity': '#5B8DEF',
        'Natural Gas': '#F5A623',
        'Diesel': '#8E8E93',
        'Gasoline': '#636366',
        'Lpg': '#FFD60A',
        'Fuel Oil': '#AF52DE',
        'Fleet Vehicles': '#34C759'
    };

    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 80;
    const innerR = 50;

    let svg = `<svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:250px">`;

    let startAngle = 0;
    const slices = [];

    for (const [label, value] of entries) {
        const fraction = value / total;
        const angle = fraction * Math.PI * 2;
        const endAngle = startAngle + angle;

        const x1 = cx + outerR * Math.cos(startAngle);
        const y1 = cy + outerR * Math.sin(startAngle);
        const x2 = cx + outerR * Math.cos(endAngle);
        const y2 = cy + outerR * Math.sin(endAngle);
        const x3 = cx + innerR * Math.cos(endAngle);
        const y3 = cy + innerR * Math.sin(endAngle);
        const x4 = cx + innerR * Math.cos(startAngle);
        const y4 = cy + innerR * Math.sin(startAngle);

        const largeArc = angle > Math.PI ? 1 : 0;
        const color = colorMap[label] || '#AEAEB2';

        const path = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;

        const pct = (fraction * 100).toFixed(1);
        const tCO2e = (value / 1000).toFixed(2);

        svg += `<path d="${path}" fill="${color}" stroke="#fff" stroke-width="1">
            <title>${label}: ${tCO2e} tCO2e (${pct}%)</title>
        </path>`;

        slices.push({ label, value, color, pct });
        startAngle = endAngle;
    }

    // Center text
    svg += `<text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="14" font-weight="bold" fill="#1a1a2e">${(total / 1000).toFixed(1)}</text>`;
    svg += `<text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="9" fill="#8e8e93">tCO2e</text>`;
    svg += `</svg>`;

    // Legend
    let legend = '<div class="donut-legend">';
    for (const s of slices) {
        legend += `<div class="legend-item">
            <span class="legend-color" style="background:${s.color}"></span>
            <span>${s.label}</span>
            <span class="legend-pct">${s.pct}%</span>
        </div>`;
    }
    legend += '</div>';

    container.innerHTML = svg + legend;
}

// ── Facility Table ──
function renderFacilityTable(container, facilities, agg) {
    let rows = facilities.map(f => `
        <tr>
            <td>${f.name}</td>
            <td>${f.type.replace(/_/g, ' ')}</td>
            <td>${Math.round(f.area).toLocaleString()} m²</td>
            <td>${(f.scope1Total / 1000).toFixed(2)}</td>
            <td>${(f.scope2Total / 1000).toFixed(2)}</td>
            <td><strong>${((f.scope1Total + f.scope2Total) / 1000).toFixed(2)}</strong></td>
        </tr>
    `).join('');

    rows += `
        <tr class="total-row">
            <td colspan="3"><strong>Total</strong></td>
            <td><strong>${(agg.scope1Total / 1000).toFixed(2)}</strong></td>
            <td><strong>${(agg.scope2Total / 1000).toFixed(2)}</strong></td>
            <td><strong>${(agg.grandTotal / 1000).toFixed(2)}</strong></td>
        </tr>
    `;

    container.innerHTML = `
        <table class="facility-table">
            <thead>
                <tr>
                    <th>Name</th><th>Type</th><th>Area</th>
                    <th>Scope 1</th><th>Scope 2</th><th>Total (tCO2e)</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// ── Benchmark Comparison Bars ──
function renderBenchmarkBars(container, facilities) {
    let html = '';

    for (const f of facilities) {
        const totalEmissions = f.scope1Total + f.scope2Total;
        const bench = getBenchmarkComparison(totalEmissions, f.area, f.type, f.climateZone);

        const maxVal = Math.max(bench.emissionsPerM2, bench.avgEmissionsPerM2) * 1.3;
        const yourPct = (bench.emissionsPerM2 / maxVal) * 100;
        const avgPct = (bench.avgEmissionsPerM2 / maxVal) * 100;
        const goodPct = (bench.goodPracticePerM2 / maxVal) * 100;

        const diffText = bench.percentDiff > 0
            ? `${bench.percentDiff.toFixed(0)}% above average`
            : `${Math.abs(bench.percentDiff).toFixed(0)}% below average`;
        const diffClass = bench.percentDiff > 0 ? 'above' : 'below';

        html += `
            <div class="benchmark-facility">
                <h4>${f.name}</h4>
                <div class="bench-bar-group">
                    <div class="bench-bar-row">
                        <span class="bench-label">Your estimate</span>
                        <div class="bench-bar-track">
                            <div class="bench-bar yours" style="width:${yourPct}%"></div>
                        </div>
                        <span class="bench-value">${bench.emissionsPerM2.toFixed(0)} kgCO2e/m²</span>
                    </div>
                    <div class="bench-bar-row">
                        <span class="bench-label">Average</span>
                        <div class="bench-bar-track">
                            <div class="bench-bar average" style="width:${avgPct}%"></div>
                        </div>
                        <span class="bench-value">${bench.avgEmissionsPerM2.toFixed(0)} kgCO2e/m²</span>
                    </div>
                    <div class="bench-bar-row">
                        <span class="bench-label">Good practice</span>
                        <div class="bench-bar-track">
                            <div class="bench-bar good" style="width:${goodPct}%"></div>
                        </div>
                        <span class="bench-value">${bench.goodPracticePerM2.toFixed(0)} kgCO2e/m²</span>
                    </div>
                </div>
                <p class="bench-diff ${diffClass}">${diffText}</p>
            </div>
        `;
    }

    container.innerHTML = html;
}

// ── Assumptions Panel ──
function renderAssumptions(container, facilities, data) {
    let html = '';
    for (const f of facilities) {
        html += `
            <div class="assumption-facility">
                <h4>${f.name}</h4>
                <table class="assumptions-table">
                    <tr><td>Climate zone</td><td>ASHRAE ${f.climateZone}</td></tr>
                    <tr><td>EUI used</td><td>${f.euiUsed} kWh/m²/yr</td></tr>
                    <tr><td>Grid emission factor</td><td>${f.gridEFUsed} kgCO2e/kWh</td></tr>
                    <tr><td>Estimated electricity</td><td>${Math.round(f.estimatedElectricity).toLocaleString()} kWh/yr</td></tr>
                    ${f.scope1Breakdown.map(item => `
                        <tr>
                            <td>${item.equipment.replace(/_/g, ' ')}</td>
                            <td>${Math.round(item.estimatedFuelUse).toLocaleString()} ${item.fuelUnit}/yr (${item.fuelType.replace(/_/g, ' ')})</td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
    }
    container.innerHTML = html;
}

// ── CSV Export ──
function exportCSV(facilities, agg) {
    let csv = 'Facility,Type,Area (m2),Scope 1 (tCO2e),Scope 2 (tCO2e),Total (tCO2e)\n';
    for (const f of facilities) {
        csv += `"${f.name}","${f.type}",${Math.round(f.area)},${(f.scope1Total/1000).toFixed(2)},${(f.scope2Total/1000).toFixed(2)},${((f.scope1Total+f.scope2Total)/1000).toFixed(2)}\n`;
    }
    csv += `"TOTAL","",""," ${(agg.scope1Total/1000).toFixed(2)}",${(agg.scope2Total/1000).toFixed(2)},${(agg.grandTotal/1000).toFixed(2)}\n`;

    csv += '\nDetailed Breakdown\n';
    csv += 'Facility,Source,Fuel Type,Estimated Usage,Unit,Emissions (kgCO2e)\n';
    for (const f of facilities) {
        csv += `"${f.name}","Electricity","electricity",${Math.round(f.estimatedElectricity)},"kWh",${f.scope2Total.toFixed(2)}\n`;
        for (const item of f.scope1Breakdown) {
            csv += `"${f.name}","${item.equipment}","${item.fuelType}",${Math.round(item.estimatedFuelUse)},"${item.fuelUnit}",${item.emissions.toFixed(2)}\n`;
        }
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carbon-emissions-estimate.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// ── PDF Export (via browser print) ──
function exportPDF() {
    window.print();
}
```

- [ ] **Step 2: Verify dashboard renders after completing the wizard**

```bash
# Open http://localhost:8080/
# Complete all 5 wizard steps (country, facility, equipment, review, view results)
# Expected: Dashboard shows headline number, donut chart, benchmark bars, assumptions panel
# Click "Download CSV" — should download a CSV file
```

- [ ] **Step 3: Commit**

```bash
git add js/dashboard.js
git commit -m "feat: implement results dashboard with donut chart, benchmarks, and CSV/PDF export"
```

---

### Task 9: Complete Styling

**Files:**
- Modify: `css/styles.css`

- [ ] **Step 1: Replace styles.css with full styling**

Replace `css/styles.css`:

```css
/* ── Reset & Base ── */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a2e;
    background: #f8f9fa;
    min-height: 100vh;
    line-height: 1.5;
}

/* ── Layout ── */
#app {
    display: grid;
    grid-template-columns: 40% 60%;
    min-height: 100vh;
}

#wizard-panel {
    padding: 1.5rem 2rem 2rem;
    background: #ffffff;
    overflow-y: auto;
    max-height: 100vh;
    border-right: 1px solid #e5e5ea;
}

#visual-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f0f2f5, #e8ecf1);
    position: sticky;
    top: 0;
    height: 100vh;
    padding: 2rem;
}

#dashboard {
    grid-column: 1 / -1;
}

.hidden {
    display: none !important;
}

/* ── Progress Bar ── */
.progress-bar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e5ea;
}

.progress-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    opacity: 0.4;
    transition: opacity 0.3s;
}

.progress-step.active,
.progress-step.completed {
    opacity: 1;
}

.step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #e5e5ea;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.3s;
}

.progress-step.active .step-num {
    background: #5B8DEF;
    color: #fff;
}

.progress-step.completed .step-num {
    background: #34C759;
    color: #fff;
}

.step-label {
    font-size: 11px;
    color: #8e8e93;
}

/* ── Wizard Steps ── */
h2 {
    font-size: 1.4rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.step-desc {
    color: #8e8e93;
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
}

label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    color: #636366;
    margin-bottom: 0.35rem;
    margin-top: 1rem;
}

select, input[type="text"], input[type="number"] {
    width: 100%;
    padding: 0.7rem 0.85rem;
    border: 1.5px solid #d1d1d6;
    border-radius: 8px;
    font-size: 0.95rem;
    background: #fff;
    color: #1a1a2e;
    transition: border-color 0.2s;
    appearance: none;
}

select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%238e8e93' stroke-width='1.5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.75rem center;
    padding-right: 2rem;
}

select:focus, input:focus {
    outline: none;
    border-color: #5B8DEF;
    box-shadow: 0 0 0 3px #5B8DEF22;
}

.area-input-row {
    display: flex;
    gap: 0.75rem;
    align-items: center;
}

.area-input-row input {
    flex: 1;
}

/* ── Buttons ── */
.btn-primary {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: #5B8DEF;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s, transform 0.1s;
    margin-top: 1.5rem;
}

.btn-primary:hover:not(:disabled) {
    background: #4A7BD4;
    transform: translateY(-1px);
}

.btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.btn-secondary {
    display: inline-block;
    padding: 0.65rem 1.25rem;
    background: #f2f2f7;
    color: #1a1a2e;
    border: 1.5px solid #d1d1d6;
    border-radius: 8px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-secondary:hover {
    background: #e5e5ea;
}

.btn-text {
    background: none;
    border: none;
    color: #5B8DEF;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0.25rem 0;
}

.btn-text:hover {
    text-decoration: underline;
}

.step-buttons {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
}

/* ── Equipment List ── */
.equipment-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.equipment-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border: 1.5px solid #e5e5ea;
    border-radius: 10px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    margin-top: 0;
}

.equipment-item:hover {
    border-color: #5B8DEF;
    background: #5B8DEF08;
}

.equipment-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.eq-info {
    display: flex;
    flex-direction: column;
}

.eq-info strong {
    font-size: 0.9rem;
}

.eq-info span {
    font-size: 0.78rem;
    color: #8e8e93;
}

.fleet-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e5ea;
}

.fleet-section h3 {
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
}

.fleet-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
}

.fleet-row label {
    width: 60px;
    margin: 0;
    font-weight: 500;
}

.fleet-row input {
    width: 80px;
    text-align: center;
}

/* ── Review Step ── */
.review-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5rem 0 1rem;
}

.review-table td, .review-table th {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #e5e5ea;
    font-size: 0.85rem;
}

.review-table th {
    text-align: left;
    color: #8e8e93;
    font-weight: 500;
}

.override-input {
    width: 90px !important;
    padding: 0.35rem 0.5rem !important;
    font-size: 0.85rem !important;
    display: inline;
}

.review-total {
    background: #f2f2f7;
    padding: 1rem;
    border-radius: 10px;
    text-align: center;
}

.review-note {
    font-size: 0.8rem;
    color: #8e8e93;
    margin-top: 0.5rem;
}

.no-scope1 {
    color: #8e8e93;
    font-size: 0.9rem;
    font-style: italic;
}

.review-section {
    margin-bottom: 1rem;
}

.review-section h3 {
    font-size: 0.95rem;
    margin-bottom: 0.25rem;
}

/* ── Step 5 ── */
.step5-actions {
    display: flex;
    gap: 0.75rem;
    margin: 1.5rem 0;
}

/* ── Dashboard ── */
.dashboard-wrapper {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
}

.dash-header {
    margin-bottom: 1.5rem;
}

.dash-header h1 {
    font-size: 1.5rem;
    font-weight: 600;
}

.dash-headline {
    text-align: center;
    padding: 2rem;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 1px 4px #00000010;
    margin-bottom: 1.5rem;
}

.headline-number {
    font-size: 3.5rem;
    font-weight: 700;
    color: #1a1a2e;
    line-height: 1;
}

.headline-unit {
    font-size: 1rem;
    color: #8e8e93;
    margin-top: 0.25rem;
}

.headline-badges {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1rem;
}

.badge {
    padding: 0.35rem 0.85rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 500;
}

.badge.scope1 {
    background: #FFF3E0;
    color: #E65100;
}

.badge.scope2 {
    background: #E3F2FD;
    color: #1565C0;
}

.dash-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.dash-card {
    background: #fff;
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 1px 4px #00000010;
}

.dash-card h3 {
    font-size: 0.95rem;
    margin-bottom: 0.75rem;
    color: #636366;
}

/* ── Donut Chart ── */
.donut-legend {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-top: 0.75rem;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
}

.legend-color {
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
}

.legend-pct {
    margin-left: auto;
    color: #8e8e93;
}

/* ── Facility Table ── */
.facility-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
}

.facility-table th, .facility-table td {
    padding: 0.5rem;
    text-align: left;
    border-bottom: 1px solid #e5e5ea;
}

.facility-table th {
    color: #8e8e93;
    font-weight: 500;
}

.total-row {
    background: #f2f2f7;
}

/* ── Benchmark Bars ── */
.benchmark-facility {
    margin-bottom: 1.25rem;
}

.benchmark-facility h4 {
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
}

.bench-bar-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.bench-bar-row {
    display: grid;
    grid-template-columns: 90px 1fr 100px;
    align-items: center;
    gap: 0.5rem;
}

.bench-label {
    font-size: 0.75rem;
    color: #8e8e93;
}

.bench-bar-track {
    height: 14px;
    background: #f2f2f7;
    border-radius: 7px;
    overflow: hidden;
}

.bench-bar {
    height: 100%;
    border-radius: 7px;
    transition: width 0.6s ease;
}

.bench-bar.yours { background: #5B8DEF; }
.bench-bar.average { background: #F5A623; }
.bench-bar.good { background: #34C759; }

.bench-value {
    font-size: 0.75rem;
    color: #636366;
    text-align: right;
}

.bench-diff {
    font-size: 0.8rem;
    margin-top: 0.35rem;
    font-weight: 500;
}

.bench-diff.above { color: #FF3B30; }
.bench-diff.below { color: #34C759; }

/* ── Assumptions Panel ── */
.collapsible-header {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.toggle-icon {
    font-size: 1.2rem;
    color: #8e8e93;
}

.collapsed-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
}

.collapsed-content.expanded {
    max-height: 1000px;
}

.assumptions-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5rem 0;
}

.assumptions-table td {
    padding: 0.4rem 0.5rem;
    border-bottom: 1px solid #f2f2f7;
    font-size: 0.8rem;
}

.assumption-facility {
    margin-bottom: 1rem;
}

.assumption-facility h4 {
    font-size: 0.85rem;
    margin-bottom: 0.25rem;
}

/* ── Export ── */
.dash-export {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    padding: 1rem 0;
}

/* ── Error ── */
.error {
    color: #FF3B30;
    padding: 2rem;
    text-align: center;
}

/* ── Custom EUI ── */
#custom-eui-section {
    margin-top: 0.75rem;
}

#eui-input-wrap {
    margin-top: 0.5rem;
}

/* ── Responsive ── */
@media (max-width: 768px) {
    #app {
        grid-template-columns: 1fr;
    }

    #visual-panel {
        position: relative;
        height: 280px;
    }

    #wizard-panel {
        max-height: none;
        border-right: none;
        border-bottom: 1px solid #e5e5ea;
    }

    .dash-grid {
        grid-template-columns: 1fr;
    }

    .bench-bar-row {
        grid-template-columns: 70px 1fr 80px;
    }
}

/* ── Print styles for PDF export ── */
@media print {
    #wizard-panel, #visual-panel, .btn-primary, .btn-secondary, .btn-text, .dash-export {
        display: none !important;
    }

    #dashboard {
        display: block !important;
    }

    .dashboard-wrapper {
        padding: 0;
    }

    .dash-card {
        box-shadow: none;
        border: 1px solid #e5e5ea;
        break-inside: avoid;
    }

    .collapsed-content {
        max-height: none !important;
    }
}
```

- [ ] **Step 2: Verify full styling in browser**

```bash
# Open http://localhost:8080/
# Expected: Clean, minimal UI with proper spacing, borders, colors
# Walk through all 5 steps to verify each renders correctly
# Resize to <768px to verify responsive stacking
```

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: implement full responsive styling for wizard, dashboard, and print"
```

---

### Task 10: Integration Testing & Polish

**Files:**
- Modify: `index.html` (minor adjustments if needed)

- [ ] **Step 1: Run the complete flow end-to-end**

```bash
# Open http://localhost:8080/
# Test case 1: India, Maharashtra, Office, 500 m2, heating boiler + generator
#   Expected: Scope 2 ~ 500 * 180 * 0.82 = 73,800 kgCO2e (73.8 tCO2e)
#   Expected: Boiler ~ 500 * 0.5 * 2.02 * 1.0 = 505 kgCO2e (zone 1, minimal heating)
#   Expected: Generator ~ 500 * 1.2 * 2.68 = 1,608 kgCO2e
#   Expected: Total ~ 75.9 tCO2e

# Test case 2: US, California, Warehouse, 2000 sq ft (186 m2), 3 fleet trucks
#   Expected: Scope 2 ~ 186 * 50 * 0.225 = 2,093 kgCO2e (zone 3 warehouse)
#   Expected: Fleet trucks ~ 3 * 50000 * 0.25 * 2.68 = 100,500 kgCO2e
#   Expected: Total ~ 102.6 tCO2e

# Test case 3: Add both facilities above, verify aggregation in dashboard
```

- [ ] **Step 2: Verify donut chart, benchmark bars, and CSV export with multi-facility data**

```bash
# On the dashboard after adding both facilities:
# Expected: Donut shows electricity + diesel + fleet as segments
# Expected: Facility table shows 2 rows + total
# Expected: Benchmark bars show each facility vs average
# Click "Download CSV" → verify CSV has both facilities and breakdown
```

- [ ] **Step 3: Run calculator unit tests**

```bash
# Open http://localhost:8080/tests/test.html
# Expected: All tests pass (16 passed, 0 failed)
```

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration testing polish and adjustments"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Web app, HTML/JS | Task 1 (scaffolding) |
| G20 countries with regional breakdown | Task 2 (countries.json, climate-zones.json) |
| Country-specific grid EFs | Task 3 (emission-factors.json) |
| IPCC fuel EFs with country variation | Task 3 (fuel-factors.json) |
| EUI benchmarks by facility x climate zone | Task 4 (eui-benchmarks.json) |
| Equipment fuel consumption benchmarks | Task 4 (equipment-profiles.json) |
| Scope 2 calculation | Task 5 (calculator.js) |
| Scope 1 equipment calculation | Task 5 (calculator.js) |
| Fleet vehicle calculation | Task 5 (calculator.js) |
| Multi-facility aggregation | Task 5 (calculator.js) |
| Benchmark comparison | Task 5 (calculator.js) |
| 5-step wizard with state machine | Task 6 (app.js) |
| Country → region → climate zone lookups | Task 6 (app.js getLookups) |
| Unit toggle (metric/imperial) | Task 6 (app.js) |
| Custom EUI override | Task 6 (app.js Step 2) |
| User-editable assumptions (Step 4) | Task 6 (app.js renderStep4Content) |
| Isometric SVG buildings (10 types) | Task 7 (visualizer.js) |
| Equipment overlay with animations | Task 7 (visualizer.js) |
| Summary dashboard with headline number | Task 8 (dashboard.js) |
| Donut chart by source | Task 8 (dashboard.js) |
| Per-facility table | Task 8 (dashboard.js) |
| Benchmark comparison bars | Task 8 (dashboard.js) |
| Collapsible assumptions panel | Task 8 (dashboard.js) |
| CSV export | Task 8 (dashboard.js) |
| PDF export via print | Task 8 (dashboard.js) |
| Responsive layout | Task 9 (styles.css) |
| Two-panel layout (40/60) | Task 9 (styles.css) |
| Clean, minimal aesthetic | Task 9 (styles.css) |
| No build step, fully offline | All tasks (ES modules, static JSON) |
| No framework, no charting library | All tasks |
