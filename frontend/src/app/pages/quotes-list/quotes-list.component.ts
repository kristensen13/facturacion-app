import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Presupuesto, Cliente } from '../../models/models';

import { Router } from '@angular/router';

@Component({
  selector: 'app-quotes-list',
  templateUrl: './quotes-list.component.html',
  styleUrls: ['./quotes-list.component.scss']
})
export class QuotesListComponent implements OnInit {
  presupuestos: Presupuesto[] = [];
  clientes: Cliente[] = [];
  clientePopup: Cliente | null = null;
  cargando = true;
  toast: { msg: string; tipo: string } | null = null;
  showingSendModal = false;
  presupuestoSeleccionado: Presupuesto | null = null;

  // Filtros
  filtro = { search: '', estado: '', cliente_id: '', ano: new Date().getFullYear() };
  anos = [2024, 2025, 2026, 2027];

  constructor(private api: ApiService, private router: Router) {}

  nuevoPresupuesto(): void {
    this.router.navigate(['/nuevo-presupuesto']);
  }

  editar(id: number): void {
    this.router.navigate(['/nuevo-presupuesto', id]);
  }

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

    this.api.getPresupuestos(f).subscribe({
      next: data => { this.presupuestos = data; this.cargando = false; },
      error: ()   => { this.cargando = false; }
    });
  }

  limpiarFiltros(): void {
    this.filtro = { search: '', estado: '', cliente_id: '', ano: new Date().getFullYear() };
    this.buscar();
  }

  cambiarEstado(presupuesto: Presupuesto, nuevoEstado: string): void {
    this.api.updatePresupuestoEstado(presupuesto.id!, nuevoEstado).subscribe({
      next: p => {
        const idx = this.presupuestos.findIndex(x => x.id === p.id);
        if (idx >= 0) this.presupuestos[idx] = { ...this.presupuestos[idx], estado: p.estado };
        this.mostrarToast(`Presupuesto #${p.numero} → ${p.estado}`, 'success');
      }
    });
  }

  eliminarPresupuesto(id: number, numero: number): void {
    if (!confirm(`¿Seguro que quieres eliminar el presupuesto #${numero}?`)) return;
    this.api.deletePresupuesto(id).subscribe({
      next: () => {
        this.presupuestos = this.presupuestos.filter(p => p.id !== id);
        this.mostrarToast(`Presupuesto #${numero} eliminado`, 'success');
      }
    });
  }

  abrirPDF(id: number): void {
    window.open(this.api.getPresupuestoPdfUrl(id), '_blank');
  }

  verCliente(clienteId: number): void {
    const c = this.clientes.find(x => x.id === clienteId);
    if (c) this.clientePopup = c;
  }

  cerrarPopup(): void {
    this.clientePopup = null;
  }

  mostrarToast(msg: string, tipo: string): void {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3000);
  }

  formatEuro(n: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }

  // ── Envío de presupuestos ──────────────────────────────────────────────────
  abrirModalEnvio(presupuesto: Presupuesto): void {
    this.presupuestoSeleccionado = presupuesto;
    this.showingSendModal = true;
  }

  cerrarModalEnvio(): void {
    this.showingSendModal = false;
    this.presupuestoSeleccionado = null;
  }

  enviarPorEmail(): void {
    const p = this.presupuestoSeleccionado;
    if (!p) return;
    const cliente = p.cliente;
    if (!cliente?.email) {
      this.mostrarToast('El cliente no tiene email registrado', 'error');
      return;
    }
    const asunto = encodeURIComponent(`Presupuesto #${p.numero} - ${cliente.nombre}`);
    const cuerpo = encodeURIComponent(
      `Estimado/a ${cliente.nombre},\n\n` +
      `Adjunto encontrará el presupuesto #${p.numero} con fecha ${p.fecha.split('-').reverse().join('/')}.` +
      `\n\nImporte total: ${this.formatEuro(p.total || 0)}` +
      `\n\nQuedamos a su disposición para cualquier consulta.\n\nSaludos cordiales.`
    );
    window.open(`mailto:${cliente.email}?subject=${asunto}&body=${cuerpo}`, '_blank');
    this.cerrarModalEnvio();
    this.mostrarToast('Abriendo cliente de email...', 'success');
  }

  enviarPorWhatsApp(): void {
    const p = this.presupuestoSeleccionado;
    if (!p) return;
    const cliente = p.cliente;
    if (!cliente?.telefono) {
      this.mostrarToast('El cliente no tiene teléfono registrado', 'error');
      return;
    }
    // Limpiar teléfono (quitar espacios, guiones, +)
    const telefono = cliente.telefono.replace(/[^0-9]/g, '');
    const mensaje = encodeURIComponent(
      `Hola ${cliente.nombre},\n\n` +
      `Te enviamos el presupuesto #${p.numero} con fecha ${p.fecha.split('-').reverse().join('/')}.` +
      `\n\nImporte total: ${this.formatEuro(p.total || 0)}` +
      `\n\n¿Te gustaría que lo tramitemos?`
    );
    window.open(`https://wa.me/34${telefono}?text=${mensaje}`, '_blank');
    this.cerrarModalEnvio();
    this.mostrarToast('Abriendo WhatsApp...', 'success');
  }

  imprimirPDF(): void {
    const p = this.presupuestoSeleccionado;
    if (!p) return;
    // Abrir PDF y luego imprimir
    const pdfUrl = this.api.getPresupuestoPdfUrl(p.id!);
    const printWindow = window.open(pdfUrl, '_blank');
    printWindow?.addEventListener('load', () => {
      printWindow.print();
    });
    this.cerrarModalEnvio();
    this.mostrarToast('Abriendo PDF para imprimir...', 'success');
  }
}
