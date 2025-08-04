# TouchDesigner Operator Metadata Analysis and Proposed Schema

This document provides an analysis of the metadata extracted from the TouchDesigner operator documentation and proposes a new metadata schema to enhance the search capabilities of the MCP server.

## 1. Metadata Analysis

### 1.1. Common Metadata Structures

Across all operator categories, the following common metadata structures were identified:

- **Category**: The primary operator family (e.g., COMP, TOP, SOP, DAT, MAT).
- **Description**: A brief summary of the operator's function.
- **Operators**: A list of all operators within the category.
- **Related Operators**: A list of operators that are functionally related to the current operator.

### 1.2. Unique Attributes per Category

- **COMP**:
    - **Subcategories**: Components are further divided into subcategories like "Object Components," "Panel Components," and "Miscellaneous Components."
- **TOP**:
    - **Input/Output**: TOPs have a strong emphasis on image processing, with clear input and output characteristics.
- **SOP**:
    - **Geometry**: SOPs are focused on 3D geometry, with attributes related to points, polygons, and surfaces.
- **DAT**:
    - **Data Types**: DATs handle various data types, including text, tables, scripts, and XML.
- **MAT**:
    - **Shaders**: MATs are used to apply shaders to geometry, with attributes related to lighting, textures, and materials.

### 1.3. Cross-Category Relationships

- **CHOPs and TOPs**: CHOPs can be converted to TOPs to visualize data as images.
- **SOPs and MATs**: SOPs are used to create 3D geometry, which is then textured and shaded using MATs.
- **DATs and SOPs**: DATs can be used to generate and manipulate 3D geometry in SOPs.

### 1.4. Naming Conventions and Patterns

- **Suffixes**: Operator names often include a suffix that indicates their category (e.g., `_COMP`, `_TOP`, `_SOP`, `_DAT`, `_MAT`).
- **Prefixes**: Some operators have prefixes that indicate their function (e.g., `in_`, `out_`, `select_`).

## 2. Proposed Metadata Schema

Based on the analysis, the following metadata schema is proposed to enhance the search capabilities of the MCP server:

```json
{
  "operators": [
    {
      "name": "Operator Name",
      "category": "COMP | TOP | SOP | DAT | MAT",
      "subcategory": "Subcategory Name (if applicable)",
      "description": "A brief summary of the operator's function.",
      "aliases": ["alternative name 1", "alternative name 2"],
      "keywords": ["keyword 1", "keyword 2"],
      "use_cases": ["use case 1", "use case 2"],
      "inputs": ["input 1", "input 2"],
      "outputs": ["output 1", "output 2"],
      "related_operators": ["related operator 1", "related operator 2"]
    }
  ]
}
```

### 2.1. Schema Fields

- **name**: The official name of the operator.
- **category**: The primary operator family.
- **subcategory**: The subcategory of the operator (if applicable).
- **description**: A brief summary of the operator's function.
- **aliases**: A list of alternative names for the operator.
- **keywords**: A list of keywords that describe the operator's function.
- **use_cases**: A list of common use cases for the operator.
- **inputs**: A list of the operator's inputs.
- **outputs**: A list of the operator's outputs.
- **related_operators**: A list of operators that are functionally related to the current operator.

## 3. Recommendations for Implementation

- **Data Collection**: The proposed metadata schema should be populated with data extracted from the TouchDesigner documentation.
- **Search Algorithm**: The search algorithm should be updated to use the new metadata schema to improve search relevance and accuracy.
- **User Interface**: The user interface should be updated to display the new metadata to the user.

## 4. Examples of How the Metadata Would Improve Search Results

- **Search for "3D object"**: The search results would include all operators in the "Object Components" subcategory, as well as any other operators that have "3D object" in their keywords or use cases.
- **Search for "image processing"**: The search results would include all operators in the "TOP" category, as well as any other operators that have "image processing" in their keywords or use cases.
- **Search for "data manipulation"**: The search results would include all operators in the "DAT" category, as well as any other operators that have "data manipulation" in their keywords or use cases.