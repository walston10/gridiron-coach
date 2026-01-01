import React, { useState } from 'react';
import type { FreeAgent, ContractOffer } from '../../types';

interface OfferModalProps {
  freeAgent: FreeAgent;
  capSpace: number;
  onSubmitOffer: (offer: Omit<ContractOffer, 'teamId' | 'status'>) => void;
  onClose: () => void;
}

export const OfferModal: React.FC<OfferModalProps> = ({
  freeAgent,
  capSpace,
  onSubmitOffer,
  onClose,
}) => {
  const { player, askingPrice } = freeAgent;

  const [years, setYears] = useState(3);
  const [yearlySalary, setYearlySalary] = useState(askingPrice);
  const [guaranteedPct, setGuaranteedPct] = useState(50);
  const [rolePromise, setRolePromise] = useState<ContractOffer['rolePromise']>('STARTER');

  const formatSalary = (amount: number) => `$${(amount / 1_000_000).toFixed(1)}M`;

  const totalValue = years * yearlySalary;
  const guaranteedMoney = Math.round(totalValue * (guaranteedPct / 100));
  const signingBonus = Math.round(yearlySalary * 0.1);

  const canAfford = yearlySalary <= capSpace;

  const handleSubmit = () => {
    if (!canAfford) return;

    onSubmitOffer({
      years,
      yearlySalary,
      guaranteedMoney,
      signingBonus,
      rolePromise,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-4">
          Make Offer to {player.firstName} {player.lastName}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Years</label>
            <input
              type="range"
              min={1}
              max={5}
              value={years}
              onChange={e => setYears(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-white text-center">{years} years</div>
          </div>

          <div>
            <label className="text-gray-400 text-sm">Yearly Salary</label>
            <input
              type="range"
              min={750000}
              max={Math.min(50000000, capSpace)}
              step={250000}
              value={yearlySalary}
              onChange={e => setYearlySalary(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-white text-center">{formatSalary(yearlySalary)}/yr</div>
            <div className="text-xs text-gray-400 text-center">
              Asking: {formatSalary(askingPrice)}/yr
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-sm">Guaranteed %</label>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={guaranteedPct}
              onChange={e => setGuaranteedPct(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-white text-center">{guaranteedPct}% ({formatSalary(guaranteedMoney)})</div>
          </div>

          <div>
            <label className="text-gray-400 text-sm">Role Promise</label>
            <select
              value={rolePromise}
              onChange={e => setRolePromise(e.target.value as typeof rolePromise)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 mt-1"
            >
              <option value="STARTER">Starter</option>
              <option value="ROTATIONAL">Rotational</option>
              <option value="BACKUP">Backup</option>
              <option value="DEPTH">Depth</option>
            </select>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Value:</span>
              <span className="text-white">{formatSalary(totalValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Cap Space:</span>
              <span className={canAfford ? 'text-green-400' : 'text-red-400'}>
                {formatSalary(capSpace)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canAfford}
            className={`flex-1 py-2 rounded ${
              canAfford
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Submit Offer
          </button>
        </div>
      </div>
    </div>
  );
};