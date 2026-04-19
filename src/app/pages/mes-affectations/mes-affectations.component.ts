import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService } from '../../services/ticket.service';
import { Validation } from '../../models/validation.model';

interface AssignedLine {
  lineId: number;
  lineCode: string;
  lineName: string;
  secteurCode?: string;
  ticketCount: number;
}

interface AssignedZone {
  zoneId: number;
  zoneName: string;
  posteType?: string;
  lineCode?: string;
  lineName?: string;
  ticketCount: number;
}

interface AssignedPhase {
  phaseId: number;
  phaseCode: string;
  phaseName: string;
  secteurCode?: string;
  ticketCount: number;
}

@Component({
  selector: 'app-mes-affectations',
  templateUrl: './mes-affectations.component.html',
  styleUrls: ['./mes-affectations.component.scss']
})
export class MesAffectationsComponent implements OnInit {
  loading = true;
  tickets: Validation[] = [];
  lines: AssignedLine[] = [];
  zones: AssignedZone[] = [];
  phases: AssignedPhase[] = [];

  activeTabIndex = 0;

  constructor(
    private ticketService: TicketService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAssignments();
  }

  loadAssignments() {
    this.loading = true;
    this.ticketService.getMyTickets().subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.buildLines(tickets);
        this.buildZones(tickets);
        this.buildPhases(tickets);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private buildLines(tickets: Validation[]) {
    const map = new Map<number, AssignedLine>();
    for (const t of tickets) {
      if (!t.lineId) continue;
      const existing = map.get(t.lineId);
      if (existing) {
        existing.ticketCount++;
      } else {
        map.set(t.lineId, {
          lineId: t.lineId,
          lineCode: t.lineCode || '—',
          lineName: t.lineName || '—',
          secteurCode: t.secteurCode,
          ticketCount: 1
        });
      }
    }
    this.lines = Array.from(map.values());
  }

  private buildZones(tickets: Validation[]) {
    const map = new Map<number, AssignedZone>();
    for (const t of tickets) {
      if (!t.validationZoneId) continue;
      const existing = map.get(t.validationZoneId);
      if (existing) {
        existing.ticketCount++;
      } else {
        map.set(t.validationZoneId, {
          zoneId: t.validationZoneId,
          zoneName: t.zoneName,
          posteType: t.posteType,
          lineCode: t.lineCode,
          lineName: t.lineName,
          ticketCount: 1
        });
      }
    }
    this.zones = Array.from(map.values());
  }

  private buildPhases(tickets: Validation[]) {
    const map = new Map<number, AssignedPhase>();
    for (const t of tickets) {
      if (!t.phaseId) continue;
      const existing = map.get(t.phaseId);
      if (existing) {
        existing.ticketCount++;
      } else {
        map.set(t.phaseId, {
          phaseId: t.phaseId,
          phaseCode: t.phaseCode || '—',
          phaseName: t.phaseName || '—',
          secteurCode: t.secteurCode,
          ticketCount: 1
        });
      }
    }
    this.phases = Array.from(map.values());
  }

  goToTickets() {
    this.router.navigate(['/validations']);
  }

  goToTicketsByZone(zoneId: number) {
    this.router.navigate(['/validations'], { queryParams: { zoneId } });
  }
}
