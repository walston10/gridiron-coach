import React from 'react';
import type { Coordinator } from '../../types';

interface CoordinatorPanelProps {
  oc: Coordinator | null;
  dc: Coordinator | null;
  onHireOC?: () => void;
  onHireDC?: () => void;
  onFireOC?: () => void;
  onFireDC?: () => void;
}

export const CoordinatorPanel: React.FC<CoordinatorPanelProps> = ({
  oc,
  dc,
  onHireOC,
  onHireDC,
  onFireOC,
  onFireDC,
}) => {
  const formatSalary = (amount: number) => `$${(amount / 1_000_000).toFixed(1)}M`;

  const CoordinatorCard = ({
    title,
    coordinator,
    onHire,
    onFire,
  }: {
    title: string;
    coordinator: Coordinator | null;
    onHire?: () => void;
    onFire?: () => void;
  }) => (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-gray-400 text-sm mb-2">{title}</h3>
      {coordinator ? (
        <>
          <div className="text-white font-bold text-lg">{coordinator.name}</div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
            <div>
              <span className="text-gray-400">Skill:</span>
              <span className="text-white ml-2">{coordinator.skill}</span>
            </div>
            <div>
              <span className="text-gray-400">Scheme:</span>
              <span className="text-white ml-2">{coordinator.schemeBonus}</span>
            </div>
            <div>
              <span className="text-gray-400">Salary:</span>
              <span className="text-green-400 ml-2">{formatSalary(coordinator.salary)}</span>
            </div>
          </div>
          {onFire && (
            <button
              onClick={onFire}
              className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm"
            >
              Fire
            </button>
          )}
        </>
      ) : (
        <>
          <div className="text-gray-500 mb-4">Position vacant</div>
          {onHire && (
            <button
              onClick={onHire}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm"
            >
              Hire Coordinator
            </button>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CoordinatorCard
        title="Offensive Coordinator"
        coordinator={oc}
        onHire={onHireOC}
        onFire={onFireOC}
      />
      <CoordinatorCard
        title="Defensive Coordinator"
        coordinator={dc}
        onHire={onHireDC}
        onFire={onFireDC}
      />
    </div>
  );
};