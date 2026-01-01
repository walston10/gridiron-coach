// ==================== FORMATION TYPES ====================

export type FormationType =
  | 'I_FORM' | 'SINGLEBACK' | 'SHOTGUN' | 'PISTOL' | 'EMPTY'
  | 'GOAL_LINE' | 'JUMBO' | 'SPREAD';

export type PersonnelPackage = '10' | '11' | '12' | '20' | '21' | '22' | '13' | '23';

export type FieldSide = 'LEFT' | 'CENTER' | 'RIGHT';

// ==================== ROUTE & BLOCKING TYPES ====================

export type RouteType =
  | 'GO' | 'SLANT' | 'OUT' | 'IN' | 'CURL' | 'COMEBACK'
  | 'POST' | 'CORNER' | 'DRAG' | 'FLAT' | 'WHEEL' | 'SCREEN'
  | 'BLOCK' | 'CUSTOM';

export type ReceiverBlockType =
  | 'STALK_BLOCK'    // WR blocks CB at the line
  | 'CRACK_BLOCK'    // Block inside LB
  | 'CHIP_RELEASE'   // Quick block then run route
  | 'CHECK_RELEASE'  // Block if rushed, else release
  | 'LEAD_BLOCK';    // Lead block for RB (FB/TE)

export type OLBlockingAssignment =
  | 'PASS_PRO'
  | 'ZONE_LEFT' | 'ZONE_RIGHT'
  | 'MAN'
  | 'PULL_LEFT' | 'PULL_RIGHT'
  | 'TRAP' | 'DOUBLE_TEAM';

// Legacy alias for backwards compatibility
export type BlockingAssignment = OLBlockingAssignment;

// ==================== QB TYPES ====================

export type PassAction =
  | '3_STEP'       // Quick drop
  | '5_STEP'       // Standard
  | '7_STEP'       // Deep
  | 'SPRINT_LEFT'  // Roll left
  | 'SPRINT_RIGHT' // Roll right
  | 'BOOT_LEFT'    // Play action boot left
  | 'BOOT_RIGHT';  // Play action boot right

export type QBRunType =
  | 'HANDOFF'      // Standard handoff to RB
  | 'QB_SNEAK'     // Sneak behind center
  | 'QB_DRAW'      // Fake pass, QB runs
  | 'QB_POWER'     // Designed QB run with lead blocker
  | 'READ_OPTION'  // Read DE, give or keep
  | 'ZONE_READ'    // Read backside DE
  | 'QB_SWEEP';    // QB outside run

// ==================== RUN TYPES ====================

export type RunAssignment =
  | 'DIVE'         // A gap, straight ahead
  | 'ISO'          // Isolation with FB lead
  | 'POWER'        // Guard pulls, B gap
  | 'COUNTER'      // Fake one way, cut back
  | 'DRAW'         // Delayed handoff
  | 'TRAP'         // Pull guard to trap
  | 'SWEEP'        // Outside run
  | 'TOSS'         // Quick pitch wide
  | 'STRETCH'      // Outside zone stretch
  | 'INSIDE_ZONE'  // Inside zone
  | 'OUTSIDE_ZONE';// Outside zone

export type RunGap = 'A_LEFT' | 'A_RIGHT' | 'B_LEFT' | 'B_RIGHT' | 'C_LEFT' | 'C_RIGHT' | 'D_LEFT' | 'D_RIGHT';

// ==================== PROTECTION SCHEMES ====================

export type ProtectionScheme =
  | 'HALF_SLIDE_LEFT'   // C/LG/LT slide, RG/RT man
  | 'HALF_SLIDE_RIGHT'  // C/RG/RT slide, LG/LT man
  | 'FULL_SLIDE_LEFT'   // All 5 slide left
  | 'FULL_SLIDE_RIGHT'  // All 5 slide right
  | 'MAN_PROTECTION'    // Everyone man blocks
  | 'MAX_PROTECT';      // Extra blockers stay in

export type RunBlockingScheme =
  | 'INSIDE_ZONE'
  | 'OUTSIDE_ZONE'
  | 'POWER'
  | 'COUNTER'
  | 'TRAP'
  | 'DUO';

// ==================== MOTION TYPES ====================

export type MotionType =
  | 'JET'          // Full speed across
  | 'ORBIT'        // Loop behind QB
  | 'SHIFT'        // Move and reset
  | 'FLY'          // Motion toward sideline
  | 'RETURN';      // Out and back

export type MotionTiming = 'PRE_SNAP' | 'ON_SNAP';

export type MotionAssignment = {
  playerId: string;
  motionType: MotionType;
  timing: MotionTiming;
  path: { x: number; y: number }[];
};

// ==================== PLAYER ASSIGNMENT ====================

export type PlayerAssignment = {
  playerId: string;
  positionSlot: string;
  label: string;
  startX: number;
  startY: number;

  // Position info
  isOnLine: boolean;
  fieldSide: FieldSide;
  canRunRoutes: boolean;

  // Pass play assignments
  route?: RouteType;
  customRoutePoints?: { x: number; y: number }[];
  receiverBlock?: ReceiverBlockType;

  // OL assignments (legacy: blockingAssignment)
  olBlocking?: OLBlockingAssignment;
  blockingAssignment?: BlockingAssignment;

  // Run play assignments (for RB)
  runAssignment?: RunAssignment;
  runGap?: RunGap;
  isBallCarrier?: boolean;
  isLeadBlocker?: boolean;
  isHandoffTarget?: boolean;

  // Motion
  motion?: MotionAssignment;
  motionPath?: { x: number; y: number }[];
};

// ==================== PLAY STRUCTURE ====================

export type PlayTag =
  | 'RED_ZONE' | 'GOAL_LINE' | '3RD_SHORT' | '3RD_LONG' | '2_MINUTE'
  | 'OPENING' | 'PLAY_ACTION' | 'SCREEN' | 'QUICK_PASS' | 'DEEP_SHOT'
  | 'RUN_HEAVY' | 'FAVORITE';

export type PlayFolder = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

export type Play = {
  id: string;
  name: string;

  // Formation
  formation: FormationType;
  personnel?: PersonnelPackage;

  // Play type
  playType: 'RUN' | 'PASS';

  // QB action
  passAction?: PassAction;
  qbRun?: QBRunType;

  // Schemes
  protectionScheme?: ProtectionScheme;
  runBlockingScheme?: RunBlockingScheme;

  // Assignments
  assignments: PlayerAssignment[];

  // Motion
  motion?: MotionAssignment;

  // Organization
  tags: PlayTag[];
  folderId?: string;
  concept?: string; // e.g., "4 Verts", "Mesh", "Power"
  notes?: string;

  // Metadata
  thumbnail?: string;
  createdAt: number;
  updatedAt?: number;
  timesUsed: number;
  successRate: number;
};

export type Playbook = {
  id: string;
  name: string;
  plays: Play[];
  folders: PlayFolder[];
};

// ==================== CONCEPT TEMPLATES ====================

export type ConceptTemplate = {
  id: string;
  name: string;
  description: string;
  playType: 'RUN' | 'PASS';
  defaultFormation: FormationType;
  assignments: Partial<PlayerAssignment>[];
  tags: PlayTag[];
};

// ==================== RECEIVER POSITION (Legacy) ====================

export type ReceiverPosition = 'X' | 'Z' | 'H' | 'F' | 'Y' | 'RB1' | 'RB2';
