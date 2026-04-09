export enum Role {
  ADMIN_IT = 'ADMIN_IT',
  CHEF_SECTEUR = 'CHEF_SECTEUR',
  EXPERT = 'EXPERT',
  TECH_VAL = 'TECH_VAL',
  TECH_PREP = 'TECH_PREP',
  RESPONSABLE = 'RESPONSABLE'
}

export const ROLE_LABELS: Record<string, string> = {
  'ADMIN_IT': 'Admin IT',
  'CHEF_SECTEUR': 'Chef Secteur',
  'EXPERT': 'Expert',
  'TECH_VAL': 'Tech Validation',
  'TECH_PREP': 'Tech Préparation',
  'RESPONSABLE': 'Responsable'
};

export const ROLE_COLORS: Record<string, string> = {
  'ADMIN_IT': 'danger',
  'CHEF_SECTEUR': 'info',
  'EXPERT': 'help',
  'TECH_VAL': 'success',
  'TECH_PREP': 'warning',
  'RESPONSABLE': 'info'
};