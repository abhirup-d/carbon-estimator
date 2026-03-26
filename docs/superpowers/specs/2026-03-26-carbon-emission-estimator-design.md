# Carbon Emission Estimator — Design Spec

## Overview

A fully offline, single-page web application that estimates Scope 1 and Scope 2 carbon emissions for any facility (office, warehouse, manufacturing unit, shop, etc.) without requiring actual electricity or fuel consumption data. Instead, it uses static facility characteristics — type, area, location, and on-site equipment — combined with country-specific benchmarks and emission factors to produce an accurate estimate.

**Target users:** General public and SMEs who want a quick carbon footprint estimate without hunting for utility bills.

**Core principle:** Only ask questions a person can answer from memory. Area, building type, and equipment are stable facts. Monthly consumption data is not.

## User Flow

A 5-step wizard with a persistent isometric building visualization:

### Step 1 — Location
- Country dropdown (G20 nations)
- Region/state dropdown (for countries with regional grid EFs: India by state, US by eGRID subregion, etc.)
- Determines: grid emission factor, ASHRAE climate zone, default fuel mix, EUI benchmarks, unit system

### Step 2 — Facility Details
- Facility name (free text, for labeling in multi-facility view)
- Facility type dropdown: Office, Retail/Shop, Warehouse, Light Manufacturing, Heavy Manufacturing, Restaurant, Hospital/Clinic, Hotel, Residential, School/University
- Custom EUI override (hidden by default, expandable for advanced users)
- Floor area (number input) + unit toggle (sq ft / sq m)

### Step 3 — On-Site Equipment (Scope 1)
Checkboxes for equipment present on-site:
- **Heating boiler** → infers natural gas or fuel oil (based on country defaults)
- **Backup generator** → infers diesel
- **Cooking equipment** → infers LPG or natural gas
- **Industrial furnace/kiln** → infers natural gas or fuel oil
- **Company fleet vehicles** → asks count + type (car / van / truck)

Each checked item uses benchmark consumption rates per unit area (or per vehicle) adjusted by climate zone. No consumption numbers asked.

### Step 4 — Review & Adjust
- Shows all assumptions: estimated kWh/year, estimated fuel volumes, EFs being used
- User can override any value inline (user-editable config)
- "Looks good" button to proceed

### Step 5 — Add Another or View Results
- "Add another facility" loops back to Step 2 (retains location from Step 1)
- "View results" goes to the dashboard

## UI Layout & Visual Design

### Two-Panel Layout
- **Left panel (40%)** — Wizard form. One step at a time. Large inputs, clear labels, no clutter.
- **Right panel (60%)** — Isometric building visualization. Updates in real-time.

### Isometric Building Visualization
The right panel shows an isometric SVG that reacts to user selections:

- **Facility type selected** → building shape changes (office = glass tower, warehouse = wide low box, shop = storefront, etc.). 10 base building SVGs.
- **Area entered** → building scales proportionally
- **Equipment checked** → equipment icons animate into position:
  - Boiler → appears inside with subtle steam animation
  - Generator → appears beside the building
  - Cooking equipment → chimney/vent on roof
  - Furnace → glowing element visible through wall
  - Fleet vehicles → vehicles in parking area beside building

### Aesthetic
Clean, minimal, white/light background, soft shadows, muted color palette. A "calm calculator" — no visual noise.

### Responsive
On mobile (<768px), panels stack vertically — form on top, building below. Building scales down.

## Data Architecture

All data bundled as static JSON files. Total target: under 200KB combined.

### `data/countries.json`
Country metadata: name, default unit system (metric/imperial), default fuel mix, regions list.

### `data/climate-zones.json`
Maps each G20 country and major regions to ASHRAE climate zones 1-8.

### `data/emission-factors.json`
Country-specific grid emission factors (kgCO2e/kWh). Regional breakdown where significant (India by state, US by eGRID subregion). Sources: IEA 2023/2024, CEA (India), EPA eGRID (US).

### `data/fuel-factors.json`
Fuel emission factors (kgCO2e per unit): natural gas (per m3), diesel (per litre), LPG (per kg), fuel oil (per litre). Country-specific where composition varies, otherwise IPCC defaults.

### `data/eui-benchmarks.json`
Energy Use Intensity by facility type x climate zone. Structure: `{ facilityType -> { climateZone -> { electricity: kWh/m2/yr, heating: kWh/m2/yr } } }`. Sources: CBECS (US), CIBSE (UK), BEE (India), extrapolated for other G20.

### `data/equipment-profiles.json`
Fuel consumption benchmarks per equipment type. Per unit area or per unit count, adjusted by climate zone. Example: heating boiler in climate zone 6 → X m3 natural gas per m2 per year. Fleet vehicles: average annual km x fuel efficiency by vehicle type x fuel EF.

## Calculation Engine

All calculations in a single `calculator.js` module, client-side.

### Scope 2 — Grid Electricity

```
estimatedElectricity (kWh/yr) = facilityArea (m2) x EUI (kWh/m2/yr)
scope2Emissions (kgCO2e) = estimatedElectricity x gridEF (kgCO2e/kWh)
```

- EUI looked up by `facilityType x climateZone`
- Climate zone looked up by `country x region`
- Custom EUI used if provided by user

### Scope 1 — On-Site Fuel Combustion

For each checked equipment type:

```
estimatedFuelUse = equipmentBenchmark x facilityArea (or unitCount for vehicles)
scope1Emissions (kgCO2e) = estimatedFuelUse x fuelEF (kgCO2e/unit)
```

- Benchmark looked up by `equipmentType x climateZone x facilityType`
- Climate zone adjusts heating equipment (more in zones 6-8, less in 1-2)
- Fuel type inferred from equipment + country defaults (e.g., India cooking → LPG, US cooking → natural gas)

### Fleet Vehicles (special case)

```
vehicleEmissions = count x avgAnnualKm x fuelConsumption(L/km) x fuelEF
```

- `avgAnnualKm` varies by country (India ~15,000 km, US ~20,000 km)
- `fuelConsumption` by vehicle type: car ~0.08 L/km, van ~0.12, truck ~0.25

### Multi-Facility Aggregation

Each facility produces:
```
{ name, type, area, scope1Total, scope2Total, breakdown: [...sources] }
```
Dashboard sums all facilities for combined totals.

### Benchmark Comparison

Compares estimated emissions to:
- Average for that facility type and size in the same country
- Good practice benchmark (25th percentile)

Output: "Your office emits roughly X tCO2e/year, which is Y% above/below average for offices of this size in your country."

## Output Dashboard

### Top Bar — Headline Number
Total estimated emissions in tCO2e/year (large, prominent). Scope 1 | Scope 2 split as colored badges.

### Donut Chart
SVG donut (no library) showing proportional split by source:
- Electricity (Scope 2) — blue
- Natural gas — orange
- Diesel — grey
- LPG — yellow
- Fleet — green

Hover/tap shows exact value + percentage.

### Per-Facility Table (if multi-facility)
Each facility as a row: Name, Type, Area, Scope 1, Scope 2, Total. Sortable columns. Total row at bottom.

### Benchmark Comparison Bar
Horizontal bar: your estimate vs. country average vs. good practice. "You are here" marker.

### Assumptions Panel (collapsible)
Lists every assumption: EUI, grid EF, fuel EFs, equipment benchmarks, climate zone. Each value editable — changes recalculate instantly. This is the power-user config surface.

### Export
- "Download as PDF" — browser print/CSS
- "Download as CSV" — raw data export

## File Structure

```
Estimator/
├── index.html              — Single entry point, wizard + dashboard
├── css/
│   └── styles.css          — All styling, responsive design
├── js/
│   ├── app.js              — Main app controller, wizard state machine
│   ├── calculator.js       — All emission calculation logic
│   ├── visualizer.js       — Isometric SVG building renderer
│   └── dashboard.js        — Results page, charts, export
├── data/
│   ├── countries.json      — Country metadata + regions
│   ├── climate-zones.json  — Country/region → ASHRAE zone mapping
│   ├── emission-factors.json — Grid EFs by country/region
│   ├── fuel-factors.json   — Fuel EFs by type and country
│   ├── eui-benchmarks.json — Energy intensity by facility x climate
│   └── equipment-profiles.json — Fuel benchmarks per equipment type
└── svg/
    ├── buildings/          — 10 isometric building SVGs (one per type)
    └── equipment/          — Equipment SVG icons (boiler, generator, etc.)
```

## Technical Decisions

- **No build step.** Open `index.html` in a browser and it works. ES modules via `<script type="module">`.
- **No framework.** Vanilla JS. Wizard is a state machine — each step is a `<section>` that shows/hides.
- **No charting library.** SVG donut and bar charts hand-drawn.
- **SVG composition.** Buildings are base SVGs. Equipment layered on top via absolute positioning. `visualizer.js` handles placement coordinates per building type.
- **Unit handling.** All internal calculations in metric (m2, kWh, litres). Imperial inputs converted on entry, converted back for display if user's country defaults to imperial.
- **State management.** Single `appState` object holds all facilities, current step, and user overrides. Dashboard reads from this directly.
- **Fully offline.** All data bundled. No API calls. No CDN dependencies.

## Countries Supported (G20)

Argentina, Australia, Brazil, Canada, China, France, Germany, India, Indonesia, Italy, Japan, Mexico, Russia, Saudi Arabia, South Africa, South Korea, Turkey, United Kingdom, United States. (EU member states France, Germany, and Italy are covered individually — no aggregate EU entry, since grid EFs vary by nation.)

## Data Sources

| Data | Primary Source | Fallback |
|------|---------------|----------|
| Grid EFs | IEA 2023, CEA (India), EPA eGRID (US) | IPCC defaults |
| Fuel EFs | IPCC 2006 Guidelines | Country-specific agencies |
| EUI benchmarks | CBECS, CIBSE, BEE | ASHRAE 90.1 baselines |
| Climate zones | ASHRAE Standard 169 | Country-level averages |
| Vehicle data | IEA Transport, country transport agencies | Global averages |

## Scope

**In scope (v1):**
- Scope 1 (on-site fuel combustion) and Scope 2 (grid electricity)
- G20 countries with regional breakdown
- 10 facility types with custom EUI option
- 5 equipment types including fleet vehicles
- Multi-facility aggregation
- Isometric SVG visualization
- PDF and CSV export

**Out of scope (v1):**
- Scope 3 (supply chain, commuting, etc.)
- Real-time API data
- User accounts or data persistence (browser session only)
- Countries outside G20
