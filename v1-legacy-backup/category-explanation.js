// This shows the structure of the metadata JSON files

console.log("=== METADATA FILE STRUCTURE ===\n");

console.log("In comprehensive_sop_metadata.json:");
console.log(`{
  "category": "SOP",        <-- This is the "file-level" category
  "description": "Surface Operators...",
  "operators": [
    {
      "name": "Circle SOP",
      "description": "Circle, sphere, torus primitives.",
      "related": ["Sphere SOP", "Torus SOP"]
      // Notice: NO "category" property here in the operator
    },
    {
      "name": "Grid SOP",
      "description": "Grid, box, rectangle.",
      "related": ["Box SOP", "Rectangle SOP"]
      // Notice: NO "category" property here either
    }
  ]
}`);

console.log("\n=== THE ISSUE ===\n");

console.log("The code expects each operator to have its own category:");
console.log(`
// In index.js line 95:
let text = \`**\${operator.name}** (\${operator.category})\n\`;
                                      ^^^^^^^^^^^^^^^^
                                      This is undefined!
`);

console.log("\n=== WHAT NEEDS TO HAPPEN ===\n");

console.log("When loading operators, we need to copy the file's category to each operator:");
console.log(`
// Before (current):
operators.set(op.name, op);  // op = {name: "Circle SOP", description: "...", related: [...]}

// After (fixed):
operators.set(op.name, { ...op, category: metadata.category });  
// Now op = {name: "Circle SOP", description: "...", related: [...], category: "SOP"}
`);