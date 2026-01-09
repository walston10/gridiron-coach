/**
 * ILLEGAL MOTION - Owner Welcome Event
 *
 * Week 1 forced event where the owner introduces themselves and offers
 * a "discretionary fund" to the new GM. Sets the tone for the season.
 */

import React, { useState } from 'react';
import type { Owner } from '../../types/Owner';

interface OwnerWelcomeEventProps {
  owner: Owner;
  onChoice: (choice: 'take' | 'refuse' | 'ask_more', result: ChoiceResult) => void;
}

export interface ChoiceResult {
  slushFundChange: number;
  riskChange: number;
  ownerPatienceChange: number;
  reputationChange: number;
  description: string;
}

// Owner-specific dialogue with optional image support
const OWNER_DIALOGUES: Record<string, {
  title: string;
  greeting: string;
  offer: string;
  amount: number;
  askMoreAmount: number;
  imageUrl?: string; // Optional custom image
}> = {
  tex: {
    title: 'Welcome to the Family',
    greeting: "Your new owner, Tex Morgan, invites you to his private box. Bourbon in hand, cowboy boots on the table. He slides an envelope across.",
    offer: "Listen here, amigo. I didn't buy this team to lose. That's $50K for your... discretionary fund. Win me some games, make some noise, and there's plenty more where that came from. Got it?",
    amount: 50000,
    askMoreAmount: 100000,
    imageUrl: '/images/events/tex-welcome.png',
  },
  hale: {
    title: 'A Formal Introduction',
    greeting: "Senator Catherine Hale meets you in a spotless conference room. Her aide takes notes. She slides a folder across the table.",
    offer: "I'll be direct. This franchise represents more than football to me. That's $30K for community outreach and... operational flexibility. Keep things clean. My reputation is your reputation now.",
    amount: 30000,
    askMoreAmount: 60000,
    // imageUrl: '/images/events/hale-welcome.jpg',
  },
  kessler: {
    title: 'The Numbers',
    greeting: "Warren Kessler doesn't look up from his spreadsheet when you enter. He gestures at a chair. Eventually, he slides a single check across his desk.",
    offer: "I've allocated $25,000 for discretionary spending. Every dollar will be tracked. ROI will be measured. This is an investment in you. Don't disappoint the spreadsheet.",
    amount: 25000,
    askMoreAmount: 50000,
    // imageUrl: '/images/events/kessler-welcome.jpg',
  },
};

// Choice outcomes by owner
const getChoiceResults = (ownerId: string, choice: 'take' | 'refuse' | 'ask_more'): ChoiceResult => {
  const dialogue = OWNER_DIALOGUES[ownerId] || OWNER_DIALOGUES.tex;

  switch (choice) {
    case 'take':
      return {
        slushFundChange: dialogue.amount,
        riskChange: 5,
        ownerPatienceChange: 5,
        reputationChange: 0,
        description: ownerId === 'tex'
          ? "Tex grins. \"That's what I like to see. A man who knows how the game is played.\""
          : ownerId === 'hale'
          ? "Senator Hale nods curtly. \"Wise. Use it well.\""
          : "Kessler marks something in his ledger. \"Funds transferred. Don't waste them.\"",
      };

    case 'refuse':
      return {
        slushFundChange: 0,
        riskChange: 0,
        ownerPatienceChange: -10,
        reputationChange: 10,
        description: ownerId === 'tex'
          ? "Tex's smile fades. \"Well ain't you a boy scout. We'll see how long that lasts.\""
          : ownerId === 'hale'
          ? "Senator Hale's eyebrow raises. \"Interesting. Principled. I hope that wins games.\""
          : "Kessler blinks. \"That's... not how this works. Fine. Your funeral.\"",
      };

    case 'ask_more':
      // 50/50 chance
      const success = Math.random() > 0.5;
      if (success) {
        return {
          slushFundChange: dialogue.askMoreAmount,
          riskChange: 10,
          ownerPatienceChange: 0,
          reputationChange: -5,
          description: ownerId === 'tex'
            ? "Tex laughs hard. \"Ha! I LIKE you! Okay hotshot, here's double. But now you owe me double the results.\""
            : ownerId === 'hale'
            ? "Senator Hale pauses, then smiles coldly. \"Ambitious. I can work with ambitious. Here's more. Don't make me regret it.\""
            : "Kessler's eye twitches. \"...Bold. Fine. Increased allocation. This better show returns.\"",
        };
      } else {
        return {
          slushFundChange: 0,
          riskChange: 5,
          ownerPatienceChange: -15,
          reputationChange: -5,
          description: ownerId === 'tex'
            ? "Tex's face hardens. \"Greedy before you've won a single game? Get out. We're done here.\""
            : ownerId === 'hale'
            ? "Senator Hale stands abruptly. \"The audacity. You haven't earned the right to negotiate. This meeting is over.\""
            : "Kessler closes his laptop. \"Overvalued asset. No deal. You'll have to prove your worth first.\"",
        };
      }
  }
};

export const OwnerWelcomeEvent: React.FC<OwnerWelcomeEventProps> = ({
  owner,
  onChoice,
}) => {
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<ChoiceResult | null>(null);
  const [choiceMade, setChoiceMade] = useState<'take' | 'refuse' | 'ask_more' | null>(null);

  const dialogue = OWNER_DIALOGUES[owner.id] || OWNER_DIALOGUES.tex;

  const handleChoice = (choice: 'take' | 'refuse' | 'ask_more') => {
    const choiceResult = getChoiceResults(owner.id, choice);
    setResult(choiceResult);
    setChoiceMade(choice);
    setShowResult(true);
  };

  const handleContinue = () => {
    if (result && choiceMade) {
      onChoice(choiceMade, result);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg my-4">
        {/* Event card */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          {/* Image header - shows custom image or gradient placeholder */}
          {dialogue.imageUrl ? (
            <div className="relative w-full h-48 overflow-hidden">
              <img
                src={dialogue.imageUrl}
                alt={dialogue.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="relative w-full h-32 bg-gradient-to-br from-amber-900/50 via-slate-800 to-slate-900 flex items-center justify-center">
              <div className="text-8xl opacity-50">{owner.portrait}</div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
            </div>
          )}

          {/* Character type label */}
          <div className="px-6 pt-4">
            <div className="text-xs text-slate-500 uppercase tracking-widest">Owner</div>
          </div>

          {/* Title */}
          <div className="px-6 pt-1 pb-4">
            <h2 className="text-2xl font-black text-white">{dialogue.title}</h2>
          </div>

          {!showResult ? (
            <>
              {/* Story description */}
              <div className="px-6 pb-4">
                <p className="text-slate-300 italic leading-relaxed">
                  "{dialogue.greeting} {dialogue.offer}"
                </p>
              </div>

              {/* Available funds display */}
              <div className="px-6 pb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-amber-500">💰</span>
                  <span className="text-slate-400">Offered:</span>
                  <span className="text-green-400 font-bold">${dialogue.amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Choices - styled like the screenshot */}
              <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleChoice('take')}
                  className="p-3 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-700 hover:border-green-500 text-left transition-all"
                >
                  <div className="font-medium text-white text-sm mb-2">
                    Take the money
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs bg-green-700/50 text-green-300 px-2 py-0.5 rounded">SAFE</span>
                  </div>
                </button>

                <button
                  onClick={() => handleChoice('refuse')}
                  className="p-3 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-700 hover:border-blue-500 text-left transition-all"
                >
                  <div className="font-medium text-white text-sm mb-2">
                    Refuse politely
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs bg-blue-700/50 text-blue-300 px-2 py-0.5 rounded">MORAL</span>
                  </div>
                </button>

                <button
                  onClick={() => handleChoice('ask_more')}
                  className="col-span-2 p-3 rounded-lg border border-purple-700/50 bg-purple-900/20 hover:bg-purple-900/40 hover:border-purple-500 text-left transition-all"
                >
                  <div className="font-medium text-white text-sm mb-2">
                    Ask for more
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs bg-purple-700/50 text-purple-300 px-2 py-0.5 rounded">RISKY</span>
                    <span className="text-xs text-slate-500">50%</span>
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Result */}
              <div className="px-6 pb-4">
                <p className="text-white italic leading-relaxed">
                  "{result?.description}"
                </p>
              </div>

              {/* Consequences */}
              <div className="px-6 pb-4 space-y-2">
                <div className="text-xs text-slate-500 uppercase mb-2">Consequences</div>
                {result && result.slushFundChange > 0 && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <span>+${result.slushFundChange.toLocaleString()}</span>
                    <span className="text-slate-500">Discretionary Fund</span>
                  </div>
                )}
                {result && result.riskChange !== 0 && (
                  <div className={`flex items-center gap-2 text-sm ${result.riskChange > 0 ? 'text-yellow-400' : 'text-blue-400'}`}>
                    <span>{result.riskChange > 0 ? '+' : ''}{result.riskChange}</span>
                    <span className="text-slate-500">Risk Level</span>
                  </div>
                )}
                {result && result.ownerPatienceChange !== 0 && (
                  <div className={`flex items-center gap-2 text-sm ${result.ownerPatienceChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <span>{result.ownerPatienceChange > 0 ? '+' : ''}{result.ownerPatienceChange}</span>
                    <span className="text-slate-500">Owner Patience</span>
                  </div>
                )}
                {result && result.reputationChange !== 0 && (
                  <div className={`flex items-center gap-2 text-sm ${result.reputationChange > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    <span>{result.reputationChange > 0 ? '+' : ''}{result.reputationChange}</span>
                    <span className="text-slate-500">Reputation</span>
                  </div>
                )}
              </div>

              {/* Continue button */}
              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={handleContinue}
                  className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 rounded-xl font-bold text-black transition-all"
                >
                  Continue to Week 1
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerWelcomeEvent;
