// src/components/Game/HelpModal.tsx
// Help modal with tabbed content explaining game mechanics

import React, { useState } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'basics' | 'plays' | 'players' | 'modifiers' | 'momentum' | 'defense' | 'tendencies' | 'signature' | 'dirty';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basics', label: 'Basics' },
  { key: 'plays', label: 'Plays' },
  { key: 'players', label: 'Your Players' },
  { key: 'modifiers', label: 'Modifiers' },
  { key: 'momentum', label: 'Momentum' },
  { key: 'defense', label: 'Defense' },
  { key: 'tendencies', label: 'Tendencies' },
  { key: 'signature', label: 'Signature Cards' },
  { key: 'dirty', label: 'The Dirty Game' },
];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('basics');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-xl max-w-lg w-full max-h-[85vh] flex flex-col border border-slate-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700">
          <h2 className="text-xl font-bold text-amber-400">How to Play</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700 overflow-x-auto">
          <div className="flex min-w-max px-2 py-2 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-amber-600 text-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 text-slate-300">
          <TabContent tab={activeTab} />
        </div>
      </div>
    </div>
  );
};

const TabContent: React.FC<{ tab: TabKey }> = ({ tab }) => {
  switch (tab) {
    case 'basics':
      return <BasicsTab />;
    case 'plays':
      return <PlaysTab />;
    case 'players':
      return <PlayersTab />;
    case 'modifiers':
      return <ModifiersTab />;
    case 'momentum':
      return <MomentumTab />;
    case 'defense':
      return <DefenseTab />;
    case 'tendencies':
      return <TendenciesTab />;
    case 'signature':
      return <SignatureTab />;
    case 'dirty':
      return <DirtyTab />;
    default:
      return null;
  }
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-amber-400 font-bold text-lg mb-2">{children}</h3>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-4">
    <h4 className="text-white font-semibold mb-1">{title}</h4>
    {children}
  </div>
);

const BasicsTab = () => (
  <div className="space-y-4">
    <SectionTitle>The Goal</SectionTitle>
    <p>Pick plays, move the ball, score touchdowns. Simple as that.</p>

    <SubSection title="Your Drive">
      <ul className="list-disc list-inside space-y-1 text-sm">
        <li>Start at your own 25 yard line</li>
        <li>Gain 10 yards = First Down (4 new plays to work with)</li>
        <li>Reach the end zone = Touchdown (7 pts)</li>
        <li>Fail to convert? You turn it over</li>
      </ul>
    </SubSection>

    <SubSection title="Ways to Lose the Ball">
      <ul className="list-disc list-inside space-y-1 text-sm">
        <li><span className="text-red-400">Interception</span> - they catch your pass</li>
        <li><span className="text-red-400">Fumble</span> - you drop it, they grab it</li>
        <li><span className="text-red-400">Turnover on Downs</span> - 4 plays, no first down</li>
      </ul>
    </SubSection>
  </div>
);

const PlaysTab = () => (
  <div className="space-y-4">
    <SectionTitle>Everyone Gets the Same Playbook</SectionTitle>
    <p className="text-sm">Short passes, deep bombs, trick plays - they're all available to you. The difference? How well YOUR players execute them.</p>

    <SubSection title="Play Categories">
      <ul className="space-y-2 text-sm">
        <li><span className="text-green-400 font-semibold">Short:</span> Safe. Reliable. Boring but effective.</li>
        <li><span className="text-blue-400 font-semibold">Medium:</span> Balance of risk and reward.</li>
        <li><span className="text-purple-400 font-semibold">Deep:</span> Boom or bust. Heroes or goats.</li>
        <li><span className="text-amber-400 font-semibold">Run:</span> Ground and pound. Sets up play action.</li>
        <li><span className="text-pink-400 font-semibold">Trick:</span> Flea Flicker, Reverse, HB Pass. High risk, highlight reel.</li>
      </ul>
    </SubSection>

    <SubSection title="Reading a Play Card">
      <ul className="list-disc list-inside space-y-1 text-sm">
        <li><span className="text-white">Big number:</span> Your odds of success</li>
        <li><span className="text-white">Yard range:</span> What you'll gain if it works</li>
        <li><span className="text-white">Cost:</span> Momentum required (⚡)</li>
        <li><span className="text-white">Warnings:</span> Shows if defense has you beat</li>
      </ul>
    </SubSection>
  </div>
);

const PlayersTab = () => (
  <div className="space-y-4">
    <SectionTitle>Ratings Matter</SectionTitle>
    <p className="text-sm">Your players' skills directly affect every play:</p>
    <ul className="list-disc list-inside space-y-1 text-sm mt-2">
      <li>Elite players boost your odds</li>
      <li>Budget players lower them</li>
      <li>But <span className="text-amber-400">ANYONE</span> can run <span className="text-amber-400">ANY</span> play</li>
    </ul>

    <SubSection title="Who Affects What">
      <ul className="space-y-1 text-sm">
        <li><span className="text-purple-400">Deep passes?</span> QB arm and WR speed matter most</li>
        <li><span className="text-amber-400">Runs?</span> Your RB and offensive line</li>
        <li><span className="text-blue-400">Screens?</span> RB hands and burst</li>
        <li><span className="text-green-400">Short passes?</span> QB accuracy and WR routes</li>
      </ul>
    </SubSection>

    <div className="bg-slate-800/50 rounded-lg p-3 text-sm">
      <p className="text-slate-400 italic">
        A budget team CAN throw the Hail Mary. It's just... riskier. An elite team makes everything look easy.
      </p>
    </div>
  </div>
);

const ModifiersTab = () => (
  <div className="space-y-4">
    <SectionTitle>Stack 'Em</SectionTitle>
    <p className="text-sm">Modifiers are bonus cards played WITH your base play.</p>
    <p className="text-amber-400 text-sm mt-1">Pick a play → Add a modifier → Combined effect</p>

    <SubSection title="Examples">
      <ul className="space-y-2 text-sm">
        <li><span className="text-blue-400 font-semibold">Play Action:</span> Fake the run first. Works better if you've been running.</li>
        <li><span className="text-blue-400 font-semibold">Max Protect:</span> Extra blockers. Great against the blitz.</li>
        <li><span className="text-blue-400 font-semibold">Motion:</span> Move a receiver. Reveals coverage hints.</li>
        <li><span className="text-blue-400 font-semibold">Hot Route:</span> Quick adjustment. Beats the blitz.</li>
      </ul>
    </SubSection>

    <SubSection title="Dirty Modifiers">
      <p className="text-sm">Yeah, you can cheat. Hold defenders, run pick plays, grease the ball.</p>
      <p className="text-purple-400 text-sm mt-1">But the league is watching. Heat builds up. Investigations happen. Your call.</p>
    </SubSection>
  </div>
);

const MomentumTab = () => (
  <div className="space-y-4">
    <SectionTitle>The Engine</SectionTitle>
    <p className="text-sm">Every play costs momentum (⚡). You start with 4, max out at 6.</p>

    <SubSection title="Regeneration">
      <p className="text-sm">You get <span className="text-green-400">+1 back</span> at the start of each play. Steady income.</p>
    </SubSection>

    <SubSection title="Big Plays = Bonus Momentum">
      <ul className="list-disc list-inside space-y-1 text-sm text-green-400">
        <li>First downs</li>
        <li>Touchdowns</li>
        <li>Turnovers you cause</li>
        <li>Chunk plays</li>
      </ul>
    </SubSection>

    <SubSection title="Bad Plays = Lost Momentum">
      <ul className="list-disc list-inside space-y-1 text-sm text-red-400">
        <li>Turnovers you commit</li>
        <li>Sacks</li>
        <li>Failed 4th downs</li>
      </ul>
    </SubSection>

    <div className="bg-slate-800/50 rounded-lg p-3 text-sm">
      <p className="text-amber-400 font-semibold">You'll Never Get Stuck</p>
      <p className="text-slate-400">There's always a free play available. Checkdown, QB Sneak - something to keep you moving.</p>
    </div>
  </div>
);

const DefenseTab = () => (
  <div className="space-y-4">
    <SectionTitle>When They Have the Ball</SectionTitle>
    <p className="text-sm">Pick your coverage, maybe add an adjustment.</p>

    <SubSection title="Coverages">
      <ul className="space-y-2 text-sm">
        <li><span className="text-red-400 font-semibold">Cover 2:</span> Good against the pass, softer against the run</li>
        <li><span className="text-red-400 font-semibold">Cover 1/Man:</span> Balanced, relies on your DBs</li>
        <li><span className="text-red-400 font-semibold">Cover 4:</span> Prevent the big play, give up the short stuff</li>
        <li><span className="text-red-400 font-semibold">Blitz:</span> Send extra rushers - high risk, high reward</li>
      </ul>
    </SubSection>

    <SubSection title="Read Their Tendencies">
      <p className="text-sm">The game shows you hints:</p>
      <ul className="list-disc list-inside space-y-1 text-sm mt-2">
        <li>Are they running heavy? Stack the box.</li>
        <li>Throwing every down? Drop into coverage.</li>
      </ul>
    </SubSection>
  </div>
);

const TendenciesTab = () => (
  <div className="space-y-4">
    <SectionTitle>They're Watching You</SectionTitle>
    <p className="text-sm">Defense tracks your play-calling. Run too much? They'll sell out to stop it. Pass every down? They'll sit in coverage.</p>

    <SubSection title="Stay Unpredictable">
      <p className="text-sm">Mix it up. Balance keeps them guessing.</p>
    </SubSection>

    <SubSection title="Play Action">
      <p className="text-sm">The ultimate setup.</p>
      <p className="text-amber-400 text-sm mt-2">Run the ball, run it again, then fake it and throw deep.</p>
      <p className="text-sm mt-1">Play Action rewards you for establishing the run.</p>
    </SubSection>
  </div>
);

const SignatureTab = () => (
  <div className="space-y-4">
    <SectionTitle>Star Power</SectionTitle>
    <p className="text-sm">Elite players unlock special plays only THEY can run.</p>

    <div className="space-y-3 mt-4">
      <div className="bg-slate-800/50 rounded-lg p-3">
        <p className="text-yellow-400 font-semibold">"Moss It"</p>
        <p className="text-sm text-slate-400">A freak WR - contested catches become automatic</p>
      </div>
      <div className="bg-slate-800/50 rounded-lg p-3">
        <p className="text-yellow-400 font-semibold">"Escape Artist"</p>
        <p className="text-sm text-slate-400">A mobile QB - extends plays, creates magic</p>
      </div>
      <div className="bg-slate-800/50 rounded-lg p-3">
        <p className="text-yellow-400 font-semibold">"Freight Train"</p>
        <p className="text-sm text-slate-400">A bruiser RB - drags defenders for extra yards</p>
      </div>
    </div>

    <p className="text-sm text-slate-400 italic mt-4">Check your roster. If someone's a star, they might have a signature waiting.</p>
  </div>
);

const DirtyTab = () => (
  <div className="space-y-4">
    <SectionTitle>Your Choice</SectionTitle>
    <p className="text-sm">You can play clean. Win with talent and smarts.</p>
    <p className="text-purple-400 text-sm mt-1">Or... you can bend the rules. Bribe officials. Hold blockers. Steal signals.</p>

    <SubSection title="Heat">
      <p className="text-sm">Every dirty move adds heat. The league notices. Investigations happen.</p>
      <p className="text-red-400 text-sm mt-1">Get caught and you'll pay - fines, suspensions, draft picks.</p>
    </SubSection>

    <SubSection title="The Owner">
      <p className="text-sm">Some owners want wins at any cost. Some want a clean image.</p>
      <p className="text-slate-400 text-sm mt-1">Their pressure is part of the game.</p>
    </SubSection>
  </div>
);

export default HelpModal;
