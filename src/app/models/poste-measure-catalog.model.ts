import { PosteType } from '../shared/enums/ticket.enum';
import { MeasureCategory } from '../shared/enums/measure-category.enum';

export interface PosteMeasureCatalog {
  id: number;
  posteType: PosteType;
  measureCode: string;
  measureLabel: string;
  category: MeasureCategory;
  defaultUnit: string;
  defaultLowerBound: number;
  defaultUpperBound: number;
  mandatory: boolean;
  displayOrder: number;
  antenna: string | null;
  frequencyMhz: number | null;
  modulationScheme: string | null;
  active: boolean;
}

export interface CreatePosteMeasureCatalogRequest {
  posteType: PosteType;
  measureCode: string;
  measureLabel: string;
  category: MeasureCategory;
  defaultUnit: string;
  defaultLowerBound: number;
  defaultUpperBound: number;
  mandatory: boolean;
  displayOrder: number;
  antenna?: string | null;
  frequencyMhz?: number | null;
  modulationScheme?: string | null;
}

export interface UpdatePosteMeasureCatalogRequest {
  measureLabel: string;
  category: MeasureCategory;
  defaultUnit: string;
  defaultLowerBound: number;
  defaultUpperBound: number;
  mandatory: boolean;
  displayOrder: number;
  antenna?: string | null;
  frequencyMhz?: number | null;
  modulationScheme?: string | null;
}
