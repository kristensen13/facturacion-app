import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cliente, Empresa, Factura, FacturaLinea, FacturaStats, CatalogoItem, Presupuesto, PresupuestoLinea } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Empresa ────────────────────────────────────────────────────────────────
  getEmpresa(): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.base}/empresa`);
  }
  updateEmpresa(data: Empresa): Observable<Empresa> {
    return this.http.put<Empresa>(`${this.base}/empresa`, data);
  }

  // ── Clientes ───────────────────────────────────────────────────────────────
  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.base}/clientes`);
  }
  getCliente(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.base}/clientes/${id}`);
  }
  createCliente(data: Partial<Cliente>): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.base}/clientes`, data);
  }
  updateCliente(id: number, data: Partial<Cliente>): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.base}/clientes/${id}`, data);
  }
  deleteCliente(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/clientes/${id}`);
  }

  // ── Facturas ───────────────────────────────────────────────────────────────
  getFacturas(filtros?: { estado?: string; cliente_id?: number; ano?: number; mes?: number; search?: string }): Observable<Factura[]> {
    let params = new HttpParams();
    if (filtros) {
      Object.entries(filtros).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
      });
    }
    return this.http.get<Factura[]>(`${this.base}/facturas`, { params });
  }
  getFactura(id: number): Observable<Factura> {
    return this.http.get<Factura>(`${this.base}/facturas/${id}`);
  }
  getNextNumero(): Observable<{ numero: number }> {
    return this.http.get<{ numero: number }>(`${this.base}/facturas/next-numero`);
  }
  getStats(ano?: number): Observable<FacturaStats> {
    let params = new HttpParams();
    if (ano) params = params.set('ano', String(ano));
    return this.http.get<FacturaStats>(`${this.base}/facturas/stats`, { params });
  }
  createFactura(data: { cliente_id: number; fecha: string; lineas: FacturaLinea[]; estado?: string; notas?: string }): Observable<Factura> {
    return this.http.post<Factura>(`${this.base}/facturas`, data);
  }
  updateFactura(id: number, data: Partial<Factura>): Observable<Factura> {
    return this.http.put<Factura>(`${this.base}/facturas/${id}`, data);
  }
  deleteFactura(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/facturas/${id}`);
  }
  getPdfUrl(id: number): string {
    return `${this.base}/facturas/${id}/pdf`;
  }
  exportCSV(ano?: number): void {
    let url = `${this.base}/facturas/export/csv`;
    if (ano) url += `?ano=${ano}`;
    window.open(url, '_blank');
  }

  // ── Catálogo ────────────────────────────────────────────────────────────────
  getCatalogo(): Observable<CatalogoItem[]> {
    return this.http.get<CatalogoItem[]>(`${this.base}/catalogo`);
  }
  createCatalogoItem(data: Partial<CatalogoItem>): Observable<CatalogoItem> {
    return this.http.post<CatalogoItem>(`${this.base}/catalogo`, data);
  }
  updateCatalogoItem(id: number, data: Partial<CatalogoItem>): Observable<CatalogoItem> {
    return this.http.put<CatalogoItem>(`${this.base}/catalogo/${id}`, data);
  }
  deleteCatalogoItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/catalogo/${id}`);
  }

  // ── Presupuestos ────────────────────────────────────────────────────────────
  getPresupuestos(filtros?: { estado?: string; cliente_id?: number; ano?: number; search?: string }): Observable<Presupuesto[]> {
    let params = new HttpParams();
    if (filtros) {
      Object.entries(filtros).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
      });
    }
    return this.http.get<Presupuesto[]>(`${this.base}/presupuestos`, { params });
  }
  getPresupuesto(id: number): Observable<Presupuesto> {
    return this.http.get<Presupuesto>(`${this.base}/presupuestos/${id}`);
  }
  getNextNumeroPresupuesto(): Observable<{ numero: number }> {
    return this.http.get<{ numero: number }>(`${this.base}/presupuestos/next-numero`);
  }
  createPresupuesto(data: { cliente_id: number; fecha: string; validez_hasta?: string; lineas: PresupuestoLinea[]; estado?: string; notas?: string }): Observable<Presupuesto> {
    return this.http.post<Presupuesto>(`${this.base}/presupuestos`, data);
  }
  updatePresupuesto(id: number, data: Partial<Presupuesto>): Observable<Presupuesto> {
    return this.http.put<Presupuesto>(`${this.base}/presupuestos/${id}`, data);
  }
  deletePresupuesto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/presupuestos/${id}`);
  }
  updatePresupuestoEstado(id: number, estado: string): Observable<Presupuesto> {
    return this.http.put<Presupuesto>(`${this.base}/presupuestos/${id}/estado`, { estado });
  }
  getPresupuestoPdfUrl(id: number): string {
    return `${this.base}/presupuestos/${id}/pdf`;
  }
}
