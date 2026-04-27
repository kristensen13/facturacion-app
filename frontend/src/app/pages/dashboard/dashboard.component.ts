import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Factura, FacturaStats } from '../../models/models';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats: FacturaStats | null = null;
  ultimasFacturas: Factura[] = [];
  anoActual = new Date().getFullYear();
  cargando = true;

  meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.api.getStats(this.anoActual).subscribe({
      next: s => { this.stats = s; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
    this.api.getFacturas({ ano: this.anoActual }).subscribe({
      next: f => { this.ultimasFacturas = f.slice(0, 8); }
    });
  }

  get totalBase(): number   { return this.stats?.total_base  ?? 0; }
  get totalIVA(): number    { return this.stats?.total_iva   ?? 0; }
  get totalNeto(): number   { return this.totalBase + this.totalIVA; }
  get numFacturas(): number { return this.stats?.total_facturas ?? 0; }

  contarEstado(estado: string): number {
    return this.stats?.por_estado.find(e => e.estado === estado)?.count ?? 0;
  }

  getBarHeight(mes: string): number {
    if (!this.stats?.por_mes?.length) return 0;
    const maxBase = Math.max(...this.stats.por_mes.map(m => m.base));
    const mesData = this.stats.por_mes.find(m => m.mes === mes.padStart(2,'0'));
    return maxBase > 0 ? Math.round(((mesData?.base ?? 0) / maxBase) * 100) : 0;
  }

  formatEuro(n: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }

  abrirPDF(id: number): void {
    window.open(this.api.getPdfUrl(id), '_blank');
  }

  exportarCSV(): void {
    this.api.exportCSV(this.anoActual);
  }

  getMesImporte(mes: number): number {
    const mesData = this.stats?.por_mes.find(m => m.mes === mes.toString().padStart(2, '0'));
    return mesData?.base ?? 0;
  }
}
