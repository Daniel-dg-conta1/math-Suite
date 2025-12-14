import { DEG_TO_RAD, RAD_TO_DEG } from './math';
import { TriangleData, TriangleMode } from '../types';

const toRad = (deg: number) => deg * DEG_TO_RAD;
const toDeg = (rad: number) => rad * RAD_TO_DEG;

// Helper to clean precision issues based on user requirement:
// "Use uma casa depois da vírgula se o número for maior do que 1"
const clean = (num: number) => {
  if (Math.abs(num) < 1) return parseFloat(num.toFixed(3));
  return parseFloat(num.toFixed(1));
};

export const solveTriangle = (
  mode: TriangleMode, 
  v1: number, 
  v2: number, 
  v3: number
): TriangleData | null => {
  // Return null if inputs are invalid (negative or zero where not allowed)
  if (v1 <= 0 || v2 <= 0) return null;
  if (mode !== 'Right' && v3 <= 0) return null;

  let a = 0, b = 0, c = 0;
  let A = 0, B = 0, C = 0;

  try {
    switch (mode) {
      case 'SSS': // Lado-Lado-Lado (v1=a, v2=b, v3=c)
        a = v1; b = v2; c = v3;
        // Validity Check: Triangle Inequality
        if (a + b <= c || a + c <= b || b + c <= a) return null;
        // Law of Cosines
        A = toDeg(Math.acos((b**2 + c**2 - a**2) / (2 * b * c)));
        B = toDeg(Math.acos((a**2 + c**2 - b**2) / (2 * a * c)));
        C = 180 - A - B;
        break;

      case 'SAS': // Lado-Ângulo-Lado (v1=b, v2=AngA, v3=c) -> Inputs: Side b, Angle A, Side c
        b = v1; A = v2; c = v3;
        if (A >= 180) return null;
        // Law of Cosines for 'a'
        a = Math.sqrt(b**2 + c**2 - 2*b*c*Math.cos(toRad(A)));
        // Law of Sines/Cosines for B
        B = toDeg(Math.acos((a**2 + c**2 - b**2) / (2 * a * c)));
        C = 180 - A - B;
        break;

      case 'ASA': // Ângulo-Lado-Ângulo (v1=AngB, v2=a, v3=AngC) -> Inputs: Angle B, Side a, Angle C
        // Note: Standard notation usually Side 'c' is between A and B. 
        // Let's assume input is: Angle B, Side a, Angle C? No, usually ASA is Angle A, Side c, Angle B.
        // Let's implement: Angle A, Side c, Angle B.
        A = v1; c = v2; B = v3;
        if (A + B >= 180) return null;
        C = 180 - A - B;
        // Law of Sines
        a = (c * Math.sin(toRad(A))) / Math.sin(toRad(C));
        b = (c * Math.sin(toRad(B))) / Math.sin(toRad(C));
        break;

      case 'AAS': // Lado-Ângulo-Ângulo (v1=AngA, v2=AngB, v3=a) -> Angle A, Angle B, Side a (opposite to A)
        A = v1; B = v2; a = v3;
        if (A + B >= 180) return null;
        C = 180 - A - B;
        // Law of Sines
        b = (a * Math.sin(toRad(B))) / Math.sin(toRad(A));
        c = (a * Math.sin(toRad(C))) / Math.sin(toRad(A));
        break;
      
      case 'Right': // Triângulo Retângulo (v1=cateto1, v2=cateto2 OR hipotenusa)
        // Let's simplify: Input is Cateto Base (b) and Cateto Altura (a). C is 90 deg.
        // Wait, v3 is optional/ignored in UI, but let's say input is: a, b.
        // We assume C = 90.
        a = v1; b = v2;
        C = 90;
        c = Math.sqrt(a**2 + b**2);
        A = toDeg(Math.atan(a/b));
        B = 90 - A;
        break;
    }
  } catch (e) {
    return null;
  }

  // Final validation
  if (isNaN(a) || isNaN(b) || isNaN(c) || isNaN(A) || isNaN(B) || isNaN(C)) return null;
  if (a <= 0 || b <= 0 || c <= 0) return null;

  // Metadata
  const s = (a + b + c) / 2;
  const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
  const height = (2 * area) / c; // Height relative to side c (base)

  return {
    a: clean(a), b: clean(b), c: clean(c),
    A: clean(A), B: clean(B), C: clean(C),
    area: clean(area),
    perimeter: clean(a + b + c),
    height: clean(height),
    valid: true
  };
};

export const getTriangleCoords = (t: TriangleData) => {
  // Strategy: 
  // Point A at (0,0)
  // Point B at (c, 0)  -> Side c is the base on x-axis
  // Point C calculated from Angle A and Side b
  
  // Note: solveTriangle returns A, B, C corresponding to opposite sides a, b, c.
  // Standard Layout:
  // Vertex A at origin? 
  // Let's put Vertex B at origin (0,0) to simplify C calculation if C is top?
  // Let's stick to standard:
  // Side 'c' is the base AB.
  // A = (0,0)
  // B = (c, 0)
  // C = (b * cos(A), b * sin(A))
  
  // Wait, angles are A, B, C.
  // Side 'b' connects A and C. Side 'c' connects A and B. Side 'a' connects B and C.
  // So if A is origin:
  // Ax = 0, Ay = 0
  // Bx = c, By = 0
  // Cx = b * cos(A), Cy = b * sin(A)
  
  const Ax = 0;
  const Ay = 0;
  
  const Bx = t.c;
  const By = 0;
  
  const Cx = t.b * Math.cos(toRad(t.A));
  const Cy = t.b * Math.sin(toRad(t.A));
  
  return { Ax, Ay, Bx, By, Cx, Cy };
};