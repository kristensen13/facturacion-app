import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Cliente, CatalogoItem, Presupuesto } from '../../models/models';
import { TuiDay } from '@taiga-ui/cdk';

@Component({
  selector: 'app-new-quote',
  templateUrl: './new-quote.component.html',
  styleUrls: ['./new-quote.component.scss']
})
export class NewQuoteComponent implements OnInit {
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
      this.cargarPresupuesto(+id);
    }
  }

  inicializarForm(): void {
    const hoy = new Date();
    const validez = new Date();
    validez.setDate(hoy.getDate() + 30);

    this.form = this.fb.group({
      cliente_id: ['', Validators.required],
      fecha: [TuiDay.currentLocal(), Validators.required],
      validez_hasta: [TuiDay.fromLocalNativeDate(validez)],
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
      this.api.getNextNumeroPresupuesto().subscribe(r => this.nextNumero = r.numero);
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


  cargarPresupuesto(id: number): void {
    this.api.getPresupuesto(id).subscribe(p => {
      this.nextNumero = p.numero!;
      
      const [yearF, monthF, dayF] = p.fecha.split('-').map(Number);
      let tuiValidez = null;
      if (p.validez_hasta) {
        const [yearV, monthV, dayV] = p.validez_hasta.split('T')[0].split('-').map(Number);
        tuiValidez = new TuiDay(yearV, monthV - 1, dayV);
      }

      this.form.patchValue({
        cliente_id: p.cliente_id,
        fecha: new TuiDay(yearF, monthF - 1, dayF),
        validez_hasta: tuiValidez,
        estado: p.estado,
        notas: p.notas || ''
      });
      // Limpiar y recargar líneas
      this.lineasArray.clear();
      (p.lineas || []).forEach(l => {
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
    
    let validezStr: string | undefined = undefined;
    if (this.form.value.validez_hasta) {
      const valV = this.form.value.validez_hasta as TuiDay;
      validezStr = `${valV.year}-${String(valV.month + 1).padStart(2, '0')}-${String(valV.day).padStart(2, '0')}`;
    }

    const payload = {
      cliente_id: +this.form.value.cliente_id,
      fecha: fechaStr,
      validez_hasta: validezStr,
      estado: this.form.value.estado,
      notas: this.form.value.notas,
      lineas: this.form.value.lineas.map((l: any) => ({ concepto: l.concepto, importe: +l.importe }))
    };

    const op$ = this.editandoId
      ? this.api.updatePresupuesto(this.editandoId, payload)
      : this.api.createPresupuesto(payload);

    op$.subscribe({
      next: (p: Presupuesto) => {
        this.guardando = false;
        this.mostrarToast('Presupuesto guardado correctamente', 'success');
        if (abrirPDF) window.open(this.api.getPresupuestoPdfUrl(p.id!), '_blank');
        setTimeout(() => this.router.navigate(['/presupuestos']), 1200);
      },
      error: () => {
        this.guardando = false;
        this.mostrarToast('Error al guardar el presupuesto', 'error');
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

  cancelar(): void {
    this.router.navigate(['/presupuestos']);
  }
}
