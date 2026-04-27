import { Component, OnInit } from '@angular/core';
import { ApiService } from './services/api.service';
import { Empresa } from './models/models';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  empresa: Empresa | null = null;
  isDark = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getEmpresa().subscribe({ next: e => this.empresa = e, error: () => {} });

    // Restore saved theme preference
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.isDark = saved ? saved === 'dark' : prefersDark;
    this.applyTheme();
  }

  toggleTheme(): void {
    this.isDark = !this.isDark;
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    if (this.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
