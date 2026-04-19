import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { ValidationResultService } from '../../../services/validation-result.service';
import { ValidationService } from '../../../services/validation.service';
import { ValidationZoneService } from '../../../services/validation-zone.service';
import { ProductionLineService } from '../../../services/production-line.service';
import { ValidationResult } from '../../../models/validation-result.model';
import { Validation } from '../../../models/validation.model';
import { ValidationZone } from '../../../models/validation-zone.model';
import { ProductionLine } from '../../../models/production-line.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-result-list',
  templateUrl: './result-list.component.html',
  styleUrls: ['./result-list.component.scss']
})
export class ResultListComponent implements OnInit {

  results: ValidationResult[] = [];
  validations: Validation[] = [];
  zones: ValidationZone[] = [];
  lines: ProductionLine[] = [];
  loading = true;

  // Filter
  selectedValidationId: number | null = null;
  validationOptions: any[] = [];

  // Add Result Dialog
  showAddDialog = false;
  saving = false;
  newResult = {
    validationId: null as number | null,
    parameter: '',
    measuredValue: null as number | null,
    expectedValue: null as number | null
  };
  // Only EN_COURS validations should be available to TECH_VAL
  enCoursOptions: any[] = [];

  constructor(
    private resultService: ValidationResultService,
    private validationService: ValidationService,
    private zoneService: ValidationZoneService,
    private lineService: ProductionLineService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      results: this.resultService.getAll(),
      validations: this.validationService.getAll(),
      zones: this.zoneService.getAll(),
      lines: this.lineService.getAll()
    }).subscribe({
      next: ({ results, validations, zones, lines }) => {
        this.results = results;
        this.validations = validations;
        this.zones = zones;
        this.lines = lines;

        this.validationOptions = [
          { label: 'Toutes les validations', value: null },
          ...validations.map(v => ({
            label: `#${v.id} — ${this.getZoneName(v.validationZoneId)} (${this.getStatusLabel(v.status)})`,
            value: v.id
          }))
        ];

        // Only EN_COURS validations can receive new results
        this.enCoursOptions = validations
          .filter(v => v.status === 'EN_COURS')
          .map(v => ({
            label: `#${v.id} — ${this.getZoneName(v.validationZoneId)}`,
            value: v.id
          }));

        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les résultats' });
        this.loading = false;
      }
    });
  }

  // ─── Add Result Dialog ───

  openAddDialog(): void {
    this.newResult = {
      validationId: this.selectedValidationId,
      parameter: '',
      measuredValue: null,
      expectedValue: null
    };
    this.showAddDialog = true;
  }

  saveResult(): void {
    if (!this.newResult.validationId || !this.newResult.parameter.trim()
        || this.newResult.measuredValue === null || this.newResult.expectedValue === null) {
      this.messageService.add({ severity: 'warn', summary: 'Champs requis', detail: 'Tous les champs sont obligatoires' });
      return;
    }

    this.saving = true;
    const payload = {
      validationId: this.newResult.validationId,
      parameter: this.newResult.parameter.trim(),
      measuredValue: this.newResult.measuredValue,
      expectedValue: this.newResult.expectedValue
    };

    this.resultService.create(payload as any).subscribe({
      next: (created) => {
        this.results = [...this.results, created];
        this.messageService.add({ severity: 'success', summary: 'Résultat ajouté',
          detail: `"${created.parameter}" — ${created.conform ? 'Conforme ✓' : 'Non conforme ✗'}` });
        this.showAddDialog = false;
        this.saving = false;
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Erreur',
          detail: err?.error?.message || 'Impossible d\'ajouter le résultat' });
        this.saving = false;
      }
    });
  }

  get filteredResults(): ValidationResult[] {
    if (!this.selectedValidationId) return this.results;
    return this.results.filter(r => r.validationId === this.selectedValidationId);
  }

  // ─── PDF Export ───

  exportPDF(validationIdOverride?: number): void {
    // If a specific validation was requested, force-filter on it — otherwise
    // fall back to whatever's currently selected in the dropdown.
    const scopeId = validationIdOverride ?? this.selectedValidationId ?? null;
    const data = scopeId
      ? this.results.filter(r => r.validationId === scopeId)
      : this.results;

    if (data.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Aucune donnée', detail: 'Pas de résultats à exporter' });
      return;
    }

    const doc = new jsPDF();
    const now = new Date();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(241, 245, 249);
    doc.setFontSize(20);
    doc.text('SageLine', 14, 18);
    doc.setFontSize(10);
    doc.text('Rapport des résultats de validation', 14, 26);
    doc.setFontSize(8);
    doc.text(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 14, 33);

    // Stats summary
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text('Résumé', 14, 50);

    const totalResults = data.length;
    const conformCount = data.filter(r => r.conform).length;
    const nonConformCount = totalResults - conformCount;
    const conformRate = totalResults > 0 ? ((conformCount / totalResults) * 100).toFixed(1) : '0';

    doc.setFontSize(9);
    doc.text(`Total mesures: ${totalResults}`, 14, 58);
    doc.text(`Conformes: ${conformCount}`, 70, 58);
    doc.text(`Non conformes: ${nonConformCount}`, 120, 58);
    doc.text(`Taux conformité: ${conformRate}%`, 14, 65);

    if (scopeId) {
      const v = this.validations.find(val => val.id === scopeId);
      if (v) {
        doc.text(`Validation: #${v.id} — ${this.getZoneName(v.validationZoneId)}`, 14, 72);
        doc.text(`Statut: ${this.getStatusLabel(v.status)}`, 120, 72);
      } else {
        doc.text(`Validation: #${scopeId}`, 14, 72);
      }
    }

    // Table
    const tableData = data.map(r => {
      const deviation = r.expectedValue !== 0
        ? ((Math.abs(r.measuredValue - r.expectedValue) / r.expectedValue) * 100).toFixed(1) + '%'
        : '—';
      return [
        r.parameter,
        r.measuredValue.toString(),
        r.expectedValue.toString(),
        deviation,
        r.conform ? 'Conforme' : 'Non conforme',
        `#${r.validationId}`
      ];
    });

    autoTable(doc, {
      startY: scopeId ? 80 : 73,
      head: [['Paramètre', 'Mesuré', 'Attendu', 'Écart', 'Conformité', 'Validation']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [148, 163, 184],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249],
      },
      columnStyles: {
        4: {
          cellWidth: 28,
          fontStyle: 'bold',
        }
      },
      didParseCell: (data: any) => {
        // Color conform/non-conform cells
        if (data.column.index === 4 && data.section === 'body') {
          if (data.cell.raw === 'Non conforme') {
            data.cell.styles.textColor = [239, 68, 68];
          } else {
            data.cell.styles.textColor = [16, 185, 129];
          }
        }
      }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `SageLine — Rapport de validation — Page ${i}/${pageCount}`,
        105, 290, { align: 'center' }
      );
    }

    // Save
    const filename = scopeId
      ? `SageLine_Resultats_Validation_${scopeId}.pdf`
      : `SageLine_Resultats_${now.toISOString().split('T')[0]}.pdf`;

    doc.save(filename);

    this.messageService.add({
      severity: 'success',
      summary: 'PDF généré',
      detail: `Rapport "${filename}" téléchargé`
    });
  }

  exportValidationPDF(validationId: number | undefined | null): void {
    if (!validationId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Export impossible',
        detail: 'ID de validation introuvable pour cette ligne.'
      });
      return;
    }
    // Pass the id directly — avoids a race where selectedValidationId isn't
    // yet applied when exportPDF runs, and avoids mutating the dropdown state.
    this.exportPDF(validationId);
  }

  // ─── Helpers ───

  getDeviation(r: ValidationResult): string {
    if (r.expectedValue === 0) return '—';
    return ((Math.abs(r.measuredValue - r.expectedValue) / r.expectedValue) * 100).toFixed(1);
  }

  getDeviationClass(r: ValidationResult): string {
    const dev = r.expectedValue !== 0
      ? (Math.abs(r.measuredValue - r.expectedValue) / r.expectedValue) * 100 : 0;
    if (dev > 20) return 'dev-critical';
    if (dev > 10) return 'dev-warning';
    if (dev > 5) return 'dev-medium';
    return 'dev-ok';
  }

  getZoneName(zoneId: number): string {
    return this.zones.find(z => z.id === zoneId)?.name || '—';
  }

  getLineName(zoneId: number): string {
    const zone = this.zones.find(z => z.id === zoneId);
    if (!zone) return '—';
    return this.lines.find(l => l.id === zone.productionLineId)?.code || '—';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'EN_COURS': return 'En cours';
      case 'CONFORME': return 'Conforme';
      case 'NON_CONFORME': return 'Non conforme';
      default: return status;
    }
  }

  get conformCount(): number { return this.filteredResults.filter(r => r.conform).length; }
  get nonConformCount(): number { return this.filteredResults.filter(r => !r.conform).length; }
  get conformRate(): number {
    const total = this.filteredResults.length;
    return total > 0 ? Math.round((this.conformCount / total) * 1000) / 10 : 0;
  }
}