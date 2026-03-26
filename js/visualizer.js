// Isometric SVG building renderer

const COLORS = {
    office:              { wall: '#5B8DEF', wallDark: '#4A7BD4', roof: '#7BA7F7', window: '#A8D0FF' },
    retail:              { wall: '#F5A623', wallDark: '#D4901E', roof: '#F7BE5F', window: '#FDE8B5' },
    warehouse:           { wall: '#8E8E93', wallDark: '#6D6D72', roof: '#AEAEB2', window: '#C7C7CC' },
    light_manufacturing: { wall: '#34C759', wallDark: '#2AAF4C', roof: '#5DD87B', window: '#B8F0C8' },
    heavy_manufacturing: { wall: '#636366', wallDark: '#48484A', roof: '#8E8E93', window: '#AEAEB2' },
    restaurant:          { wall: '#FF6B6B', wallDark: '#E05555', roof: '#FF9B9B', window: '#FFDADA' },
    hospital:            { wall: '#FFFFFF', wallDark: '#E5E5EA', roof: '#F2F2F7', window: '#D1EAFF' },
    hotel:               { wall: '#AF52DE', wallDark: '#9542C1', roof: '#C77DEB', window: '#E8C8F7' },
    residential:         { wall: '#FFD60A', wallDark: '#D4B108', roof: '#CC7744', window: '#A8D0FF' },
    school:              { wall: '#FF9F0A', wallDark: '#D4850A', roof: '#FFB84D', window: '#A8D0FF' }
};

const BUILDING_CONFIGS = {
    office:              { w: 70, d: 50, h: 100 },
    retail:              { w: 80, d: 40, h: 50 },
    warehouse:           { w: 100, d: 60, h: 45 },
    light_manufacturing: { w: 90, d: 55, h: 55 },
    heavy_manufacturing: { w: 110, d: 70, h: 60 },
    restaurant:          { w: 60, d: 45, h: 40 },
    hospital:            { w: 80, d: 55, h: 80 },
    hotel:               { w: 65, d: 50, h: 110 },
    residential:         { w: 55, d: 40, h: 50 },
    school:              { w: 90, d: 45, h: 45 }
};

const EQUIPMENT_ICONS = {
    heating_boiler: { color: '#FF6B35', position: 'inside' },
    generator:      { color: '#636366', position: 'beside' },
    cooking:        { color: '#FF9F0A', position: 'roof' },
    furnace:        { color: '#FF3B30', position: 'inside-right' },
    fleet_car:      { color: '#5B8DEF', position: 'parking' },
    fleet_van:      { color: '#34C759', position: 'parking' },
    fleet_truck:    { color: '#8E8E93', position: 'parking' }
};

const FACILITY_LABELS = {
    office:              'Office',
    retail:              'Retail',
    warehouse:           'Warehouse',
    light_manufacturing: 'Light Manufacturing',
    heavy_manufacturing: 'Heavy Manufacturing',
    restaurant:          'Restaurant',
    hospital:            'Hospital',
    hotel:               'Hotel',
    residential:         'Residential',
    school:              'School'
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
        el.setAttribute(k, v);
    }
    return el;
}

/**
 * Convert isometric world coords (ix, iy, iz) to SVG screen coords.
 * ix = right-axis, iy = depth-axis, iz = height-axis (up)
 * Standard isometric: screen_x = (ix - iy) * cos(30°), screen_y = (ix + iy) * sin(30°) - iz
 * We use a simplified tile projection where tile width = w and depth = d.
 */
function isoProject(cx, cy, ix, iy, iz) {
    const sx = cx + (ix - iy) * 0.866; // cos(30°)
    const sy = cy + (ix + iy) * 0.5 - iz;
    return { x: sx, y: sy };
}

function pts(points) {
    return points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

/**
 * Draw an isometric box (3 visible faces: top, left-dark, right-light).
 * ox, oy, oz = origin corner (bottom-front-left in iso world)
 * w = width (right direction), d = depth (back direction), h = height (up)
 */
function drawIsoBox(svg, cx, cy, ox, oy, oz, w, d, h, colors) {
    // The 8 corners of the box in iso world coords (x-right, y-depth, z-up)
    // We need: bottom face + top face
    // Visible faces for standard isometric (viewer from front-right-above):
    //   Top face: (ox,oy,oz+h), (ox+w,oy,oz+h), (ox+w,oy+d,oz+h), (ox,oy+d,oz+h)
    //   Right face (wall): (ox+w,oy,oz), (ox+w,oy+d,oz), (ox+w,oy+d,oz+h), (ox+w,oy,oz+h)
    //   Left face (wallDark): (ox,oy+d,oz), (ox+w,oy+d,oz), (ox+w,oy+d,oz+h), (ox,oy+d,oz+h)

    const p = (ix, iy, iz) => isoProject(cx, cy, ox + ix, oy + iy, oz + iz);

    // Top face (roof)
    const top = [p(0,0,h), p(w,0,h), p(w,d,h), p(0,d,h)];
    const polyTop = svgEl('polygon', { points: pts(top), fill: colors.roof, stroke: colors.wallDark, 'stroke-width': '0.5' });
    svg.appendChild(polyTop);

    // Right face (lighter wall — facing viewer's right)
    const right = [p(w,0,0), p(w,d,0), p(w,d,h), p(w,0,h)];
    const polyRight = svgEl('polygon', { points: pts(right), fill: colors.wall, stroke: colors.wallDark, 'stroke-width': '0.5' });
    svg.appendChild(polyRight);

    // Left face (darker wall — facing viewer's left / front)
    const left = [p(0,d,0), p(w,d,0), p(w,d,h), p(0,d,h)];
    const polyLeft = svgEl('polygon', { points: pts(left), fill: colors.wallDark, stroke: colors.wallDark, 'stroke-width': '0.5' });
    svg.appendChild(polyLeft);

    return { p, w, d, h };
}

function addWindows(svg, cx, cy, ox, oy, oz, w, d, h, windowColor) {
    const p = (ix, iy, iz) => isoProject(cx, cy, ox + ix, oy + iy, oz + iz);

    // Windows on right face (wall)
    const winW = w * 0.18;
    const winH = h * 0.12;
    const floors = Math.max(1, Math.floor(h / 22));
    const cols = Math.max(1, Math.floor(w / 22));
    const colSpacing = w / (cols + 1);
    const floorSpacing = h / (floors + 1);

    for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
            const wox = (c + 1) * colSpacing - winW / 2;
            const woz = (f + 1) * floorSpacing - winH / 2;
            const wpts = [p(wox, d, woz), p(wox + winW, d, woz), p(wox + winW, d, woz + winH), p(wox, d, woz + winH)];
            svg.appendChild(svgEl('polygon', { points: pts(wpts), fill: windowColor, opacity: '0.85' }));
        }
    }

    // Windows on left face (wallDark side — fewer cols along depth)
    const dCols = Math.max(1, Math.floor(d / 22));
    const dColSpacing = d / (dCols + 1);
    for (let f = 0; f < floors; f++) {
        for (let c = 0; c < dCols; c++) {
            const woy = (c + 1) * dColSpacing - winW / 2;
            const woz = (f + 1) * floorSpacing - winH / 2;
            const wpts = [p(w, woy, woz), p(w, woy + winW, woz), p(w, woy + winW, woz + winH), p(w, woy, woz + winH)];
            svg.appendChild(svgEl('polygon', { points: pts(wpts), fill: windowColor, opacity: '0.7' }));
        }
    }
}

function addShadow(svg, cx, cy) {
    const shadow = svgEl('ellipse', {
        cx: cx.toFixed(2),
        cy: cy.toFixed(2),
        rx: '90',
        ry: '28',
        fill: 'rgba(0,0,0,0.12)',
        filter: 'blur(4px)'
    });
    svg.appendChild(shadow);
}

function addBoilerAnimations(svg, bx, by) {
    // 3 steam circles floating upward
    for (let i = 0; i < 3; i++) {
        const dx = (i - 1) * 8;
        const delay = i * 0.6;
        const circle = svgEl('circle', {
            cx: (bx + dx).toFixed(2),
            cy: by.toFixed(2),
            r: '4',
            fill: '#CCCCCC',
            opacity: '0'
        });

        const animY = svgEl('animate', {
            attributeName: 'cy',
            from: by.toFixed(2),
            to: (by - 30).toFixed(2),
            dur: '2s',
            begin: `${delay}s`,
            repeatCount: 'indefinite'
        });
        const animOp = svgEl('animate', {
            attributeName: 'opacity',
            values: '0;0.8;0',
            dur: '2s',
            begin: `${delay}s`,
            repeatCount: 'indefinite'
        });
        const animR = svgEl('animate', {
            attributeName: 'r',
            from: '3',
            to: '7',
            dur: '2s',
            begin: `${delay}s`,
            repeatCount: 'indefinite'
        });

        circle.appendChild(animY);
        circle.appendChild(animOp);
        circle.appendChild(animR);
        svg.appendChild(circle);
    }
}

function addFurnaceAnimation(svg, bx, by, bw, bh) {
    const glowRect = svgEl('rect', {
        x: (bx - bw / 2).toFixed(2),
        y: (by - bh).toFixed(2),
        width: bw.toFixed(2),
        height: bh.toFixed(2),
        fill: '#FF3B30',
        opacity: '0.4',
        rx: '2'
    });
    const animOp = svgEl('animate', {
        attributeName: 'opacity',
        values: '0.4;0.8;0.4',
        dur: '1.5s',
        repeatCount: 'indefinite'
    });
    glowRect.appendChild(animOp);
    svg.appendChild(glowRect);
}

function addCookingAnimations(svg, bx, by) {
    // 2 smoke circles
    for (let i = 0; i < 2; i++) {
        const dx = (i - 0.5) * 10;
        const delay = i * 0.9;
        const circle = svgEl('circle', {
            cx: (bx + dx).toFixed(2),
            cy: by.toFixed(2),
            r: '3',
            fill: '#999999',
            opacity: '0'
        });

        const animY = svgEl('animate', {
            attributeName: 'cy',
            from: by.toFixed(2),
            to: (by - 25).toFixed(2),
            dur: '2.5s',
            begin: `${delay}s`,
            repeatCount: 'indefinite'
        });
        const animOp = svgEl('animate', {
            attributeName: 'opacity',
            values: '0;0.6;0',
            dur: '2.5s',
            begin: `${delay}s`,
            repeatCount: 'indefinite'
        });
        const animR = svgEl('animate', {
            attributeName: 'r',
            from: '3',
            to: '9',
            dur: '2.5s',
            begin: `${delay}s`,
            repeatCount: 'indefinite'
        });

        circle.appendChild(animY);
        circle.appendChild(animOp);
        circle.appendChild(animR);
        svg.appendChild(circle);
    }
}

function equipmentLabel(svg, tx, ty, text) {
    const label = svgEl('text', {
        x: tx.toFixed(2),
        y: ty.toFixed(2),
        'text-anchor': 'middle',
        'font-size': '8',
        'font-family': 'system-ui, sans-serif',
        fill: '#444444',
        opacity: '0'
    });
    label.textContent = text;
    return label;
}

function resolveEquipmentScreenPos(position, cx, cy, cfg) {
    // Returns {x, y} screen position for the equipment icon
    // cx, cy is the iso origin of the building (center-bottom)
    // Building occupies roughly: left extends -(cfg.w+cfg.d)*0.5*0.866, right +(cfg.w+cfg.d)*0.5*0.866
    const halfW = (cfg.w + cfg.d) * 0.5 * 0.866;
    const halfD = (cfg.w + cfg.d) * 0.5 * 0.5;
    switch (position) {
        case 'inside':
            return { x: cx - halfW * 0.3, y: cy - cfg.h * 0.25 };
        case 'inside-right':
            return { x: cx + halfW * 0.15, y: cy - cfg.h * 0.25 };
        case 'beside':
            return { x: cx + halfW + 22, y: cy - 10 };
        case 'roof':
            return { x: cx + halfW * 0.2, y: cy - cfg.h * 0.5 - 15 };
        case 'parking':
            return null; // handled separately
        default:
            return { x: cx, y: cy - 10 };
    }
}

function drawEquipmentBox(svg, sx, sy, color, size, label, animClass) {
    // Small isometric box
    const bw = size, bd = size * 0.7, bh = size;
    // Use isoProject directly with the screen center sx,sy
    const p = (ix, iy, iz) => isoProject(sx, sy, ix - bw/2, iy - bd/2, iz);

    const top = [p(0,0,bh), p(bw,0,bh), p(bw,bd,bh), p(0,bd,bh)];
    const right = [p(bw,0,0), p(bw,bd,0), p(bw,bd,bh), p(bw,0,bh)];
    const left = [p(0,bd,0), p(bw,bd,0), p(bw,bd,bh), p(0,bd,bh)];

    // Darken color for shading
    const group = svgEl('g', { opacity: '0', class: animClass || '' });

    group.appendChild(svgEl('polygon', { points: pts(top), fill: color }));
    group.appendChild(svgEl('polygon', { points: pts(right), fill: color, 'fill-opacity': '0.85' }));
    group.appendChild(svgEl('polygon', { points: pts(left), fill: color, 'fill-opacity': '0.65' }));

    // Label above box
    const labelEl = svgEl('text', {
        x: sx.toFixed(2),
        y: (sy - bh - bd * 0.5 - 4).toFixed(2),
        'text-anchor': 'middle',
        'font-size': '7.5',
        'font-family': 'system-ui, sans-serif',
        fill: '#333333'
    });
    labelEl.textContent = label;
    group.appendChild(labelEl);

    svg.appendChild(group);
    return group;
}

export function renderBuilding(container, facilityType, equipment) {
    container.innerHTML = '';

    const cfg = BUILDING_CONFIGS[facilityType] || BUILDING_CONFIGS.office;
    const colors = COLORS[facilityType] || COLORS.office;
    const label = FACILITY_LABELS[facilityType] || facilityType;

    const svg = svgEl('svg', {
        viewBox: '0 0 400 350',
        width: '100%',
        height: '100%',
        xmlns: SVG_NS
    });

    // Radial gradient background
    const defs = svgEl('defs', {});

    const grad = svgEl('radialGradient', { id: 'bgGrad', cx: '50%', cy: '50%', r: '70%' });
    const stop1 = svgEl('stop', { offset: '0%', 'stop-color': '#F8F9FF' });
    const stop2 = svgEl('stop', { offset: '100%', 'stop-color': '#E8ECFF' });
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    const bg = svgEl('rect', { x: '0', y: '0', width: '400', height: '350', fill: 'url(#bgGrad)' });
    svg.appendChild(bg);

    // Ground plane
    const groundCx = 200, groundCy = 240;
    const ground = svgEl('ellipse', {
        cx: groundCx,
        cy: groundCy,
        rx: '140',
        ry: '44',
        fill: '#D8E4F0',
        opacity: '0.5'
    });
    svg.appendChild(ground);

    // Shadow beneath building
    const cx = 180, cy = 220;
    addShadow(svg, cx, cy);

    // Isometric building: origin at iso world (0,0,0), center-projected to (cx, cy)
    // We center the building so its iso center maps to cx,cy
    // Iso center bottom = ((w/2) world, (d/2) world, 0)
    // We shift ox = -w/2, oy = -d/2 so center is at (cx,cy)
    const ox = -cfg.w / 2;
    const oy = -cfg.d / 2;

    drawIsoBox(svg, cx, cy, ox, oy, 0, cfg.w, cfg.d, cfg.h, colors);
    addWindows(svg, cx, cy, ox, oy, 0, cfg.w, cfg.d, cfg.h, colors.window);

    // Equipment overlays
    const fadeinGroups = [];

    // Parking spots: arrange vehicles in a row below-right the building
    let parkingIndex = 0;
    const parkingVehicles = ['fleet_car', 'fleet_van', 'fleet_truck'];
    const parkingBase = {
        x: cx + (cfg.w + cfg.d) * 0.5 * 0.866 - 5,
        y: cy + 20
    };

    for (const [key, val] of Object.entries(equipment || {})) {
        if (!val || !EQUIPMENT_ICONS[key]) continue;
        const icon = EQUIPMENT_ICONS[key];
        const count = typeof val === 'number' ? val : 1;
        if (count <= 0) continue;

        if (icon.position === 'parking') {
            const vehicleLabels = { fleet_car: 'Car', fleet_van: 'Van', fleet_truck: 'Truck' };
            const vLabel = `${count}x ${vehicleLabels[key] || key}`;
            const px = parkingBase.x + parkingIndex * 36;
            const py = parkingBase.y + parkingIndex * 12;
            const g = drawEquipmentBox(svg, px, py, icon.color, 14, vLabel);
            fadeinGroups.push(g);
            parkingIndex++;
        } else {
            const pos = resolveEquipmentScreenPos(icon.position, cx, cy, cfg);
            if (!pos) continue;
            const eqLabels = {
                heating_boiler: 'Boiler',
                generator: 'Generator',
                cooking: 'Cooking',
                furnace: 'Furnace'
            };
            const g = drawEquipmentBox(svg, pos.x, pos.y, icon.color, 12, eqLabels[key] || key);
            fadeinGroups.push(g);

            // Animations on top of the box
            if (key === 'heating_boiler') {
                addBoilerAnimations(svg, pos.x, pos.y - 16);
            } else if (key === 'furnace') {
                addFurnaceAnimation(svg, pos.x, pos.y, 14, 14);
            } else if (key === 'cooking') {
                addCookingAnimations(svg, pos.x, pos.y - 14);
            }
        }
    }

    // Facility type label at bottom
    const labelEl = svgEl('text', {
        x: '200',
        y: '335',
        'text-anchor': 'middle',
        'font-size': '13',
        'font-weight': '600',
        'font-family': 'system-ui, sans-serif',
        fill: '#1C1C1E'
    });
    labelEl.textContent = label;
    svg.appendChild(labelEl);

    container.appendChild(svg);

    // Fade in equipment groups
    if (fadeinGroups.length > 0) {
        requestAnimationFrame(() => {
            for (const g of fadeinGroups) {
                g.style.transition = 'opacity 0.4s ease';
                g.setAttribute('opacity', '1');
            }
        });
    }
}

export function clearBuilding(container) {
    container.innerHTML = '<p style="text-align:center;color:#8E8E93;padding:2rem 1rem;font-family:system-ui,sans-serif;font-size:14px;">Select a facility type to see the building</p>';
}
