## Custom Operators in TouchDesigner

This document summarizes the fundamental concepts and architecture of custom operators in TouchDesigner, based on the offline help files.

### 1. What are Custom Operators in TouchDesigner?

A Custom Operator (OP) is a user-created operator that extends the functionality of TouchDesigner. They are created using the C++ API and behave like native TouchDesigner operators. Custom OPs can be of type TOP, CHOP, SOP, or DAT, and they appear in the OP Create menu for seamless integration.

### 2. Different Types of Custom Operators Available

Custom OPs can be created for the following operator families:

- **TOP (Texture Operators):** For creating and manipulating image data.
- **CHOP (Channel Operators):** For working with channel-based data, such as audio or animation.
- **SOP (Surface Operators):** For creating and manipulating 3D geometry.
- **DAT (Data Operators):** For working with text-based data, such as scripts or tables.

### 3. Basic Architecture and Lifecycle of Custom Operators

The basic architecture of a Custom OP involves creating a C++ class that inherits from a TouchDesigner-provided base class. This class implements a set of virtual functions that define the operator's behavior.

The lifecycle of a Custom OP is managed by TouchDesigner, which creates an instance of the C++ class for each Custom OP in the network. The `execute()` function is called by TouchDesigner when the operator needs to cook, and this is where the main logic of the operator resides.

### 4. Programming Interfaces Available (Python, C++, etc.)

The primary programming interface for creating Custom OPs is **C++**. The documentation also mentions that Custom OPs can interface with **Python**, allowing for the creation of custom Python classes and methods that can be accessed from within TouchDesigner. However, this functionality is only available when the plugin is installed as a Custom Operator, not when it's used within a CPlusPlus node.

### 5. How Custom Operators Integrate with TouchDesigner's Network

Custom OPs are integrated into TouchDesigner's network by placing the compiled plugin file (a `.dll` on Windows or a `.plugin` bundle on macOS) in a specific folder. TouchDesigner automatically detects and loads these plugins on startup. Once loaded, the Custom OP can be created and used just like any other native operator, with inputs, outputs, and custom parameters.

### 6. Any Limitations or Constraints for Custom Operators

- **Security:** Since Custom OPs are binary code, they can potentially contain malicious code. TouchDesigner prompts the user for permission before loading a new or modified plugin for the first time.
- **Dependencies:** Custom OPs may have dependencies on other libraries (e.g., OpenCV, CUDA). These dependencies must be placed in the correct location for the operator to load successfully.
- **Python Integration:** Python integration only works when the plugin is installed as a Custom Operator, not when used within a CPlusPlus node.