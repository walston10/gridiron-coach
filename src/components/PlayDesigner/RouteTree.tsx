import React from 'react';
import type { RouteType, FieldSide } from '../../types';
import { ROUTES, getRouteDescription } from '../../data/routes';

interface RouteTreeProps {
  onSelectRoute: (route: RouteType) => void;
  onClose: () => void;
  playerLabel: string;
  fieldSide: FieldSide;
}

export const RouteTree: React.FC<RouteTreeProps> = ({
  onSelectRoute,
  onClose,
  playerLabel,
  fieldSide
}) => {
  // Organize routes by category
  const quickRoutes: RouteType[] = ['SLANT', 'FLAT', 'DRAG', 'CURL'];
  const intermediateRoutes: RouteType[] = ['IN', 'OUT', 'COMEBACK', 'SCREEN'];
  const deepRoutes: RouteType[] = ['GO', 'POST', 'CORNER', 'WHEEL'];

  const renderRouteButton = (routeType: RouteType) => {
    const template = ROUTES.find(r => r.type === routeType);
    if (!template) return null;

    const description = getRouteDescription(routeType, fieldSide);

    return (
      <button
        key={routeType}
        onClick={() => onSelectRoute(routeType)}
        className="bg-gray-700 hover:bg-gray-600 p-3 rounded text-left transition-colors"
      >
        <div className="text-white font-bold">{template.name}</div>
        <div className="text-gray-400 text-xs mt-1">{description}</div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Select Route for {playerLabel}</h2>
            <p className="text-gray-400 text-sm">
              Position: {fieldSide} side • Routes will auto-adjust direction
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Quick Routes */}
          <div>
            <h3 className="text-yellow-400 font-bold mb-2 text-sm">QUICK (0-5 yds)</h3>
            <div className="space-y-2">
              {quickRoutes.map(renderRouteButton)}
            </div>
          </div>

          {/* Intermediate Routes */}
          <div>
            <h3 className="text-orange-400 font-bold mb-2 text-sm">INTERMEDIATE (5-15 yds)</h3>
            <div className="space-y-2">
              {intermediateRoutes.map(renderRouteButton)}
            </div>
          </div>

          {/* Deep Routes */}
          <div>
            <h3 className="text-red-400 font-bold mb-2 text-sm">DEEP (15+ yds)</h3>
            <div className="space-y-2">
              {deepRoutes.map(renderRouteButton)}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
