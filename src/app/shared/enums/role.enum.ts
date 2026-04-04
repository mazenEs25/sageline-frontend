export enum Role {
  ADMIN_IT = 'ADMIN_IT',
  CHEF_SECTEUR = 'CHEF_SECTEUR',
  EXPERT = 'EXPERT',
  TECH_VALIDATION = 'TECH_VALIDATION',
  TECH_PREPARATION = 'TECH_PREPARATION'
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN_IT]: 'Admin IT',
  [Role.CHEF_SECTEUR]: 'Chef Secteur',
  [Role.EXPERT]: 'Expert',
  [Role.TECH_VALIDATION]: 'Tech Validation',
  [Role.TECH_PREPARATION]: 'Tech Préparation'
};

export const ROLE_COLORS: Record<Role, string> = {
  [Role.ADMIN_IT]: 'danger',
  [Role.CHEF_SECTEUR]: 'info',
  [Role.EXPERT]: 'help',
  [Role.TECH_VALIDATION]: 'success',
  [Role.TECH_PREPARATION]: 'warning'
};