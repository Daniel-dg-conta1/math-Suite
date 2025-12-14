
export interface Vector {
  id: number;
  x: number;
  y: number;
  label: string;
  color: string;
  inputType: 'cartesian' | 'angle' | 'triangle';
  // Input params storage - allow string to support negative sign typing
  param1: number | string; // x or magnitude
  param2: number | string; // y or angle or H
  param3: number | string | null; // V (for triangle)
}

export interface TeacherConfig {
  numQuestions: number;
  types: ('2' | '3' | '4' | 'missing')[];
  minMagnitude: number;
  maxMagnitude: number;
  angleStep: number;
  allowCartesian: boolean;
  allowAngle: boolean;
  allowTriangle: boolean;
}

export interface Exercise {
  id: number;
  type: string;
  vectors: Vector[];
  resultantDesired?: { x: number; y: number; label: string };
  solution: {
    label: string;
    x: string;
    y: string;
    magnitude: string;
    angle: string;
  };
}

// --- AUTH TYPES ---
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

// --- TRIGONOMETRY TYPES ---

export type TriangleMode = 'SSS' | 'SAS' | 'ASA' | 'AAS' | 'Right';

export interface TriangleData {
  // Sides
  a: number;
  b: number;
  c: number;
  // Angles (degrees)
  A: number;
  B: number;
  C: number;
  // Metadata
  area: number;
  perimeter: number;
  height: number; // usually height relative to base 'c' or 'a' depending on orientation
  valid: boolean;
}

export interface TrigoExercise {
  id: number;
  mode: TriangleMode;
  given: {
    val1: number; label1: string;
    val2: number; label2: string;
    val3?: number; label3?: string; // Right triangle might only need 2 inputs
  };
  solution: TriangleData;
}

export type GridMode = 'none' | 'light' | 'strong';

// Academic Premium Palette
export const COLORS = [
  '#00A884', // V1 - Scientific Green
  '#2E7CF6', // V2 - Academic Blue
  '#E14C4C', // V3 - Alert Red
  '#E8A12D', // V4 - Focus Orange
  '#9333EA', // V5 - Purple
  '#0891B2'  // V6 - Cyan
];

export const THEME = {
  primary: '#005A7A',   // Azul Petróleo
  secondary: '#1FA67A', // Verde Científico
  accent: '#6C4EFF',    // Roxo Técnico
  resultant: '#8A3FFC', // Bright Purple for Resultant
  missing: '#0D9488',   // Teal for Missing Vector
  text: '#1A1C20',      // Preto Técnico
  bg: '#F5F7FA',        // Gray 1
  panel: '#FFFFFF',
  border: '#E2E8F0'
};