import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Cliente } from '../../models/models';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  clientes: Cliente[] = [];
  form!: FormGroup;
  editandoId: number | null = null;
  mostrarModal = false;
  clientePopup: Cliente | null = null;
  toast: { msg: string; tipo: string } | null = null;
  guardando = false;

  constructor(private fb: FormBuilder, private api: ApiService) {}

  ngOnInit(): void {
    this.initForm();
    this.cargar();
  }

  /**
   * Valida DNI/NIE español: formato regex y algoritmo de letra
   */
  dniNifValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value?.trim().toUpperCase() || '';
    if (!value) return null; // Validators.required se encarga de vacíos

    // Regex para DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra)
    const dniRegex = /^(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])$/;
    if (!dniRegex.test(value)) {
      return { invalidFormat: true };
    }

    // Calcular letra esperada
    const letras = 'TRWAGMYFPDXBNJZSQVHL';
    let numero: number;

    if (value[0] === 'X' || value[0] === 'Y' || value[0] === 'Z') {
      // NIE: X->0, Y->1, Z->2
      const prefijos: Record<string, string> = { 'X': '0', 'Y': '1', 'Z': '2' };
      numero = parseInt(prefijos[value[0]] + value.slice(1, 8), 10);
    } else {
      // DNI: 8 dígitos
      numero = parseInt(value.slice(0, 8), 10);
    }

    const letraEsperada = letras[numero % 23];
    const letraIntroducida = value[value.length - 1];

    if (letraIntroducida !== letraEsperada) {
      return { invalidLetter: true };
    }

    return null;
  }

  initForm(): void {
    this.form = this.fb.group({
      nombre:    ['', Validators.required],
      nif:       ['', [Validators.required, this.dniNifValidator.bind(this)]],
      direccion: [''],
      provincia: [''],
      ciudad:    [''],
      cp:        [''],
      email:     ['', Validators.email],
      telefono:  [''],
      iva:       [0.21, [Validators.required, Validators.min(0), Validators.max(1)]]
    });
  }

  cargar(): void {
    this.api.getClientes().subscribe(c => this.clientes = c);
  }

  verCliente(c: Cliente): void {
    this.clientePopup = c;
  }

  cerrarPopup(): void {
    this.clientePopup = null;
  }

  abrirNuevo(): void {
    this.editandoId = null;
    this.form.reset({ iva: 0.21 });
    this.mostrarModal = true;
  }

  editar(c: Cliente): void {
    this.editandoId = c.id!;
    this.form.patchValue(c);
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.editandoId = null;
    this.form.reset({ iva: 0.21 });
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;

    const datos = this.form.value;
    const op$ = this.editandoId
      ? this.api.updateCliente(this.editandoId, datos)
      : this.api.createCliente(datos);

    op$.subscribe({
      next: () => {
        this.guardando = false;
        this.cargar();
        this.cerrarModal();
        this.mostrarToast('Cliente guardado correctamente', 'success');
      },
      error: () => { this.guardando = false; this.mostrarToast('Error al guardar', 'error'); }
    });
  }

  eliminar(c: Cliente): void {
    if (!confirm(`¿Eliminar a ${c.nombre}?`)) return;
    this.api.deleteCliente(c.id!).subscribe({
      next: () => { this.cargar(); this.mostrarToast('Cliente eliminado', 'success'); }
    });
  }

  mostrarToast(msg: string, tipo: string): void {
    this.toast = { msg, tipo };
    setTimeout(() => this.toast = null, 3000);
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }
}
