import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Secteur } from '../../../models/secteur.model';
import { Validation } from '../../../models/validation.model';
import { SecteurService } from '../../../services/secteur.service';
import { TicketService } from '../../../services/ticket.service';
import { TicketStatus, Priority, TICKET_STATUS_LABELS, PRIORITY_LABELS } from '../../../shared/enums/ticket.enum';


@Component({
  selector: 'app-ticket-list',
  templateUrl: './ticket-list.component.html',
  providers: [MessageService]
})
export class TicketListComponent implements OnInit {
  tickets: Validation[] = [];
  filteredTickets: Validation[] = [];
  secteurs: Secteur[] = [];
  loading = true;

  // Filters
  selectedStatus: TicketStatus | null = null;
  selectedSecteur: number | null = null;
  selectedPriority: Priority | null = null;
  searchQuery = '';

  statusOptions = Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => ({ label: v, value: k }));
  priorityOptions = Object.entries(PRIORITY_LABELS).map(([k, v]) => ({ label: v, value: k }));

  constructor(
    private ticketService: TicketService,
    private secteurService: SecteurService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.ticketService.getAll().subscribe({
      next: (data) => {
        this.tickets = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });

    this.secteurService.getActive().subscribe(data => this.secteurs = data);
  }

  applyFilters() {
    this.filteredTickets = this.tickets.filter(t => {
      if (this.selectedStatus && t.status !== this.selectedStatus) return false;
      if (this.selectedSecteur && t.secteurId !== this.selectedSecteur) return false;
      if (this.selectedPriority && t.priority !== this.selectedPriority) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        return t.ticketCode?.toLowerCase().includes(q) ||
               t.zoneName?.toLowerCase().includes(q) ||
               t.lineName?.toLowerCase().includes(q);
      }
      return true;
    });
  }

  clearFilters() {
    this.selectedStatus = null;
    this.selectedSecteur = null;
    this.selectedPriority = null;
    this.searchQuery = '';
    this.applyFilters();
  }

  viewTicket(ticket: Validation) {
    this.router.navigate(['/validations', ticket.id]);
  }

  createTicket() {
    this.router.navigate(['/validations/create']);
  }

  // Stats cards
  get totalCount() { return this.tickets.length; }
  get activeCount() { return this.tickets.filter(t => !['CONFORME', 'NON_CONFORME', 'ANNULE'].includes(t.status)).length; }
  get conformeCount() { return this.tickets.filter(t => t.status === 'CONFORME').length; }
  get nonConformeCount() { return this.tickets.filter(t => t.status === 'NON_CONFORME').length; }
}