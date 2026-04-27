import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent }      from './pages/dashboard/dashboard.component';
import { ClientsComponent }        from './pages/clients/clients.component';
import { NewInvoiceComponent }     from './pages/new-invoice/new-invoice.component';
import { InvoiceHistoryComponent } from './pages/invoice-history/invoice-history.component';
import { CatalogComponent }        from './pages/catalog/catalog.component';
import { QuotesListComponent }       from './pages/quotes-list/quotes-list.component';
import { NewQuoteComponent }         from './pages/new-quote/new-quote.component';

const routes: Routes = [
  { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'nueva-factura', component: NewInvoiceComponent },
  { path: 'nueva-factura/:id', component: NewInvoiceComponent },  // edición
  { path: 'facturas',  component: InvoiceHistoryComponent },
  { path: 'clientes',  component: ClientsComponent },
  { path: 'catalogo',  component: CatalogComponent },
  { path: 'presupuestos', component: QuotesListComponent },
  { path: 'nuevo-presupuesto', component: NewQuoteComponent },
  { path: 'nuevo-presupuesto/:id', component: NewQuoteComponent }, // edición
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
