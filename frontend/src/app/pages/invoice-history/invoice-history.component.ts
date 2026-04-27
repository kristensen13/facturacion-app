import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Factura, Cliente } from '../../models/models';

@Component({
  selector: 'app-invoice-history',
  templateUrl: './invoice-history.component.html',
  styleUrls: ['./invoice-history.component.scss']
})
export class InvoiceHistoryComponent implements OnInit {
  facturas: Factura[] = [];
  clientes: Cliente[] = [];
  clientePopup: Cliente | null = null;
  cargando = true;
  toast: { msg: string; tipo: string } | null = null;

  // Filtros
  filtro = { search: '', estado: '', cliente_id: '', ano: new Date().getFullYear() };
  anos = [2024, 2025, 2026, 2027];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getClientes().subscribe(c => this.clientes = c);
    this.buscar();
  }

  buscar(): void {
    this.cargando = true;
    const f: any = {};
    if (this.filtro.search)     f.search     = this.filtro.search;
    if (this.filtro.estado)     f.estado     = this.filtro.estado;
    if (this.filtro.cliente_id) f.cliente_id = +this.filtro.cliente_id;
    if (this.filtro.ano)        f.ano        = this.filtro.ano;

    this.api.getFacturas(f).subscribe({
      next: data => { this.facturas = data; this.cargando = false; },
      error: ()   => { this.cargando = false; }
    });
  }

  limpiarFiltros(): void {
    this.filtro = { search: '', estado: '', cliente_id: '', ano: new Date().getFullYear() };
    this.buscar();
  }

  cambiarEstado(factura: Factura, nuevoEstado: string): void {
    this.api.updateFactura(factura.id!, { ...factura, estado: nuevoEstado as any }).subscribe({
      next: f => {
        const idx = this.facturas.findIndex(x => x.id === f.id);
        if (idx >= 0) this.facturas[idx] = { ...this.facturas[idx], estado: f.estado };
        this.mostrarToast(`Factura #${f.numero} → ${f.estado}`, 'success');
      }
    });
  }

  anularFactura(id: number, numero: number): void {
    if (!confirm(`¿Seguro que quieres anular la factura #${numero}?`)) return;
    this.api.deleteFactura(id).subscribe({
      next: () => {
        this.facturas = this.facturas.map(f => f.id === id ? { ...f, estado: 'Anulada' } : f);
        this.mostrarToast(`Factura #${numero} anulada`, 'success');
      }
    });
  }

  abrirPDF(id: number): void {
    window.open(this.api.getPdfUrl(id), '_blank');
  }

  verCliente(clienteId: number): void {
    const c = this.clientes.find(x => x.id === clienteId);
    if (c) this.clientePopup = c;
  }

  cerrarPopup(): void {
    this.clientePopup = null;
  }

  exportarCSV(): void {
    this.api.exportCSV(this.filtro.ano || undefined);
  }

  mostrarToast(msg: string, tipo: string): void {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3000);
  }

  formatEuro(n: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }

  get totalSeleccion(): number {
    return this.facturas.filter(f => f.estado !== 'Anulada').reduce((s, f) => s + (f.total || 0), 0);
  }
}
