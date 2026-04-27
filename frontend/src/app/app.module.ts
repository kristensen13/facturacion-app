import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TuiRootModule, TuiDialogModule, TuiAlertModule, TuiButtonModule, TuiTextfieldControllerModule, TuiDataListModule } from '@taiga-ui/core';
import { TuiInputModule, TuiInputNumberModule, TuiSelectModule, TuiInputDateModule, TuiDataListWrapperModule, TuiTextAreaModule } from '@taiga-ui/kit';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { DashboardComponent }        from './pages/dashboard/dashboard.component';
import { ClientsComponent }          from './pages/clients/clients.component';
import { NewInvoiceComponent }       from './pages/new-invoice/new-invoice.component';
import { InvoiceHistoryComponent }   from './pages/invoice-history/invoice-history.component';
import { CatalogComponent }          from './pages/catalog/catalog.component';
import { ClienteInfoPopupComponent } from './pages/clients/cliente-info-popup/cliente-info-popup.component';
import { QuotesListComponent }       from './pages/quotes-list/quotes-list.component';
import { NewQuoteComponent }         from './pages/new-quote/new-quote.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    ClientsComponent,
    NewInvoiceComponent,
    InvoiceHistoryComponent,
    CatalogComponent,
    ClienteInfoPopupComponent,
    QuotesListComponent,
    NewQuoteComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    AppRoutingModule,
    TuiRootModule,
    TuiDialogModule,
    TuiAlertModule,
    TuiInputModule,
    TuiInputNumberModule,
    TuiSelectModule,
    TuiInputDateModule,
    TuiTextAreaModule,
    TuiButtonModule,
    TuiTextfieldControllerModule,
    TuiDataListModule,
    TuiDataListWrapperModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
