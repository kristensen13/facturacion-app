// ── Empresa ──────────────────────────────────────────────────────────────────
export interface Empresa {
  id?: number;
  nombre: string;
  nif: string;
  direccion: string;
  ciudad: string;
  cp: string;
  iban?: string;
  email?: string;
  telefono?: string;
}

// ── Cliente ───────────────────────────────────────────────────────────────────
export interface Cliente {
  id?: number;
  nombre: string;
  nif: string;
  direccion: string;
  provincia: string;
  ciudad: string;
  cp: string;
  email?: string;
  telefono?: string;
  iva: number;
  activo?: number;
  created_at?: string;
}

// ── Catálogo ──────────────────────────────────────────────────────────────────
export interface CatalogoItem {
  id?: number;
  concepto: string;
  descripcion?: string;
  precio?: number;
  activo?: number;
}

// ── Factura ───────────────────────────────────────────────────────────────────
export type EstadoFactura = 'Borrador' | 'Enviada' | 'Pagada' | 'Anulada';

export interface FacturaLinea {
  id?: number;
  factura_id?: number;
  concepto: string;
  importe: number;
}

export interface Factura {
  id?: number;
  numero?: number;
  fecha: string;
  cliente_id: number;
  estado: EstadoFactura;
  notas?: string;
  iva_pagado?: number;
  created_at?: string;
  updated_at?: string;
  // Enriquecida por el backend
  cliente?: Cliente;
  lineas?: FacturaLinea[];
  base_imponible?: number;
  iva_importe?: number;
  total?: number;
  // Campos flat para listados
  cliente_nombre?: string;
  cliente_nif?: string;
  cliente_iva?: number;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export interface FacturaStats {
  total_facturas: number;
  total_base: number;
  total_iva: number;
  por_estado: { estado: string; count: number }[];
  por_mes: { mes: string; base: number }[];
}

// ── Presupuesto ───────────────────────────────────────────────────────────────
export type EstadoPresupuesto = 'Borrador' | 'Enviado' | 'Aceptado' | 'Rechazado';

export interface PresupuestoLinea {
  id?: number;
  presupuesto_id?: number;
  concepto: string;
  importe: number;
}

export interface Presupuesto {
  id?: number;
  numero?: number;
  fecha: string;
  validez_hasta?: string;
  cliente_id: number;
  estado: EstadoPresupuesto;
  notas?: string;
  created_at?: string;
  updated_at?: string;
  // Enriquecida por el backend
  cliente?: Cliente;
  lineas?: PresupuestoLinea[];
  base_imponible?: number;
  iva_importe?: number;
  total?: number;
  // Campos flat para listados
  cliente_nombre?: string;
  cliente_nif?: string;
  cliente_iva?: number;
}
