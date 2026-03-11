import { WidgetType } from '@/types/widget';
import type { PlanConfig } from './types';

export const basicPlanConfig: PlanConfig = {
  id: 'BASIC',
  slug: 'basic',
  name: 'Basic',
  description: 'Essential timetable analytics with a compact dashboard and recurring access.',
  monthlyPrice: 1.99,
  monthlyPriceLabel: '€1.99',
  ctaLabel: 'Go Basic',
  featureList: [
    'Up to 5 dashboard widgets',
    'Core KPI and chart widgets',
    'Basic themes',
    'Custom dashboard layouts',
  ],
  features: {
    maxWidgets: 5,
    allowedWidgetTypes: [
      WidgetType.KPI_7DAYS,
      WidgetType.KPI_14DAYS,
      WidgetType.KPI_30DAYS,
      WidgetType.KPI_ALLTIME,
      WidgetType.ABSENCE_BAR,
      WidgetType.ABSENCE_TREND,
      WidgetType.SUBJECT_BREAKDOWN,
      WidgetType.TOTAL_ABSENCE_BAR,
      WidgetType.ABSENCE_RATE,
    ],
    statisticsRangeDays: 30,
    themes: 'basic',
    dataExport: false,
    prioritySupport: false,
    earlyAccess: false,
    advancedAnalytics: false,
    customLayouts: true,
  },
  comparison: {
    dashboardWidgets: 'Up to 5',
    widgetTypes: 'Core widgets',
    themes: 'Basic',
    statisticsRange: '30 days',
    dataExport: 'No',
    prioritySupport: 'No',
    earlyAccess: 'No',
  },
};
