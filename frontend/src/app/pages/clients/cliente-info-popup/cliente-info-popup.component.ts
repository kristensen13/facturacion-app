import {
  Component, Input, Output, EventEmitter,
  HostListener, ElementRef
} from '@angular/core';
import { Cliente } from '../../../models/models';

@Component({
  selector: 'app-cliente-info-popup',
  templateUrl: './cliente-info-popup.component.html',
  styleUrls: ['./cliente-info-popup.component.scss']
})
export class ClienteInfoPopupComponent {
  @Input() cliente!: Cliente;
  @Output() cerrar = new EventEmitter<void>();

  /** Cierra si se hace clic fuera del panel */
  @HostListener('document:keydown.escape')
  onEsc(): void { this.cerrar.emit(); }

  get ivaLabel(): string {
    if (this.cliente?.iva == null) return '—';
    return `${(this.cliente.iva * 100).toFixed(0)} %`;
  }

  get direccionCompleta(): string {
    const c = this.cliente;
    if (!c) return '—';
    const partes = [c.direccion, c.cp, c.ciudad, c.provincia].filter(Boolean);
    return partes.length ? partes.join(', ') : '—';
  }
}
