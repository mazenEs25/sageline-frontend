import { NgModule } from '@angular/core';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { InputSwitchModule } from 'primeng/inputswitch';
import { BadgeModule } from 'primeng/badge';
import { ChartModule } from 'primeng/chart';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { DividerModule } from 'primeng/divider';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { StepsModule } from 'primeng/steps';
import { TimelineModule } from 'primeng/timeline';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CalendarModule } from 'primeng/calendar';
import { ListboxModule } from 'primeng/listbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { TabViewModule } from 'primeng/tabview';
import { MultiSelectModule } from 'primeng/multiselect';
import { SortIcon } from 'primeng/table';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';

const MODULES = [
  TableModule, ButtonModule, InputTextModule, DropdownModule,
  DialogModule, ConfirmDialogModule, ToastModule, TagModule,
  ToolbarModule, InputTextareaModule, ToggleButtonModule, CardModule,
  TooltipModule, RippleModule, InputSwitchModule, BadgeModule,
  ChartModule, MenuModule, AvatarModule, DividerModule, SkeletonModule,
  ProgressSpinnerModule, OverlayPanelModule, ScrollPanelModule,
  StepsModule, TimelineModule, RadioButtonModule, CalendarModule, ListboxModule,
  InputNumberModule, TabViewModule, MultiSelectModule, MessageModule,
  CheckboxModule,
];

@NgModule({
  imports: MODULES,
  exports: MODULES,
})
export class PrimeNGModule {}