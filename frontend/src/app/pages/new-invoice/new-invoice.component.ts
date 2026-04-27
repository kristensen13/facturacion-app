import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Cliente, CatalogoItem, Factura } from '../../models/models';
import { TuiDay } from '@taiga-ui/cdk';

@Component({
  selector: 'app-new-invoice',
  templateUrl: './new-invoice.component.html',
  styleUrls: ['./new-invoice.component.scss']
})
export class NewInvoiceComponent implements OnInit {
  form!: FormGroup;
  clientes: Cliente[] = [];
  catalogo: CatalogoItem[] = [];
  clienteSeleccionado: Cliente | null = null;
  nextNumero = 0;
  editandoId: number | null = null;
  guardando = false;
  toast: { msg: string; tipo: string } | null = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.inicializarForm();
    this.cargarDatos();

    // Modo edición si viene con :id
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editandoId = +id;
      this.cargarFactura(+id);
    }
  }

  inicializarForm(): void {
    this.form = this.fb.group({
      cliente_id: ['', Validators.required],
      fecha: [TuiDay.currentLocal(), Validators.required],
      estado: ['Borrador'],
      notas: [''],
      lineas: this.fb.array([this.nuevaLinea()])
    });

    this.form.get('cliente_id')!.valueChanges.subscribe(id => {
      this.clienteSeleccionado = this.clientes.find(c => c.id === +id) || null;
    });
  }

  cargarDatos(): void {
    this.api.getClientes().subscribe(c => this.clientes = c);
    this.api.getCatalogo().subscribe(cat => this.catalogo = cat);
    if (!this.editandoId) {
      this.api.getNextNumero().subscribe(r => this.nextNumero = r.numero);
    }
  }

  getClienteNombre(id: any): string {
    return this.clientes.find(c => c.id === +id)?.nombre || '';
  }

  get fechaFormateada(): string {
    const f = this.form.get('fecha')?.value as TuiDay;
    if (!f) return '';
    return `${String(f.day).padStart(2, '0')}/${String(f.month + 1).padStart(2, '0')}/${f.year}`;
  }


  cargarFactura(id: number): void {
    this.api.getFactura(id).subscribe(f => {
      this.nextNumero = f.numero!;
      const [year, month, day] = f.fecha.split('-').map(Number);
      this.form.patchValue({
        cliente_id: f.cliente_id,
        fecha: new TuiDay(year, month - 1, day),
        estado: f.estado,
        notas: f.notas || ''
      });
      // Limpiar y recargar líneas
      this.lineasArray.clear();
      (f.lineas || []).forEach(l => {
        this.lineasArray.push(this.fb.group({
          concepto: [l.concepto, Validators.required],
          importe: [l.importe, [Validators.required, Validators.min(0.01)]]
        }));
      });
    });
  }

  // ── Líneas ────────────────────────────────────────────────────────────────
  get lineasArray(): FormArray { return this.form.get('lineas') as FormArray; }
  get lineas(): AbstractControl[] { return this.lineasArray.controls; }

  nuevaLinea(): FormGroup {
    return this.fb.group({
      concepto: ['', Validators.required],
      importe: [null, [Validators.required, Validators.min(0.01)]]
    });
  }

  agregarLinea(): void { this.lineasArray.push(this.nuevaLinea()); }

  eliminarLinea(i: number): void {
    if (this.lineasArray.length > 1) this.lineasArray.removeAt(i);
  }

  usarConcepto(i: number, item: CatalogoItem): void {
    const linea = this.lineasArray.at(i);
    linea.patchValue({ concepto: item.concepto, importe: item.precio || null });
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  get baseImponible(): number {
    return this.lineas.reduce((s, l) => s + (+l.get('importe')?.value || 0), 0);
  }
  get ivaPorc(): number   { return this.clienteSeleccionado?.iva ?? 0.21; }
  get cuotaIVA(): number  { return this.baseImponible * this.ivaPorc; }
  get totalFactura(): number { return this.baseImponible + this.cuotaIVA; }

  formatEuro(n: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  guardar(abrirPDF = false): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;

    const fechaVal = this.form.value.fecha as TuiDay;
    const fechaStr = `${fechaVal.year}-${String(fechaVal.month + 1).padStart(2, '0')}-${String(fechaVal.day).padStart(2, '0')}`;

    const payload = {
      cliente_id: +this.form.value.cliente_id,
      fecha: fechaStr,
      estado: this.form.value.estado,
      notas: this.form.value.notas,
      lineas: this.form.value.lineas.map((l: any) => ({ concepto: l.concepto, importe: +l.importe }))
    };

    const op$ = this.editandoId
      ? this.api.updateFactura(this.editandoId, payload)
      : this.api.createFactura(payload);

    op$.subscribe({
      next: (f: Factura) => {
        this.guardando = false;
        this.mostrarToast('Factura guardada correctamente', 'success');
        if (abrirPDF) window.open(this.api.getPdfUrl(f.id!), '_blank');
        setTimeout(() => this.router.navigate(['/facturas']), 1200);
      },
      error: () => {
        this.guardando = false;
        this.mostrarToast('Error al guardar la factura', 'error');
      }
    });
  }

  mostrarToast(msg: string, tipo: string): void {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3000);
  }

  isInvalid(path: string): boolean {
    const ctrl = this.form.get(path);
    return !!(ctrl?.invalid && ctrl?.touched);
  }
}
