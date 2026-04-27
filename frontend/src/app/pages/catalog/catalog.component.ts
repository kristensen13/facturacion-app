import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CatalogoItem } from '../../models/models';

@Component({
  selector: 'app-catalog',
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.scss']
})
export class CatalogComponent implements OnInit {
  items: CatalogoItem[] = [];
  form!: FormGroup;
  editandoId: number | null = null;
  mostrarModal = false;
  guardando = false;
  toast: { msg: string; tipo: string } | null = null;

  constructor(private fb: FormBuilder, private api: ApiService) {}

  ngOnInit(): void {
    this.initForm();
    this.cargar();
  }

  initForm(): void {
    this.form = this.fb.group({
      concepto:    ['', Validators.required],
      descripcion: [''],
      precio:      [null]
    });
  }

  cargar(): void {
    this.api.getCatalogo().subscribe(items => this.items = items);
  }

  abrirNuevo(): void {
    this.editandoId = null;
    this.form.reset();
    this.mostrarModal = true;
  }

  editar(item: CatalogoItem): void {
    this.editandoId = item.id!;
    this.form.patchValue(item);
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.editandoId = null;
    this.form.reset();
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando = true;

    const datos = this.form.value;
    const op$ = this.editandoId
      ? this.api.updateCatalogoItem(this.editandoId, datos)
      : this.api.createCatalogoItem(datos);

    op$.subscribe({
      next: () => {
        this.guardando = false;
        this.cargar();
        this.cerrarModal();
        this.mostrarToast('Elemento guardado', 'success');
      },
      error: () => { this.guardando = false; this.mostrarToast('Error al guardar', 'error'); }
    });
  }

  eliminar(item: CatalogoItem): void {
    if (!confirm(`¿Eliminar "${item.concepto}"?`)) return;
    this.api.deleteCatalogoItem(item.id!).subscribe({
      next: () => { this.cargar(); this.mostrarToast('Elemento eliminado', 'success'); }
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
