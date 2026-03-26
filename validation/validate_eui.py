#!/usr/bin/env python3
"""
Validate and compute EUI benchmarks from CBECS 2018 microdata.

CBECS = Commercial Buildings Energy Consumption Survey (US EIA)
6,436 buildings surveyed, representing 5.9 million US commercial buildings.

Key variables:
  PBA      - Principal Building Activity (type code)
  PUBCLIM  - Building America climate zone (1-5)
  SQFT     - Square footage
  ELCNS    - Electricity consumption (kWh)
  NGCNS    - Natural gas consumption (therms)
  FINALWT  - Survey weight (how many buildings this record represents)

Output: weighted median, p10, p25, p75, p90 EUI by building type.
"""

import csv
import sys
from collections import defaultdict

# CBECS PBA codes → our facility types
PBA_MAP = {
    '2':  'office',         # Office
    '6':  'retail',         # Mercantile (Retail other than mall)
    '7':  'retail',         # Mercantile (Enclosed and strip malls)
    '14': 'warehouse',      # Warehouse and storage
    '15': 'warehouse',      # Warehouse and storage (refrigerated)
    '9':  'light_manufacturing', # Service (catch-all for light industrial)
    '8':  'restaurant',     # Food service
    '16': 'hospital',       # Health care (Inpatient)
    '17': 'hospital',       # Health care (Outpatient)
    '18': 'hotel',          # Lodging
    '12': 'school',         # Education
    '13': 'school',         # Education (college/university)
    '5':  'retail',         # Food sales (grocery)
}

# CBECS PUBCLIM codes → ASHRAE-approximate climate zone
# CBECS uses Building America zones: 1=Very Cold/Cold, 2=Mixed-Humid,
# 3=Hot-Humid, 4=Hot-Dry/Mixed-Dry, 5=Marine
# Map to our 1-8 system approximately:
CLIMATE_MAP = {
    '1': '6',  # Very Cold/Cold → zone 6
    '2': '4',  # Mixed-Humid → zone 4
    '3': '2',  # Hot-Humid → zone 2
    '4': '2',  # Hot-Dry/Mixed-Dry → zone 2
    '5': '4',  # Marine → zone 4
}

SQM_PER_SQFT = 0.092903
KWH_PER_THERM = 29.3001  # 1 therm = 29.3 kWh

def weighted_percentile(data_weights, percentile):
    """Compute weighted percentile from list of (value, weight) tuples."""
    sorted_data = sorted(data_weights, key=lambda x: x[0])
    total_weight = sum(w for _, w in sorted_data)
    target = total_weight * percentile / 100.0
    cumulative = 0
    for value, weight in sorted_data:
        cumulative += weight
        if cumulative >= target:
            return value
    return sorted_data[-1][0] if sorted_data else 0

def main():
    # Read CBECS data
    buildings = []
    with open('cbecs2018.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pba = row.get('PBA', '').strip().strip('"')
            if pba not in PBA_MAP:
                continue

            sqft = row.get('SQFT', '').strip().strip('"')
            elcns = row.get('ELCNS', '').strip().strip('"')
            ngcns = row.get('NGCNS', '').strip().strip('"')
            pubclim = row.get('PUBCLIM', '').strip().strip('"')
            finalwt = row.get('FINALWT', '').strip().strip('"')

            # Skip if missing critical data
            if not sqft or not elcns or not finalwt:
                continue
            try:
                sqft_val = float(sqft)
                elcns_val = float(elcns)
                ngcns_val = float(ngcns) if ngcns else 0
                weight = float(finalwt)
            except ValueError:
                continue

            if sqft_val <= 0 or weight <= 0:
                continue

            facility_type = PBA_MAP[pba]
            climate_zone = CLIMATE_MAP.get(pubclim, '4')

            # EUI in kWh/m2/yr
            area_m2 = sqft_val * SQM_PER_SQFT
            elec_eui = elcns_val / area_m2  # kWh/m2/yr
            # Natural gas: convert therms to kWh-equivalent for total energy
            ng_kwh_equiv = ngcns_val * KWH_PER_THERM
            total_eui = (elcns_val + ng_kwh_equiv) / area_m2

            buildings.append({
                'type': facility_type,
                'zone': climate_zone,
                'elec_eui': elec_eui,
                'total_eui': total_eui,
                'ng_eui': ng_kwh_equiv / area_m2,
                'weight': weight,
                'sqft': sqft_val,
            })

    print(f"Loaded {len(buildings)} buildings from CBECS 2018\n")

    # Group by facility type
    by_type = defaultdict(list)
    for b in buildings:
        by_type[b['type']].append(b)

    # Compute weighted statistics
    print("=" * 100)
    print(f"{'Type':<22} {'N':>5} {'Elec EUI (kWh/m2/yr)':>45}    {'Our Value':>10}  {'Diff':>6}")
    print(f"{'':22} {'':>5} {'P10':>8} {'P25':>8} {'Median':>8} {'P75':>8} {'P90':>8}    {'':>10}  {'':>6}")
    print("=" * 100)

    # Our current BASE_ELECTRICAL values
    our_base = {
        'office': 65, 'retail': 75, 'warehouse': 25, 'light_manufacturing': 120,
        'heavy_manufacturing': 250, 'restaurant': 140, 'hospital': 150, 'hotel': 85,
        'residential': 30, 'school': 55
    }

    results = {}

    for ftype in ['office', 'retail', 'warehouse', 'light_manufacturing', 'restaurant', 'hospital', 'hotel', 'school']:
        data = by_type.get(ftype, [])
        if not data:
            continue

        # Electrical EUI only
        elec_data = [(b['elec_eui'], b['weight']) for b in data]
        p10 = weighted_percentile(elec_data, 10)
        p25 = weighted_percentile(elec_data, 25)
        median = weighted_percentile(elec_data, 50)
        p75 = weighted_percentile(elec_data, 75)
        p90 = weighted_percentile(elec_data, 90)

        our_val = our_base.get(ftype, 0)
        diff_pct = ((our_val - median) / median * 100) if median > 0 else 0

        print(f"{ftype:<22} {len(data):>5} {p10:>8.1f} {p25:>8.1f} {median:>8.1f} {p75:>8.1f} {p90:>8.1f}    {our_val:>10}  {diff_pct:>+5.0f}%")

        results[ftype] = {
            'n': len(data),
            'p10': round(p10, 1),
            'p25': round(p25, 1),
            'median': round(median, 1),
            'p75': round(p75, 1),
            'p90': round(p90, 1),
        }

    print("=" * 100)
    print()

    # Also compute by climate zone for the biggest category (office)
    print("OFFICE EUI by climate zone:")
    print("-" * 80)
    office_by_zone = defaultdict(list)
    for b in by_type.get('office', []):
        office_by_zone[b['zone']].append(b)

    for zone in sorted(office_by_zone.keys()):
        data = office_by_zone[zone]
        elec_data = [(b['elec_eui'], b['weight']) for b in data]
        median = weighted_percentile(elec_data, 50)
        p25 = weighted_percentile(elec_data, 25)
        p75 = weighted_percentile(elec_data, 75)
        print(f"  Zone {zone}: N={len(data):>4}, Median={median:.1f}, P25={p25:.1f}, P75={p75:.1f} kWh/m2/yr")

    print()
    print("COOLING COEFFICIENT validation (offices in hot vs cold zones):")
    hot_offices = [b for b in by_type.get('office', []) if b['zone'] in ('1', '2')]
    cold_offices = [b for b in by_type.get('office', []) if b['zone'] in ('5', '6')]
    if hot_offices and cold_offices:
        hot_median = weighted_percentile([(b['elec_eui'], b['weight']) for b in hot_offices], 50)
        cold_median = weighted_percentile([(b['elec_eui'], b['weight']) for b in cold_offices], 50)
        print(f"  Hot zones median: {hot_median:.1f} kWh/m2/yr")
        print(f"  Cold zones median: {cold_median:.1f} kWh/m2/yr")
        print(f"  Difference (cooling effect): {hot_median - cold_median:.1f} kWh/m2/yr")

    # Natural gas EUI (for heating benchmarks)
    print()
    print("NATURAL GAS EUI by type (kWh-equiv/m2/yr) — for Scope 1 heating validation:")
    print("-" * 80)
    for ftype in ['office', 'retail', 'warehouse', 'restaurant', 'hospital', 'hotel', 'school']:
        data = by_type.get(ftype, [])
        if not data:
            continue
        ng_data = [(b['ng_eui'], b['weight']) for b in data if b['ng_eui'] > 0]
        if not ng_data:
            continue
        median = weighted_percentile(ng_data, 50)
        p25 = weighted_percentile(ng_data, 25)
        p75 = weighted_percentile(ng_data, 75)
        pct_with_ng = len(ng_data) / len(data) * 100
        print(f"  {ftype:<22} N={len(ng_data):>4} ({pct_with_ng:.0f}% have NG), Median={median:.1f}, P25={p25:.1f}, P75={p75:.1f}")

    # Output JSON-ready values for updating calculator.js
    print()
    print("=" * 100)
    print("RECOMMENDED BASE_ELECTRICAL values (CBECS median, all zones):")
    print("=" * 100)
    for ftype, stats in sorted(results.items()):
        print(f"  {ftype}: {stats['median']:.0f},  // CBECS 2018 median, N={stats['n']}")

    print()
    print("RECOMMENDED UNCERTAINTY factors (P10/median and P90/median):")
    print("=" * 100)
    for ftype, stats in sorted(results.items()):
        low = stats['p10'] / stats['median'] if stats['median'] > 0 else 0.5
        high = stats['p90'] / stats['median'] if stats['median'] > 0 else 1.5
        print(f"  {ftype}: {{ low: {low:.2f}, high: {high:.2f} }},  // CBECS P10={stats['p10']}, P90={stats['p90']}")


if __name__ == '__main__':
    main()
