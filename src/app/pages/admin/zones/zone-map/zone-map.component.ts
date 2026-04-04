import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { ProductionLineService } from '../../../../services/production-line.service';
import { ValidationZoneService } from '../../../../services/validation-zone.service';
import { ValidationService } from '../../../../services/validation.service';
import { ValidationResultService } from '../../../../services/validation-result.service';
import { ProductionLine } from '../../../../models/production-line.model';
import { ValidationZone } from '../../../../models/validation-zone.model';
import { Validation } from '../../../../models/validation.model';

interface ZoneMapData {
  zone: ValidationZone;
  totalValidations: number;
  conformCount: number;
  nonConformCount: number;
  activeCount: number;
  conformRate: number;
  riskScore: number;
  riskLevel: string;
  icon: string;
}

interface LineTabData {
  line: ProductionLine;
  color: string;
  zones: ZoneMapData[];
}

@Component({
  selector: 'app-zone-map',
  templateUrl: './zone-map.component.html',
  styleUrls: ['./zone-map.component.scss']
})
export class ZoneMapComponent implements OnInit {

  lineTabs: LineTabData[] = [];
  selectedTab: LineTabData | null = null;
  selectedZone: ZoneMapData | null = null;
  loading = true;

  private lineColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#ec4899'];
  private zoneIcons = ['⊞', '⚡', '⊙', '△', '✓', '◎', '⬡', '◇'];

  riskColors: Record<string, string> = {
    'BAS': '#22c55e',
    'MOYEN': '#f59e0b',
    'RISQUE': '#f97316',
    'CRITIQUE': '#ef4444',
    '—': '#475569'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private lineService: ProductionLineService,
    private zoneService: ValidationZoneService,
    private validationService: ValidationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    forkJoin({
      lines: this.lineService.getAll(),
      zones: this.zoneService.getAll(),
      validations: this.validationService.getAll()
    }).subscribe({
      next: ({ lines, zones, validations }) => {
        this.lineTabs = lines
          .filter(l => l.active)
          .map((line, i) => {
            const lineZones = zones.filter(z => z.productionLineId === line.id);

            const zoneMapData: ZoneMapData[] = lineZones.map((zone, j) => {
              const zoneValidations = validations.filter(
                v => v.validationZoneId === zone.id
              );
              const closedValidations = zoneValidations.filter(
                v => v.status !== 'EN_COURS'
              );
              const conformCount = closedValidations.filter(
                v => v.status === 'CONFORME'
              ).length;
              const nonConformCount = closedValidations.filter(
                v => v.status === 'NON_CONFORME'
              ).length;
              const activeCount = zoneValidations.filter(
                v => v.status === 'EN_COURS'
              ).length;
              const conformRate = closedValidations.length > 0
                ? Math.round((conformCount / closedValidations.length) * 100)
                : 0;

              // Calculate average risk from active validations
              const activeWithRisk = zoneValidations.filter(
                v => v.status === 'EN_COURS' && v.riskScore != null
              );
              const avgRisk = activeWithRisk.length > 0
                ? activeWithRisk.reduce((s, v) => s + (v.riskScore || 0), 0) / activeWithRisk.length
                : 0;
              let riskLevel = '—';
              if (zoneValidations.length > 0) {
                if (avgRisk >= 0.75) riskLevel = 'CRITIQUE';
                else if (avgRisk >= 0.50) riskLevel = 'RISQUE';
                else if (avgRisk >= 0.25) riskLevel = 'MOYEN';
                else riskLevel = 'BAS';
              }

              return {
                zone,
                totalValidations: zoneValidations.length,
                conformCount,
                nonConformCount,
                activeCount,
                conformRate,
                riskScore: Math.round(avgRisk * 100),
                riskLevel,
                icon: this.zoneIcons[j % this.zoneIcons.length]
              };
            });

            return {
              line,
              color: this.lineColors[i % this.lineColors.length],
              zones: zoneMapData
            };
          });

        // Auto-select first tab or tab from query param
        const queryLineId = Number(this.route.snapshot.queryParamMap.get('lineId'));
        if (queryLineId) {
          this.selectedTab = this.lineTabs.find(t => t.line.id === queryLineId) || this.lineTabs[0];
        } else {
          this.selectedTab = this.lineTabs[0] || null;
        }

        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les zones'
        });
        this.loading = false;
      }
    });
  }

  selectTab(tab: LineTabData): void {
    this.selectedTab = tab;
    this.selectedZone = null;
  }

  selectZone(zone: ZoneMapData): void {
    this.selectedZone = this.selectedZone?.zone.id === zone.zone.id ? null : zone;
  }

  closeZoneDetail(): void {
    this.selectedZone = null;
  }

  navigateToCreateValidation(zoneName: string): void {
    this.router.navigate(['/validations/create']);
  }

  navigateToValidationsByZone(zoneId: number): void {
    this.router.navigate(['/validations'], { queryParams: { zoneId } });
  }

  getConformRateColor(rate: number): string {
    if (rate >= 80) return '#22c55e';
    if (rate >= 50) return '#f59e0b';
    return '#ef4444';
  }

  getRiskColor(level: string): string {
    return this.riskColors[level] || '#475569';
  }
}