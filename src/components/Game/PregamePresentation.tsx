// src/components/Game/PregamePresentation.tsx
// Pregame card reveal animation for Stadium, Weather, and Referee modifiers

import React, { useState, useEffect } from 'react';
import type { PregameCard, StadiumEvent, WeatherCondition, RefereeStyle } from '../../types/game.types';

interface PregamePresentationProps {
  cards: PregameCard[];
  onReveal: (index: number) => void;
  onComplete: () => void;
  receivingFirst: 'HOME' | 'AWAY';
  playerIsHome: boolean;
}

// Get icon for card category
function getCategoryIcon(category: 'STADIUM' | 'WEATHER' | 'REFEREE'): string {
  switch (category) {
    case 'STADIUM': return '🏟️';
    case 'WEATHER': return '🌤️';
    case 'REFEREE': return '🦓';
    default: return '🎴';
  }
}

// Get weather icon
function getWeatherIcon(weather: WeatherCondition): string {
  switch (weather) {
    case 'CLEAR': return '☀️';
    case 'RAIN': return '🌧️';
    case 'SNOW': return '❄️';
    case 'WIND': return '💨';
    case 'EXTREME_COLD': return '🥶';
    case 'EXTREME_HEAT': return '🥵';
    case 'DOME': return '🏠';
    default: return '🌤️';
  }
}

// Get stadium icon
function getStadiumIcon(stadium: StadiumEvent): string {
  switch (stadium) {
    case 'PRIMETIME': return '📺';
    case 'PACKED_HOUSE': return '🔊';
    case 'EMPTY_STADIUM': return '🦗';
    case 'HOSTILE_ENVIRONMENT': return '😤';
    case 'THURSDAY_NIGHT': return '🌙';
    case 'LONDON_GAME': return '🇬🇧';
    case 'PLAYOFF_ATMOSPHERE': return '🏆';
    case 'NEUTRAL_SITE': return '⚖️';
    case 'REGULAR_GAME': return '🏈';
    default: return '🏟️';
  }
}

// Get referee icon
function getRefereeIcon(style: RefereeStyle): string {
  switch (style) {
    case 'TIGHT': return '🚨';
    case 'LOOSE': return '🤙';
    case 'HOME_COOKING': return '🏠';
    case 'MAKEUP_CALL': return '⚖️';
    case 'NORMAL': return '📋';
    default: return '🦓';
  }
}

// Card back component
const CardBack: React.FC<{
  category: 'STADIUM' | 'WEATHER' | 'REFEREE';
  onClick: () => void;
  delay: number;
}> = ({ category, onClick, delay }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      onClick={onClick}
      className={`
        cursor-pointer transform transition-all duration-500 ease-out
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="w-32 h-44 rounded-xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-2 border-slate-600 shadow-xl flex flex-col items-center justify-center relative overflow-hidden hover:border-amber-500 hover:scale-105 transition-all">
        {/* Card pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-2 border border-slate-400 rounded-lg"></div>
          <div className="absolute inset-4 border border-slate-400 rounded-lg"></div>
        </div>

        {/* Category icon */}
        <div className="text-4xl mb-2">{getCategoryIcon(category)}</div>
        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
          {category}
        </div>

        {/* Tap to reveal */}
        <div className="absolute bottom-3 text-slate-500 text-xs animate-pulse">
          TAP TO REVEAL
        </div>
      </div>
    </div>
  );
};

// Card front component
const CardFront: React.FC<{
  card: PregameCard;
}> = ({ card }) => {
  // Get appropriate icon
  let icon = getCategoryIcon(card.category);
  if (card.category === 'WEATHER') {
    icon = getWeatherIcon(card.value as WeatherCondition);
  } else if (card.category === 'STADIUM') {
    icon = getStadiumIcon(card.value as StadiumEvent);
  } else if (card.category === 'REFEREE') {
    icon = getRefereeIcon(card.value as RefereeStyle);
  }

  // Get card color gradient based on category
  const getGradient = () => {
    switch (card.category) {
      case 'STADIUM': return 'from-amber-900 via-amber-800 to-amber-950';
      case 'WEATHER': return 'from-blue-900 via-blue-800 to-blue-950';
      case 'REFEREE': return 'from-purple-900 via-purple-800 to-purple-950';
      default: return 'from-slate-800 to-slate-900';
    }
  };

  return (
    <div className="animate-flip-in">
      <div className={`w-32 h-44 rounded-xl bg-gradient-to-br ${getGradient()} border-2 border-amber-500 shadow-xl shadow-amber-500/20 flex flex-col items-center p-3 relative overflow-hidden`}>
        {/* Header */}
        <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">
          {card.category}
        </div>

        {/* Icon */}
        <div className="text-3xl mb-1">{icon}</div>

        {/* Title */}
        <div className="text-white font-bold text-center text-sm leading-tight mb-1">
          {card.description}
        </div>

        {/* Effects summary */}
        <div className="flex-1 flex flex-col justify-end w-full">
          <div className="text-xs space-y-0.5">
            {card.effectsSummary.slice(0, 2).map((effect, i) => (
              <div key={i} className="text-slate-300 text-center truncate text-[10px]">
                {effect}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Flipping card component
const FlippingCard: React.FC<{
  card: PregameCard;
  onReveal: () => void;
  delay: number;
}> = ({ card, onReveal, delay }) => {
  const [isFlipping, setIsFlipping] = useState(false);

  const handleClick = () => {
    if (!card.isRevealed && !isFlipping) {
      setIsFlipping(true);
      setTimeout(() => {
        onReveal();
        setIsFlipping(false);
      }, 300);
    }
  };

  return (
    <div className="perspective-1000">
      <div className={`transform transition-transform duration-300 transform-style-3d ${isFlipping || card.isRevealed ? 'rotate-y-180' : ''}`}>
        {card.isRevealed ? (
          <CardFront card={card} />
        ) : (
          <CardBack category={card.category} onClick={handleClick} delay={delay} />
        )}
      </div>
    </div>
  );
};

export const PregamePresentation: React.FC<PregamePresentationProps> = ({
  cards,
  onReveal,
  onComplete,
  receivingFirst,
  playerIsHome,
}) => {
  const [showKickoff, setShowKickoff] = useState(false);
  const allRevealed = cards.every(c => c.isRevealed);

  // Show kickoff button after all cards revealed
  useEffect(() => {
    if (allRevealed) {
      const timer = setTimeout(() => setShowKickoff(true), 500);
      return () => clearTimeout(timer);
    }
  }, [allRevealed]);

  // Determine who receives kickoff
  const playerReceives = (receivingFirst === 'HOME') === playerIsHome;

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex flex-col items-center justify-center text-white p-6">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="text-amber-500 text-3xl font-black mb-2">GAME DAY</div>
        <div className="text-slate-400 text-sm">Tap cards to reveal game conditions</div>
      </div>

      {/* Cards */}
      <div className="flex gap-3 mb-8">
        {cards.map((card, index) => (
          <FlippingCard
            key={card.category}
            card={card}
            onReveal={() => onReveal(index)}
            delay={index * 200}
          />
        ))}
      </div>

      {/* Revealed effects summary */}
      {allRevealed && (
        <div className="w-full max-w-sm bg-slate-800/50 rounded-xl p-4 mb-6 animate-fade-in">
          <div className="text-center mb-3">
            <div className="text-amber-400 font-bold text-sm uppercase tracking-wider">Game Conditions Set</div>
          </div>

          <div className="space-y-2 text-sm">
            {cards.map((card) => (
              <div key={card.category} className="flex items-center gap-2 text-slate-300">
                <span className="text-lg">
                  {card.category === 'STADIUM' && getStadiumIcon(card.value as StadiumEvent)}
                  {card.category === 'WEATHER' && getWeatherIcon(card.value as WeatherCondition)}
                  {card.category === 'REFEREE' && getRefereeIcon(card.value as RefereeStyle)}
                </span>
                <span className="font-medium">{card.description}</span>
              </div>
            ))}
          </div>

          {/* Coin toss result */}
          <div className="mt-4 pt-3 border-t border-slate-700 text-center">
            <div className="text-slate-500 text-xs mb-1">COIN TOSS</div>
            <div className={`font-bold ${playerReceives ? 'text-green-400' : 'text-slate-300'}`}>
              {playerReceives ? 'You receive the ball' : 'Opponent receives the ball'}
            </div>
          </div>
        </div>
      )}

      {/* Kickoff button */}
      {showKickoff && (
        <button
          onClick={onComplete}
          className="
            px-12 py-4 rounded-xl text-xl font-black
            bg-gradient-to-r from-amber-600 to-amber-500
            hover:from-amber-500 hover:to-amber-400
            text-black shadow-lg shadow-amber-500/30
            transform transition-all duration-300
            hover:scale-105 active:scale-95
            animate-bounce-subtle
          "
        >
          KICK OFF
        </button>
      )}

      {/* Tap hint if not all revealed */}
      {!allRevealed && (
        <div className="text-slate-500 text-xs animate-pulse mt-4">
          Tap each card to reveal
        </div>
      )}
    </div>
  );
};

export default PregamePresentation;
