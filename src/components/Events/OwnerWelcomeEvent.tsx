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

// Owner-specific dialogue
const OWNER_DIALOGUES: Record<string, {
  title: string;
  greeting: string;
  offer: string;
  amount: number;
  askMoreAmount: number;
}> = {
  tex: {
    title: 'Welcome to the Family',
    greeting: "Your new owner, Tex Morgan, invites you to his private box. Bourbon in hand, cowboy boots on the table. He slides an envelope across.",
    offer: "Listen here, amigo. I didn't buy this team to lose. That's $50K for your... discretionary fund. Win me some games, make some noise, and there's plenty more where that came from. Got it?",
    amount: 50000,
    askMoreAmount: 100000,
  },
  hale: {
    title: 'A Formal Introduction',
    greeting: "Senator Catherine Hale meets you in a spotless conference room. Her aide takes notes. She slides a folder across the table.",
    offer: "I'll be direct. This franchise represents more than football to me. That's $30K for community outreach and... operational flexibility. Keep things clean. My reputation is your reputation now.",
    amount: 30000,
    askMoreAmount: 60000,
  },
  kessler: {
    title: 'The Numbers',
    greeting: "Warren Kessler doesn't look up from his spreadsheet when you enter. He gestures at a chair. Eventually, he slides a single check across his desk.",
    offer: "I've allocated $25,000 for discretionary spending. Every dollar will be tracked. ROI will be measured. This is an investment in you. Don't disappoint the spreadsheet.",
    amount: 25000,
    askMoreAmount: 50000,
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
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Cinematic header */}
        <div className="text-center mb-6">
          <div className="text-amber-500 text-xs uppercase tracking-[0.3em] mb-2">Week 1</div>
          <div className="text-3xl font-black text-white">{dialogue.title}</div>
        </div>

        {/* Event card */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          {/* Owner portrait */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 border-b border-slate-700">
            <div className="flex items-center gap-4">
              <div className="text-5xl">{owner.portrait}</div>
              <div>
                <div className="text-xl font-bold text-white">{owner.name}</div>
                <div className="text-amber-400 text-sm">{owner.nickname}</div>
              </div>
            </div>
          </div>

          {!showResult ? (
            <>
              {/* Story */}
              <div className="p-6">
                <p className="text-slate-300 leading-relaxed mb-4">
                  {dialogue.greeting}
                </p>
                <div className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-amber-500">
                  <p className="text-white italic">
                    "{dialogue.offer}"
                  </p>
                </div>
              </div>

              {/* Choices */}
              <div className="p-4 space-y-2 border-t border-slate-800">
                <button
                  onClick={() => handleChoice('take')}
                  className="w-full p-4 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-700 hover:border-amber-500 text-left transition-all group"
                >
                  <div className="font-semibold text-white group-hover:text-amber-400">
                    Take the money
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    +${dialogue.amount.toLocaleString()} slush fund, +5 Risk, Owner pleased
                  </div>
                </button>

                <button
                  onClick={() => handleChoice('refuse')}
                  className="w-full p-4 rounded-lg border border-slate-600 bg-slate-800/50 hover:bg-slate-700 hover:border-blue-500 text-left transition-all group"
                >
                  <div className="font-semibold text-white group-hover:text-blue-400">
                    Refuse politely
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    Owner annoyed, +10 Reputation
                  </div>
                </button>

                <button
                  onClick={() => handleChoice('ask_more')}
                  className="w-full p-4 rounded-lg border border-purple-700/50 bg-purple-900/30 hover:bg-purple-900/50 hover:border-purple-500 text-left transition-all group"
                >
                  <div className="font-semibold text-white group-hover:text-purple-400 flex items-center gap-2">
                    <span>Ask for more</span>
                    <span className="text-xs bg-purple-700/50 px-2 py-0.5 rounded">RISKY</span>
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    50% chance: +${dialogue.askMoreAmount.toLocaleString()} | 50% chance: Owner furious
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Result */}
              <div className="p-6">
                <div className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-amber-500 mb-6">
                  <p className="text-white italic">
                    {result?.description}
                  </p>
                </div>

                {/* Consequences */}
                <div className="space-y-2">
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
