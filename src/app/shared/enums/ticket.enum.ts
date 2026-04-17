// ===== NEW (add these) =====
export type TicketStatus = 'PLANIFIE' | 'EN_ATTENTE_PREP' | 'PREP_VALIDEE' | 'EN_COURS' | 'EN_REVUE' | 'CONFORME' | 'NON_CONFORME' | 'ANNULE';
export type Priority = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';
export type AssignmentRole = 'TECH_VALIDATION' | 'TECH_PREPARATION';
export type AssignmentStatus = 'ASSIGNE' | 'EN_COURS' | 'TERMINE';
export type PosteType = 'ACC' | 'TEST_FONCTIONNEL' | 'WIFI_CONDUIT' | 'WIFI_RY' | 'BANC_RX_TX' | 'BANC_SENSI' | 'BANC_TT' | 'BANC_TX' | 'AQ_LIGNE' | 'TELECHARGEMENT' | 'BANC_NFT' | 'BANC_NFT_BOUTON' | 'TEST_BOUTON' | 'TEST_VISION' | 'TEST_DOCSIS' | 'TEST_SYNCHRO_GPON' | 'BANC_AUDIO_VIDEO' | 'BANC_WIFI_CONDUIT' | 'BPO' | 'FSOS' | 'BANC_ETANCHEITE' | 'BANC_ACOUSTIQUE';
// ===== LABEL MAPS (for display in templates) =====
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
    PLANIFIE: 'Planifié',
    EN_ATTENTE_PREP: 'Attente Prép.',
    PREP_VALIDEE: 'Prép. Validée',
    EN_COURS: 'En Cours',
    EN_REVUE: 'En Revue',
    CONFORME: 'Conforme',
    NON_CONFORME: 'Non Conforme',
    ANNULE: 'Annulé'
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
    PLANIFIE: 'info',
    EN_ATTENTE_PREP: 'warning',
    PREP_VALIDEE: 'info',
    EN_COURS: 'warning',
    EN_REVUE: 'help',
    CONFORME: 'success',
    NON_CONFORME: 'danger',
    ANNULE: 'secondary'
};

export const TICKET_STATUS_ICONS: Record<TicketStatus, string> = {
    PLANIFIE: 'pi pi-calendar',
    EN_ATTENTE_PREP: 'pi pi-wrench',
    PREP_VALIDEE: 'pi pi-check-circle',
    EN_COURS: 'pi pi-spinner pi-spin',
    EN_REVUE: 'pi pi-eye',
    CONFORME: 'pi pi-verified',
    NON_CONFORME: 'pi pi-times-circle',
    ANNULE: 'pi pi-ban'
};

export const PRIORITY_LABELS: Record<Priority, string> = {
    BASSE: 'Basse',
    NORMALE: 'Normale',
    HAUTE: 'Haute',
    URGENTE: 'Urgente'
};

export const PRIORITY_COLORS: Record<Priority, string> = {
    BASSE: 'secondary',
    NORMALE: 'info',
    HAUTE: 'warning',
    URGENTE: 'danger'
};