/**
 * Halftime trivia — obscure NFL questions used as a halftime mini-game.
 *
 * Each question carries a `stake` (the buff/debuff at risk), 3–4 options, the
 * correct index, and a one-line fun fact shown on reveal. The slice draws one
 * question at halftime; the result modifies the 2nd half.
 *
 * Tone: low-stakes, slightly absurd, history-flavored. Picking wrong should
 * make the player groan and laugh, not feel cheated.
 *
 * Note: "correct" answers here are flavor — we're not certifying historical
 * accuracy. The point is the texture, not the trivia bowl.
 */

/** What's on the line for getting this question right or wrong. */
export type TriviaStake =
  | 'FIELD_POSITION'   // ±5 yd starting field position on first 2nd-half drive
  | 'QB_BOOST';        // ±10 QB accuracy for the rest of the game

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];        // 3 or 4
  correctIndex: number;
  funFact: string;          // one-liner shown after reveal
}

export const HALFTIME_TRIVIA: TriviaQuestion[] = [
  {
    id: 'qb-punts',
    question: 'Career punting yards: who has more — Tom Brady or Ben Roethlisberger?',
    options: ['Brady', 'Roethlisberger', 'Both have zero', 'They\'re tied'],
    correctIndex: 0,
    funFact: 'Brady actually has a punt in his career. So does Big Ben. QBs really will do anything.',
  },
  {
    id: 'mnf-worst',
    question: 'Lowest all-time Monday Night Football win percentage belongs to which franchise?',
    options: ['Detroit Lions', 'Cleveland Browns', 'Tampa Bay Buccaneers', 'Houston Texans'],
    correctIndex: 0,
    funFact: 'The Lions have made losing in primetime a generational craft.',
  },
  {
    id: 'longest-fg',
    question: 'Longest field goal in NFL history?',
    options: ['64 yards', '66 yards', '68 yards', '70 yards'],
    correctIndex: 1,
    funFact: 'Justin Tucker kicked a 66-yarder against the Lions in 2021. Of course it was the Lions.',
  },
  {
    id: 'favre-ints',
    question: 'Brett Favre\'s career interception count was closest to:',
    options: ['286', '336', '420', '512'],
    correctIndex: 1,
    funFact: 'Favre threw 336 picks — the all-time record. He also won three MVPs throwing them.',
  },
  {
    id: 'qb-fumbles',
    question: 'All-time leader in QB fumbles is:',
    options: ['Brett Favre', 'Aaron Rodgers', 'Warren Moon', 'Drew Brees'],
    correctIndex: 0,
    funFact: 'Favre fumbled 166 times. The man\'s relationship with the football was complicated.',
  },
  {
    id: 'longest-playoff-drought',
    question: 'Which franchise has gone longest without winning a playoff game (as of late 2010s)?',
    options: ['Detroit Lions', 'Cincinnati Bengals', 'Cleveland Browns', 'Buffalo Bills'],
    correctIndex: 0,
    funFact: 'The Lions went 1957 to 1991 — and then mostly didn\'t do it again until recently.',
  },
  {
    id: 'helmet-throw',
    question: 'Andre Waters famously got fined for what at the 1991 Pro Bowl?',
    options: ['Throwing his helmet at a ref', 'Tackling a coach', 'Fighting a teammate', 'Punching the mascot'],
    correctIndex: 0,
    funFact: 'The Pro Bowl is supposed to be relaxing.',
  },
  {
    id: 'walter-yards',
    question: 'Walter Payton\'s career rushing yards landed closest to:',
    options: ['12,000', '14,000', '16,000', '18,000'],
    correctIndex: 2,
    funFact: '16,726 yards. Sweetness held the record until Emmitt Smith broke it in 2002.',
  },
  {
    id: 'super-bowl-bird',
    question: 'Super Bowl XLIV halftime show. Who fronted The Who that night?',
    options: ['Roger Daltrey', 'Pete Townshend', 'Both', 'Neither — it was a hologram'],
    correctIndex: 2,
    funFact: 'Both. They were old. Townshend was 64.',
  },
  {
    id: 'kicker-td',
    question: 'How many NFL kickers have ever scored a rushing touchdown?',
    options: ['Zero', 'Exactly 1', 'A handful', 'Dozens'],
    correctIndex: 2,
    funFact: 'A handful of fake-FG runs and trick plays have done it. Kickers contain multitudes.',
  },
  {
    id: 'most-overtime-losses',
    question: 'Which franchise has the most overtime losses in NFL history?',
    options: ['Cleveland Browns', 'New York Jets', 'Cincinnati Bengals', 'Tampa Bay Buccaneers'],
    correctIndex: 0,
    funFact: 'Cleveland fans have suffered in every possible way, including in extra minutes.',
  },
  {
    id: 'first-flag',
    question: 'First flag thrown in an NFL game (rough year)?',
    options: ['1932', '1941', '1948', '1962'],
    correctIndex: 2,
    funFact: 'Penalty flags became standard in 1948. Before that, refs just yelled.',
  },
];

/**
 * Draw a random trivia question and pick a random stake type.
 * Returns the question plus the stake riding on the answer.
 */
export function drawTrivia(): { question: TriviaQuestion; stake: TriviaStake } {
  const question = HALFTIME_TRIVIA[Math.floor(Math.random() * HALFTIME_TRIVIA.length)];
  const stake: TriviaStake = Math.random() < 0.5 ? 'FIELD_POSITION' : 'QB_BOOST';
  return { question, stake };
}

/** Short label describing what's on the line — shown before the user answers. */
export function describeStake(stake: TriviaStake): { right: string; wrong: string } {
  switch (stake) {
    case 'FIELD_POSITION':
      return {
        right: '+5 yd field position to start 2nd half',
        wrong: '-5 yd field position to start 2nd half',
      };
    case 'QB_BOOST':
      return {
        right: '+10 QB accuracy for the 2nd half (wider reads)',
        wrong: '-10 QB accuracy for the 2nd half (tighter reads)',
      };
  }
}
