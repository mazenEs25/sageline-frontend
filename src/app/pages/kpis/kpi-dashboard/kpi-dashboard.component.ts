import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { KpiService } from '../../../services/kpi.service';
import { ProductionLineService } from '../../../services/production-line.service';
import { ProductionLine } from '../../../models/production-line.model';

@Component({
  selector: 'app-kpi-dashboard',
  templateUrl: './kpi-dashboard.component.html',
  styleUrls: ['./kpi-dashboard.component.scss']
})
export class KpiDashboardComponent implements OnInit {

  lines: ProductionLine[] = [];
  loading = true;
  selectedLineId: number | null = null;

  // KPI data per line
  lineKpis: any[] = [];

  // Charts
  conformityChartData: any;
  conformityChartOptions: any;

  lineOptions: any[] = [];

  constructor(
    private kpiService: KpiService,
    private lineService: ProductionLineService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      lines: this.lineService.getActive(),
      globalDashboard: this.kpiService.getGlobalDashboard()
    }).subscribe({
      next: ({ lines, globalDashboard }) => {
        this.lines = lines;
        this.lineOptions = [
          { label: 'Toutes les lignes', value: null },
          ...lines.map(l => ({ label: `${l.code} — ${l.name}`, value: l.id }))
        ];

        // Load KPIs per line
        this.loadLineKpis(lines);
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les KPIs' });
        this.loading = false;
      }
    });
  }

  loadLineKpis(lines: ProductionLine[]): void {
    lines.forEach(line => {
      this.kpiService.getLineDashboard(line.id).subscribe({
        next: (data) => {
          this.lineKpis.push({
            line: line,
            data: data,
            conformRate: data.conformityRate || 0,
            total: data.totalValidations || 0,
            active: data.activeValidations || 0,
            nonConform: data.nonConformeCount || 0
          });

          // Build chart after all lines loaded
          if (this.lineKpis.length === lines.length) {
            this.buildChart();
          }
        }
      });
    });
  }

  buildChart(): void {
    const labels = this.lineKpis.map(k => k.line.code);
    const rates = this.lineKpis.map(k => k.conformRate);
    const colors = rates.map(r => r >= 90 ? '#10b981' : r >= 75 ? '#3b82f6' : r >= 50 ? '#f59e0b' : '#ef4444');

    this.conformityChartData = {
      labels,
      datasets: [{
        label: 'Taux de conformité (%)',
        data: rates,
        backgroundColor: colors.map(c => c + 'CC'),
        borderRadius: 8,
        barThickness: 40,
      }]
    };

    this.conformityChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          padding: 12,
          callbacks: {
            label: (ctx: any) => ` ${ctx.raw.toFixed(1)}%`
          }
        }
      },
      scales: {
        y: { min: 0, max: 100, grid: { color: '#1e293b' }, ticks: { color: '#64748b', callback: (v: any) => v + '%' } },
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { weight: '600' } } }
      }
    };
  }

  recalculateKpis(lineId: number): void {
    this.kpiService.calculate(lineId).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Recalculé', detail: 'KPIs mis à jour' });
        this.lineKpis = [];
        this.loadData();
      }
    });
  }

  getRateColor(rate: number): string {
    if (rate >= 90) return '#10b981';
    if (rate >= 75) return '#3b82f6';
    if (rate >= 50) return '#f59e0b';
    return '#ef4444';
  }
}