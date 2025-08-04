// Whitelist of the 79 true POP (Particle Operators) in TouchDesigner
// These are the only operators that should be classified as POP
export const POP_OPERATOR_WHITELIST = [
  // Particle Generation
  'Particle SOP',
  'Add POP',
  'Birth POP',
  'Source POP',
  
  // Forces
  'Force POP',
  'Attractor POP',
  'Drag POP',
  'Wind POP',
  'Turbulence POP',
  'Fan POP',
  'Gravity POP',
  'Magnet POP',
  'Point Force POP',
  'Uniform Force POP',
  'Vortex POP',
  'Orbit POP',
  'Curve Force POP',
  'Soft Body POP',
  'Spring POP',
  
  // Modifiers
  'Collision POP',
  'Limit POP',
  'Property POP',
  'Color POP',
  'Size POP',
  'Sprite POP',
  'Rotate POP',
  'Torque POP',
  'Position POP',
  'Velocity POP',
  'Acceleration POP',
  'Angular Velocity POP',
  'Speed Limit POP',
  'Kill POP',
  'Life POP',
  'Age POP',
  
  // Behaviors
  'Interact POP',
  'Proximity POP',
  'Flock POP',
  'Follow POP',
  'Seek POP',
  'Avoid POP',
  'Wander POP',
  'Path POP',
  'Slide POP',
  'Stick POP',
  'Ray POP',
  
  // Simulation
  'Solver POP',
  'Split POP',
  'Join POP',
  'Group POP',
  'Stream POP',
  'Instance POP',
  'Copy POP',
  'Delete POP',
  'Sort POP',
  'Cache POP',
  'Time Shift POP',
  
  // Fields
  'Metaball POP',
  'SDF POP',
  'Volume POP',
  'Fluid POP',
  
  // Utilities
  'Null POP',
  'Switch POP',
  'Merge POP',
  'Blend POP',
  'Noise POP',
  'Lookup POP',
  'Script POP',
  'Point POP',
  'Primitive POP',
  'Attribute POP',
  'Render POP',
  'Info POP',
  'Visualize POP'
];

// Common false positive patterns to explicitly exclude
export const POP_FALSE_POSITIVE_PATTERNS = [
  // UI-related false positives
  /popup/i,
  /pop-up/i,
  /popmenu/i,
  /popdialog/i,
  /popover/i,
  
  // Documentation/page false positives
  /page\s*class/i,
  /main\s*page/i,
  /help$/i,
  /dialog$/i,
  /manager/i,
  /requirements/i,
  /technology/i,
  /storage/i,
  /nvidia/i,
  /language$/i,
  /mapping$/i,
  /lock\s*flag/i,
  /global\s*op/i,
  /thread/i,
  
  // Non-POP operator patterns
  /^palette:/i,
  /experimental-/i
];

// Helper function to check if a name is a true POP operator
export function isTruePOPOperator(operatorName) {
  if (!operatorName) return false;
  
  // Normalize the name for comparison
  const normalizedName = operatorName.trim();
  
  // Check whitelist (case-insensitive)
  return POP_OPERATOR_WHITELIST.some(popOp => 
    popOp.toLowerCase() === normalizedName.toLowerCase()
  );
}

// Helper function to check if a name is a false positive
export function isPOPFalsePositive(operatorName) {
  if (!operatorName) return false;
  
  // Check against false positive patterns
  return POP_FALSE_POSITIVE_PATTERNS.some(pattern => 
    pattern.test(operatorName)
  );
}