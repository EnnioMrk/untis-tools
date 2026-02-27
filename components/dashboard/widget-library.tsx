'use client';

import { X, Plus, Lock, Calendar, Clock, BarChart3, Infinity, TrendingUp, Layers, AlertTriangle, Activity } from 'lucide-react';
import type { WidgetType, WidgetData } from '@/types/widget';
import { WIDGET_DEFINITIONS } from '@/types/widget';

interface WidgetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (type: WidgetType) => void;
  isPremium: boolean;
  existingWidgets: WidgetData[];
}

const WIDGET_ICONS: Record<WidgetType, React.ReactNode> = {
  KPI_7DAYS: <Calendar className="w-5 h-5" />,
  KPI_14DAYS: <Clock className="w-5 h-5" />,
  KPI_30DAYS: <BarChart3 className="w-5 h-5" />,
  KPI_ALLTIME: <Infinity className="w-5 h-5" />,
  ABSENCE_BAR: <BarChart3 className="w-5 h-5" />,
  ABSENCE_TREND: <TrendingUp className="w-5 h-5" />,
  ABSENCE_RATE: <Activity className="w-5 h-5" />,
  SUBJECT_BREAKDOWN: <Layers className="w-5 h-5" />,
  ABSENCE_RECOMMENDER: <AlertTriangle className="w-5 h-5" />,
  TOTAL_ABSENCE_BAR: <Activity className="w-5 h-5" />,
};

export function WidgetLibrary({
  isOpen,
  onClose,
  onAddWidget,
  isPremium,
  existingWidgets,
}: WidgetLibraryProps) {
  if (!isOpen) return null;

  const widgetTypes = Object.keys(WIDGET_DEFINITIONS) as WidgetType[];

  const isWidgetAdded = (type: WidgetType) => {
    return existingWidgets.some((w) => w.type === type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Widget Library</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 gap-3">
            {widgetTypes.map((type) => {
              const definition = WIDGET_DEFINITIONS[type];
              const isAdded = isWidgetAdded(type);
              const isLocked = definition.isPremium && !isPremium;

              return (
                <div
                  key={type}
                  className={`relative p-4 rounded-xl border transition-all ${
                    isLocked
                      ? 'bg-gray-50 border-gray-200'
                      : isAdded
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        isLocked
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {WIDGET_ICONS[type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{definition.name}</h3>
                        {isLocked && (
                          <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" />
                            Premium
                          </span>
                        )}
                        {isAdded && !isLocked && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Added
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{definition.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Size: {definition.defaultW === 2 ? 'Full width' : 'Half width'} × {definition.defaultH} rows
                      </p>
                    </div>
                    {!isLocked && (
                      <button
                        onClick={() => {
                          if (!isAdded) {
                            onAddWidget(type);
                          }
                        }}
                        disabled={isAdded}
                        className={`p-2 rounded-lg transition-colors ${
                          isAdded
                            ? 'bg-green-100 text-green-600 cursor-default'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isAdded ? (
                          <span className="text-sm font-medium">Added</span>
                        ) : (
                          <Plus className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-500 text-center">
            Click on a widget to add it to your dashboard
          </p>
        </div>
      </div>
    </div>
  );
}