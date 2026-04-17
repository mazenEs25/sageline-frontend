import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ProductionLineService } from '../../../../services/production-line.service';
import { ValidationZoneService } from '../../../../services/validation-zone.service';
import { UserService } from '../../../../services/user.service';
import { ValidationService } from '../../../../services/validation.service';
import { ProductionLine } from '../../../../models/production-line.model';
import { ValidationZone } from '../../../../models/validation-zone.model';
import { User } from '../../../../models/user.model';
import { Validation } from '../../../../models/validation.model';
import { forkJoin } from 'rxjs';

interface LineMapData {
  line: ProductionLine;
  zones: ValidationZone[];
  users: User[];
  validations: Validation[];
  conformRate: number;
  activeValidations: number;
  color: string;
}

@Component({
  selector: 'app-line-map',
  templateUrl: './line-map.component.html',
  styleUrls: ['./line-map.component.scss']
})
export class LineMapComponent implements OnInit {

  lineMapData: LineMapData[] = [];
  selectedLine: LineMapData | null = null;
  loading = true;

  // View toggle
  viewMode: 'map' | 'table' = 'map';

  private lineColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#ec4899'];

  constructor(
    private lineService: ProductionLineService,
    private zoneService: ValidationZoneService,
    private userService: UserService,
    private validationService: ValidationService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    forkJoin({
      lines: this.lineService.getAll(),
      zones: this.zoneService.getAll(),
      users: this.userService.getAll(),
      validations: this.validationService.getAll()
    }).subscribe({
      next: ({ lines, zones, users, validations }) => {
        this.lineMapData = lines.map((line, i) => {
          const lineZones = zones.filter(z => z.productionLineId === line.id);
          const lineZoneIds = lineZones.map(z => z.id);
          const lineUsers = users.filter(u => !!line.secteurId && u.secteurId === line.secteurId);
          const lineValidations = validations.filter(
            v => lineZoneIds.includes(v.validationZoneId)
          );
          const closedValidations = lineValidations.filter(
            v => v.status !== 'EN_COURS'
          );
          const conformCount = closedValidations.filter(
            v => v.status === 'CONFORME'
          ).length;
          const conformRate = closedValidations.length > 0
            ? Math.round((conformCount / closedValidations.length) * 1000) / 10
            : 0;
          const activeValidations = lineValidations.filter(
            v => v.status === 'EN_COURS'
          ).length;

          return {
            line,
            zones: lineZones,
            users: lineUsers,
            validations: lineValidations,
            conformRate,
            activeValidations,
            color: this.lineColors[i % this.lineColors.length]
          };
        });

        this.loading = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les données'
        });
        this.loading = false;
      }
    });
  }

  selectLine(data: LineMapData): void {
    this.selectedLine = this.selectedLine?.line.id === data.line.id ? null : data;
  }

  closeDetail(): void {
    this.selectedLine = null;
  }

  navigateToZoneMap(lineId: number): void {
    this.router.navigate(['/admin/zones'], { queryParams: { lineId } });
  }

  navigateToLineList(): void {
    this.router.navigate(['/admin/lines']);
  }

  toggleLineActive(data: LineMapData, event: Event): void {
    event.stopPropagation();

    const action$ = data.line.active
      ? this.lineService.deactivate(data.line.id)
      : this.lineService.activate(data.line.id);

    action$.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: `Ligne "${data.line.code}" ${data.line.active ? 'désactivée' : 'activée'}`
        });
        this.loadData();
        this.selectedLine = null;
      }
    });
  }

  getConformRateClass(rate: number): string {
    if (rate >= 90) return 'rate-excellent';
    if (rate >= 75) return 'rate-good';
    if (rate >= 50) return 'rate-warning';
    return 'rate-danger';
  }

  get totalLines(): number { return this.lineMapData.length; }
  get activeLines(): number { return this.lineMapData.filter(d => d.line.active).length; }
  get totalZones(): number { return this.lineMapData.reduce((s, d) => s + d.zones.length, 0); }
  get totalActiveValidations(): number { return this.lineMapData.reduce((s, d) => s + d.activeValidations, 0); }
}