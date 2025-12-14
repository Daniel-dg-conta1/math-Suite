
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

export const formatNumber = (num: number, digits = 1): string => {
  if (Math.abs(num) < 0.00001) return '0';
  if (Number.isInteger(num)) return num.toString();
  if (Math.abs(num) < 1) return num.toFixed(3).replace('.', ','); 
  return num.toFixed(digits).replace('.', ',');
};

export const getMagnitude = (x: number, y: number) => Math.sqrt(x * x + y * y);

export const getAngle = (x: number, y: number) => {
  let angle = Math.atan2(y, x) * RAD_TO_DEG;
  if (angle < 0) angle += 360;
  return angle;
};

// Returns angle in range [0, 360)
export const normalizeAngle = (angle: number) => {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
};

// Determines the closest axis (0, 90, 180, 270)
export const getNearestAxis = (angle: number) => {
  const a = normalizeAngle(angle);
  if (a >= 315 || a < 45) return 0;
  if (a >= 45 && a < 135) return 90;
  if (a >= 135 && a < 225) return 180;
  return 270;
};

export const isAngleTooClose = (newAngle: number, existingAngles: number[], minSep: number) => {
  for (const existing of existingAngles) {
    let diff = Math.abs(normalizeAngle(newAngle) - normalizeAngle(existing));
    if (diff > 180) diff = 360 - diff;
    if (diff < minSep) return true;
  }
  return false;
};

const safeFloat = (v: number | string | null): number => {
  if (v === null) return 0;
  if (typeof v === 'number') return v;
  // Handle "-" or empty string as 0 for calculation purposes
  if (v === '' || v === '-') return 0;
  return parseFloat(v) || 0;
};

export const calculateComponents = (inputType: string, p1: number | string, p2: number | string, p3: number | string | null) => {
  let x = 0, y = 0;
  const v1 = safeFloat(p1);
  const v2 = safeFloat(p2);
  const v3 = safeFloat(p3);
  
  if (inputType === 'cartesian') {
    x = v1;
    y = v2;
  } else if (inputType === 'angle') {
    const rad = v2 * DEG_TO_RAD;
    x = v1 * Math.cos(rad);
    y = v1 * Math.sin(rad);
  } else if (inputType === 'triangle') {
    // Triangle mode: p1=Hypotenuse (Magnitude), p2=Horizontal(H), p3=Vertical(V)
    // We use H/V to determine the direction (angle) and p1 for the magnitude.
    // θ = atan2(V, H)
    const theta = Math.atan2(v3, v2);
    // x = R * cos(θ), y = R * sin(θ)
    x = v1 * Math.cos(theta);
    y = v1 * Math.sin(theta);
  }
  return { x, y };
};

export const rotatePoint = (x: number, y: number, angleDeg: number) => {
  const rad = angleDeg * DEG_TO_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Rotation of axes (Passive transformation) vs Rotation of point (Active)
  // Request: "Componentes no sistema rotacionado (x', y')" -> Passive rotation of axes by alpha
  // x' = x cos(a) + y sin(a)
  // y' = -x sin(a) + y cos(a)
  return {
    x: x * cos + y * sin,
    y: -x * sin + y * cos
  };
};

// AABB collision rectangle
export interface Rect { x: number; y: number; w: number; h: number; }

export const checkCollision = (r1: Rect, r2: Rect) => {
  return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
          r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
};

export interface VisualVector {
  id: number | string;
  x: number;
  y: number;
  originalAngle: number;
  visualAngle: number;
  magnitude: number;
  vx: number;
  vy: number;
}

export const calculateVisualLayout = (vectors: {id: number|string, x: number, y: number}[], minSepDeg = 6) => {
  if (vectors.length === 0) return [];

  const items = vectors.map(v => {
    const mag = getMagnitude(v.x, v.y);
    const ang = getAngle(v.x, v.y);
    return { 
      id: v.id, 
      x: v.x, 
      y: v.y, 
      originalAngle: ang, 
      visualAngle: ang, 
      magnitude: mag,
      vx: v.x,
      vy: v.y
    };
  });

  items.sort((a, b) => a.originalAngle - b.originalAngle);

  // Simplified clustering for visual separation (screen only)
  const clusters: typeof items[] = [];
  if(items.length > 0) {
    let currentCluster: typeof items = [items[0]];
    
    for (let i = 1; i < items.length; i++) {
      let diff = items[i].originalAngle - items[i-1].originalAngle;
      if (diff < minSepDeg) {
        currentCluster.push(items[i]);
      } else {
        clusters.push(currentCluster);
        currentCluster = [items[i]];
      }
    }
    
    const first = items[0];
    const last = items[items.length - 1];
    const wrapDiff = (first.originalAngle + 360) - last.originalAngle;
    
    if (wrapDiff < minSepDeg && clusters.length > 1 && currentCluster !== clusters[0]) {
        const firstCluster = clusters[0];
        firstCluster.forEach(v => v.originalAngle += 360);
        currentCluster.push(...firstCluster);
        clusters.shift();
    }
    clusters.push(currentCluster);
  }

  clusters.forEach(cluster => {
    if (cluster.length < 2) return;
    const avgAngle = cluster.reduce((sum, v) => sum + v.originalAngle, 0) / cluster.length;
    const startAngle = avgAngle - ((cluster.length - 1) * minSepDeg) / 2;
    
    cluster.forEach((vec, idx) => {
      let newAng = startAngle + (idx * minSepDeg);
      newAng = newAng % 360; 
      if (newAng < 0) newAng += 360;
      
      vec.visualAngle = newAng;
      const rad = newAng * DEG_TO_RAD;
      vec.vx = vec.magnitude * Math.cos(rad);
      vec.vy = vec.magnitude * Math.sin(rad);
    });
  });

  return items;
};
