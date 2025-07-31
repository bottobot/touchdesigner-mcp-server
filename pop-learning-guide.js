/**
 * POP Learning Guide Information
 * Extracted from https://touchdesigner.notion.site/Learning-About-POPs-3f7645a368a043f99cd143e2382b8ab0
 * 
 * This information can be added to the TD-MCP server to provide educational context about POPs
 */

export const POPLearningGuide = {
  overview: {
    title: "Learning About POPs",
    description: "POPs (Point Operators) is a new Operator Family of TouchDesigner for creating and modifying 3D geometry data that runs on accelerated GPU graphics cards or chips.",
    keyPoints: [
      "The P in POPs refers to 'points' but co-incidentally it envelops other P's - primitives, polygons, particle systems, point clouds and any form of data points for data visualizations.",
      "The data for POPs all starts as points with attributes, and from points we can work with particle systems, point clouds, polygons, lines, spline curves, and any 3D geometrical shape and form of data points.",
      "POPs are rendered by the Render TOP or can be passed to devices like DMX lighting systems, LED arrays, lasers or other external systems."
    ]
  },
  
  categories: {
    "What are Point Operators": {
      description: "POPs is a new Operator Family of TouchDesigner for creating and modifying 3D geometry data that runs on accelerated GPU graphics cards or chips.",
      details: [
        "POPs handle points with attributes",
        "Can create particle systems, point clouds, polygons, lines, spline curves",
        "Fully GPU accelerated",
        "Can handle millions+ of points"
      ]
    },
    
    "POPs vs SOPs": {
      description: "Key differences between Point Operators and Surface Operators",
      details: [
        "POPs run on GPU, SOPs run on CPU",
        "POPs designed for massive point/particle systems",
        "POPs have specialized particle attributes",
        "SOPs better for traditional polygon modeling"
      ]
    },
    
    "Attributes": {
      description: "POPs work with point attributes that define properties",
      commonAttributes: [
        "P - Position (vec3)",
        "PartId - Unique particle ID (uint)",
        "PartVel - Particle velocity (vec3)",
        "PartAge - Particle age in seconds (float)",
        "PartLifeSpan - Particle lifespan in seconds (float)",
        "PartMass - Particle mass (float)",
        "PartForce - Cumulative forces (vec3)"
      ]
    },
    
    "Creating Custom Attributes": {
      description: "POPs allow creation of custom attributes for specialized behaviors",
      examples: [
        "Custom color attributes",
        "Custom force modifiers",
        "State tracking attributes",
        "User-defined properties"
      ]
    }
  },
  
  workflow: {
    title: "POP Workflow",
    steps: [
      "Start with Particle POP or other generator",
      "Add Force POPs to apply physics",
      "Use modifier POPs to control behavior",
      "Connect to Null POP for feedback loop",
      "Render with Render TOP or output to devices"
    ]
  },
  
  bestPractices: [
    "Use feedback loops for continuous particle systems",
    "Leverage GPU acceleration for millions of particles",
    "Combine multiple Force POPs for complex behaviors",
    "Use attributes to drive visual properties",
    "Consider using Timer CHOP for system control"
  ],
  
  examplePackage: {
    name: "POPs Examples Package",
    description: "Download the POPs Examples Package and start with Overview.toe",
    url: "Available from TouchDesigner documentation"
  }
};

/**
 * Add this educational content to operator metadata
 */
export function enrichPOPMetadata(operator) {
  if (operator.category === 'POP') {
    operator.educationalContext = {
      overview: POPLearningGuide.overview.description,
      keyPoints: POPLearningGuide.overview.keyPoints,
      workflow: POPLearningGuide.workflow,
      bestPractices: POPLearningGuide.bestPractices
    };
    
    // Add attribute information for relevant operators
    if (operator.name === 'Particle') {
      operator.commonAttributes = POPLearningGuide.categories.Attributes.commonAttributes;
    }
  }
  
  return operator;
}