import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin, interval, Subscription } from 'rxjs';
import { KpiService } from '../../services/kpi.service';
import { ValidationService } from '../../services/validation.service';
import { ProductionLineService } from '../../services/production-line.service';
import { ValidationZoneService } from '../../services/validation-zone.service';
import { Validation } from '../../models/validation.model';
import { ProductionLine } from '../../models/production-line.model';
import { ValidationZone } from '../../models/validation-zone.model';
import { DashboardData } from '../../models/kpi.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  // Data
  dashboard: DashboardData | null = null;
  validations: Validation[] = [];
  lines: ProductionLine[] = [];
  zones: ValidationZone[] = [];
  loading = true;

  // Recent & Alerts
  recentValidations: Validation[] = [];
  aiAlerts: Validation[] = [];

  // Per-line data for charts
  lineConformityRates: { line: string; rate: number; color: string }[] = [];
  lineValidationCounts: { line: string; count: number }[] = [];

  // Charts
  conformityChartData: any;
  conformityChartOptions: any;
  riskDistributionData: any;
  riskDistributionOptions: any;
  lineComparisonData: any;
  lineComparisonOptions: any;
  timelineData: any;
  timelineOptions: any;

  // Auto-refresh
  private refreshSub?: Subscription;
  lastRefresh = new Date();

  // Chart colors
  private chartColors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    orange: '#f97316',
    purple: '#8b5cf6',
    grid: '#1e293b',
    text: '#64748b',
    surface: '#0f172a',
  };

  constructor(
    private kpiService: KpiService,
    private validationService: ValidationService,
    private lineService: ProductionLineService,
    private zoneService: ValidationZoneService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAll();

    // Auto-refresh every 60 seconds
    this.refreshSub = interval(60000).subscribe(() => this.loadAll());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadAll(): void {
    this.loading = true;

    forkJoin({
      dashboard: this.kpiService.getGlobalDashboard(),
      validations: this.validationService.getAll(),
      lines: this.lineService.getAll(),
      zones: this.zoneService.getAll()
    }).subscribe({
      next: ({ dashboard, validations, lines, zones }) => {
        this.dashboard = dashboard;
        this.validations = validations;
        this.lines = lines;
        this.zones = zones;

        this.processRecentValidations();
        this.processAiAlerts();
        this.buildLineStats();
        this.buildCharts();

        this.loading = false;
        this.lastRefresh = new Date();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger le tableau de bord'
        });
        this.loading = false;
      }
    });
  }

  // ─── Data Processing ───

  processRecentValidations(): void {
    this.recentValidations = [...this.validations]
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 8);
  }

  processAiAlerts(): void {
    this.aiAlerts = this.validations
      .filter(v => v.riskLevel === 'CRITIQUE' || v.riskLevel === 'RISQUE')
      .filter(v => v.status === 'EN_COURS')
      .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
      .slice(0, 5);
  }

  buildLineStats(): void {
    const activeLines = this.lines.filter(l => l.active);
    const lineColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

    this.lineConformityRates = activeLines.map((line, i) => {
      const lineZoneIds = this.zones
        .filter(z => z.productionLineId === line.id)
        .map(z => z.id);
      const lineValidations = this.validations.filter(
        v => lineZoneIds.includes(v.validationZoneId) && v.status !== 'EN_COURS'
      );
      const conformCount = lineValidations.filter(v => v.status === 'CONFORME').length;
      const rate = lineValidations.length > 0
        ? (conformCount / lineValidations.length) * 100
        : 0;

      return {
        line: line.code,
        rate: Math.round(rate * 10) / 10,
        color: lineColors[i % lineColors.length]
      };
    });

    this.lineValidationCounts = activeLines.map(line => {
      const lineZoneIds = this.zones
        .filter(z => z.productionLineId === line.id)
        .map(z => z.id);
      return {
        line: line.code,
        count: this.validations.filter(v => lineZoneIds.includes(v.validationZoneId)).length
      };
    });
  }

  // ─── Charts ───

  buildCharts(): void {
    this.buildConformityChart();
    this.buildRiskDistribution();
    this.buildLineComparison();
    this.buildTimeline();
  }

  buildConformityChart(): void {
    const conforme = this.validations.filter(v => v.status === 'CONFORME').length;
    const nonConforme = this.validations.filter(v => v.status === 'NON_CONFORME').length;
    const enCours = this.validations.filter(v => v.status === 'EN_COURS').length;

    this.conformityChartData = {
      labels: ['Conforme', 'Non conforme', 'En cours'],
      datasets: [{
        data: [conforme, nonConforme, enCours],
        backgroundColor: [
          this.chartColors.success,
          this.chartColors.danger,
          this.chartColors.warning,
        ],
        borderWidth: 0,
        hoverOffset: 8,
      }]
    };

    this.conformityChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: this.chartColors.text,
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10,
            font: { size: 12, family: "'DM Sans', sans-serif" }
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: "'DM Sans', sans-serif" },
          bodyFont: { family: "'DM Sans', sans-serif" },
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx: any) => {
              const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0';
              return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
            }
          }
        }
      }
    };
  }

  buildRiskDistribution(): void {
    const bas = this.validations.filter(v => v.riskLevel === 'BAS').length;
    const moyen = this.validations.filter(v => v.riskLevel === 'MOYEN').length;
    const risque = this.validations.filter(v => v.riskLevel === 'RISQUE').length;
    const critique = this.validations.filter(v => v.riskLevel === 'CRITIQUE').length;

    this.riskDistributionData = {
      labels: ['Bas', 'Moyen', 'Risque', 'Critique'],
      datasets: [{
        label: 'Validations',
        data: [bas, moyen, risque, critique],
        backgroundColor: [
          `${this.chartColors.success}CC`,
          `${this.chartColors.warning}CC`,
          `${this.chartColors.orange}CC`,
          `${this.chartColors.danger}CC`,
        ],
        borderRadius: 6,
        borderSkipped: false,
        barThickness: 36,
      }]
    };

    this.riskDistributionOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: "'DM Sans', sans-serif" },
          bodyFont: { family: "'DM Sans', sans-serif" },
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
        }
      },
      scales: {
        x: {
          grid: { color: this.chartColors.grid, drawBorder: false },
          ticks: {
            color: this.chartColors.text,
            font: { size: 11, family: "'DM Sans', sans-serif" },
            stepSize: 1,
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            color: this.chartColors.text,
            font: { size: 12, family: "'DM Sans', sans-serif", weight: '600' },
          }
        }
      }
    };
  }

  buildLineComparison(): void {
    const labels = this.lineConformityRates.map(l => l.line);
    const rates = this.lineConformityRates.map(l => l.rate);
    const colors = this.lineConformityRates.map(l => l.color + 'CC');

    const counts = this.lineValidationCounts.map(l => l.count);

    this.lineComparisonData = {
      labels,
      datasets: [
        {
          label: 'Taux conformité (%)',
          data: rates,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 28,
          yAxisID: 'y',
        },
        {
          label: 'Nb validations',
          data: counts,
          type: 'line',
          borderColor: this.chartColors.purple,
          backgroundColor: `${this.chartColors.purple}20`,
          pointBackgroundColor: this.chartColors.purple,
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
          pointRadius: 5,
          tension: 0.3,
          fill: false,
          yAxisID: 'y1',
        }
      ]
    };

    this.lineComparisonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: this.chartColors.text,
            padding: 16,
            usePointStyle: true,
            font: { size: 11, family: "'DM Sans', sans-serif" }
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: "'DM Sans', sans-serif" },
          bodyFont: { family: "'DM Sans', sans-serif" },
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: this.chartColors.text,
            font: { size: 12, family: "'DM Sans', sans-serif", weight: '600' },
          }
        },
        y: {
          position: 'left' as const,
          min: 0,
          max: 100,
          grid: { color: this.chartColors.grid, drawBorder: false },
          ticks: {
            color: this.chartColors.text,
            font: { size: 11, family: "'DM Sans', sans-serif" },
            callback: (val: any) => val + '%',
          },
          title: {
            display: true,
            text: 'Conformité (%)',
            color: this.chartColors.text,
            font: { size: 11, family: "'DM Sans', sans-serif" }
          }
        },
        y1: {
          position: 'right' as const,
          min: 0,
          grid: { display: false },
          ticks: {
            color: this.chartColors.purple,
            font: { size: 11, family: "'DM Sans', sans-serif" },
            stepSize: 1,
          },
          title: {
            display: true,
            text: 'Validations',
            color: this.chartColors.purple,
            font: { size: 11, family: "'DM Sans', sans-serif" }
          }
        }
      }
    };
  }

  buildTimeline(): void {
    // Group validations by day (last 14 days)
    const days = 14;
    const now = new Date();
    const labels: string[] = [];
    const conformeData: number[] = [];
    const nonConformeData: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      labels.push(label);

      const dayValidations = this.validations.filter(v => {
        const vDate = new Date(v.startDate).toISOString().split('T')[0];
        return vDate === dateStr;
      });

      conformeData.push(dayValidations.filter(v => v.status === 'CONFORME').length);
      nonConformeData.push(dayValidations.filter(v => v.status === 'NON_CONFORME').length);
    }

    this.timelineData = {
      labels,
      datasets: [
        {
          label: 'Conformes',
          data: conformeData,
          borderColor: this.chartColors.success,
          backgroundColor: `${this.chartColors.success}15`,
          pointBackgroundColor: this.chartColors.success,
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Non conformes',
          data: nonConformeData,
          borderColor: this.chartColors.danger,
          backgroundColor: `${this.chartColors.danger}15`,
          pointBackgroundColor: this.chartColors.danger,
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
        }
      ]
    };

    this.timelineOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: this.chartColors.text,
            padding: 16,
            usePointStyle: true,
            font: { size: 11, family: "'DM Sans', sans-serif" }
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { family: "'DM Sans', sans-serif" },
          bodyFont: { family: "'DM Sans', sans-serif" },
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
        }
      },
      scales: {
        x: {
          grid: { color: this.chartColors.grid, drawBorder: false },
          ticks: {
            color: this.chartColors.text,
            font: { size: 10, family: "'DM Sans', sans-serif" },
            maxRotation: 45,
          }
        },
        y: {
          min: 0,
          grid: { color: this.chartColors.grid, drawBorder: false },
          ticks: {
            color: this.chartColors.text,
            font: { size: 11, family: "'DM Sans', sans-serif" },
            stepSize: 1,
          }
        }
      }
    };
  }

  // ─── Helpers ───

  getZoneName(zoneId: number): string {
    return this.zones.find(z => z.id === zoneId)?.name || '—';
  }

  getLineCode(zoneId: number): string {
    const zone = this.zones.find(z => z.id === zoneId);
    if (!zone) return '—';
    return this.lines.find(l => l.id === zone.productionLineId)?.code || '—';
  }

  getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined {
    switch (status) {
      case 'EN_COURS': return 'warning';
      case 'CONFORME': return 'success';
      case 'NON_CONFORME': return 'danger';
      default: return 'info';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'EN_COURS': return 'En cours';
      case 'CONFORME': return 'Conforme';
      case 'NON_CONFORME': return 'Non conforme';
      default: return status;
    }
  }

  getRiskColor(level?: string): string {
    switch (level) {
      case 'CRITIQUE': return '#ef4444';
      case 'RISQUE': return '#f97316';
      case 'MOYEN': return '#f59e0b';
      case 'BAS': return '#10b981';
      default: return '#475569';
    }
  }

  getRiskIcon(level?: string): string {
    switch (level) {
      case 'CRITIQUE': return 'pi pi-times-circle';
      case 'RISQUE': return 'pi pi-exclamation-triangle';
      case 'MOYEN': return 'pi pi-info-circle';
      case 'BAS': return 'pi pi-check-circle';
      default: return 'pi pi-minus';
    }
  }

  get conformityRate(): number {
    return this.dashboard?.conformityRate ?? 0;
  }

  get conformityRateClass(): string {
    if (this.conformityRate >= 90) return 'rate-excellent';
    if (this.conformityRate >= 75) return 'rate-good';
    if (this.conformityRate >= 50) return 'rate-warning';
    return 'rate-danger';
  }

  viewValidation(id: number): void {
    this.router.navigate(['/validations', id]);
  }

  navigateToValidations(): void {
    this.router.navigate(['/validations']);
  }

  refresh(): void {
    this.loadAll();
    this.messageService.add({
      severity: 'info',
      summary: 'Actualisé',
      detail: 'Tableau de bord mis à jour',
      life: 2000
    });
  }
}