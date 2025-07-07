export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

export interface TouchDesignerCompatibility {
  pythonVersion: string;
  requiredModules: string[];
  touchDesignerVersion: string;
  operatorTypes: string[];
}

export class TouchDesignerValidator {
  private touchDesignerCompatibility: TouchDesignerCompatibility = {
    pythonVersion: "3.9",
    requiredModules: ['numpy', 'sys', 'os', 'time', 'threading'],
    touchDesignerVersion: "2023.11600",
    operatorTypes: ['CHOP', 'TOP', 'SOP', 'DAT', 'COMP', 'MAT']
  };

  async validatePythonCode(code: string, filePath: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];

    try {
      // Basic syntax validation
      await this.validateBasicSyntax(code, issues);
      
      // TouchDesigner-specific validation
      await this.validateTouchDesignerCompatibility(code, issues, suggestions);
      
      // Performance validation
      await this.validatePerformancePatterns(code, issues, suggestions);
      
      // Best practices validation
      await this.validateBestPractices(code, issues, suggestions);

      return {
        valid: !issues.some(issue => issue.type === 'error'),
        issues,
        suggestions
      };

    } catch (error) {
      issues.push({
        type: 'error',
        message: `Validation failed: ${error.message}`,
        code: 'VALIDATION_ERROR'
      });

      return {
        valid: false,
        issues,
        suggestions
      };
    }
  }

  private async validateBasicSyntax(code: string, issues: ValidationIssue[]): Promise<void> {
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for basic Python syntax issues
      if (line.trim() && !line.startsWith('#')) {
        // Check for unmatched quotes
        const singleQuotes = (line.match(/'/g) || []).length;
        const doubleQuotes = (line.match(/"/g) || []).length;
        
        if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
          issues.push({
            type: 'error',
            message: 'Unmatched quotes detected',
            line: lineNumber,
            code: 'SYNTAX_QUOTES'
          });
        }

        // Check for missing colons in control structures
        if (/^\s*(if|for|while|def|class|try|except|finally|with)\s+.*[^:]$/.test(line)) {
          issues.push({
            type: 'error',
            message: 'Missing colon at end of control structure',
            line: lineNumber,
            code: 'SYNTAX_COLON'
          });
        }

        // Check for incorrect indentation (basic check)
        if (line.startsWith('\t') && line.includes('    ')) {
          issues.push({
            type: 'warning',
            message: 'Mixed tabs and spaces for indentation',
            line: lineNumber,
            code: 'INDENTATION_MIXED'
          });
        }
      }
    }
  }

  private async validateTouchDesignerCompatibility(
    code: string, 
    issues: ValidationIssue[], 
    suggestions: string[]
  ): Promise<void> {
    
    // Check for TouchDesigner-specific imports
    const touchDesignerImports = [
      'td', 'op', 'ops', 'par', 'pars', 'me', 'parent', 'root',
      'iop', 'ipar', 'project', 'app', 'ui', 'tdu'
    ];

    const hasTextureOperators = /\b(TOP|texture|imageFormat|resolution)\b/.test(code);
    const hasChannelOperators = /\b(CHOP|channel|sample|rate)\b/.test(code);
    const hasSurfaceOperators = /\b(SOP|geometry|point|primitive)\b/.test(code);
    const hasDataOperators = /\b(DAT|table|text|xml|json)\b/.test(code);

    if (hasTextureOperators) {
      suggestions.push('Consider using texture operators (TOPs) for image processing');
    }

    if (hasChannelOperators) {
      suggestions.push('Optimize CHOP operations for real-time performance');
    }

    // Check for performance-critical patterns
    if (code.includes('while True:') && !code.includes('time.sleep')) {
      issues.push({
        type: 'warning',
        message: 'Infinite loop without sleep may cause performance issues in TouchDesigner',
        code: 'PERFORMANCE_LOOP'
      });
      suggestions.push('Add time.sleep() to infinite loops to prevent blocking TouchDesigner');
    }

    // Check for proper error handling in TouchDesigner context
    if (code.includes('import ') && !code.includes('try:') && !code.includes('except ImportError:')) {
      suggestions.push('Consider adding try/except blocks for import statements for better TouchDesigner compatibility');
    }

    // Check for threading best practices
    if (code.includes('threading.Thread') && !code.includes('daemon=True')) {
      issues.push({
        type: 'warning',
        message: 'Threads should be marked as daemon threads in TouchDesigner',
        code: 'THREADING_DAEMON'
      });
      suggestions.push('Set daemon=True for threads to prevent blocking TouchDesigner shutdown');
    }

    // Check for OSC integration patterns
    if (code.includes('OSC') || code.includes('osc')) {
      if (!code.includes('socket')) {
        suggestions.push('Ensure proper socket handling for OSC communication');
      }
    }

    // Check for Kinect integration patterns
    if (code.includes('kinect') || code.includes('Kinect')) {
      if (!code.includes('simulation') && !code.includes('fallback')) {
        suggestions.push('Consider adding simulation/fallback mode for Kinect integration');
      }
    }
  }

  private async validatePerformancePatterns(
    code: string, 
    issues: ValidationIssue[], 
    suggestions: string[]
  ): Promise<void> {
    
    // Check for expensive operations in loops
    const expensiveOperations = [
      'numpy.array', 'cv2.', 'time.sleep', 'socket.', 'file.open', 'open('
    ];

    const lines = code.split('\n');
    let inLoop = false;
    let loopDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      // Track loop nesting
      if (/^\s*(for|while)\s+/.test(line)) {
        inLoop = true;
        loopDepth++;
      }
      
      if (inLoop && line.startsWith('    '.repeat(loopDepth))) {
        // Check for expensive operations in loops
        for (const operation of expensiveOperations) {
          if (line.includes(operation)) {
            issues.push({
              type: 'warning',
              message: `Potentially expensive operation '${operation}' in loop`,
              line: lineNumber,
              code: 'PERFORMANCE_LOOP_OPERATION'
            });
          }
        }
      }

      // Reset loop tracking
      if (line && !line.startsWith('    '.repeat(loopDepth)) && inLoop) {
        inLoop = false;
        loopDepth = 0;
      }
    }

    // Check for memory-intensive operations
    if (code.includes('numpy.zeros') || code.includes('numpy.ones')) {
      if (!code.includes('dtype=')) {
        suggestions.push('Specify dtype for numpy arrays to optimize memory usage');
      }
    }

    // Check for GPU acceleration opportunities
    if (code.includes('numpy') && code.includes('image')) {
      suggestions.push('Consider using GPU-accelerated operations for image processing');
    }

    // Check for real-time processing patterns
    if (code.includes('frame') || code.includes('real-time') || code.includes('fps')) {
      if (!code.includes('performance') && !code.includes('monitor')) {
        suggestions.push('Consider adding performance monitoring for real-time processing');
      }
    }
  }

  private async validateBestPractices(
    code: string, 
    issues: ValidationIssue[], 
    suggestions: string[]
  ): Promise<void> {
    
    // Check for proper error handling
    const hasErrorHandling = code.includes('try:') && code.includes('except');
    if (!hasErrorHandling && code.length > 100) {
      suggestions.push('Add error handling (try/except blocks) for robust operation');
    }

    // Check for logging
    if (!code.includes('print') && !code.includes('logging') && code.length > 50) {
      suggestions.push('Consider adding logging for debugging and monitoring');
    }

    // Check for configuration management
    if (code.includes('port') || code.includes('address') || code.includes('path')) {
      if (!code.includes('config') && !code.includes('settings')) {
        suggestions.push('Consider using configuration files for settings management');
      }
    }

    // Check for class structure
    if (code.includes('def ') && code.length > 200) {
      if (!code.includes('class ')) {
        suggestions.push('Consider organizing functions into classes for better structure');
      }
    }

    // Check for documentation
    const functionCount = (code.match(/def \w+/g) || []).length;
    const docstringCount = (code.match(/"""/g) || []).length / 2;
    
    if (functionCount > 2 && docstringCount < functionCount * 0.5) {
      suggestions.push('Add docstrings to functions for better documentation');
    }

    // Check for type hints (Python 3.5+)
    if (code.includes('def ') && !code.includes('->') && !code.includes(': str') && !code.includes(': int')) {
      suggestions.push('Consider adding type hints for better code clarity');
    }

    // Check for proper imports organization
    const lines = code.split('\n');
    const importLines = lines.filter(line => line.trim().startsWith('import ') || line.trim().startsWith('from '));
    
    if (importLines.length > 3) {
      const hasGroupedImports = importLines.some((line, index) => 
        index > 0 && line.trim() === '' || importLines[index - 1]?.trim() === ''
      );
      
      if (!hasGroupedImports) {
        suggestions.push('Group imports (standard library, third-party, local) for better organization');
      }
    }
  }

  async validateTouchDesignerProject(projectFiles: { [path: string]: string }): Promise<ValidationResult> {
    const allIssues: ValidationIssue[] = [];
    const allSuggestions: string[] = [];

    // Validate individual files
    for (const [filePath, content] of Object.entries(projectFiles)) {
      if (filePath.endsWith('.py')) {
        const fileResult = await this.validatePythonCode(content, filePath);
        
        // Add file context to issues
        fileResult.issues.forEach(issue => {
          allIssues.push({
            ...issue,
            message: `${filePath}: ${issue.message}`
          });
        });

        allSuggestions.push(...fileResult.suggestions);
      }
    }

    // Project-level validation
    await this.validateProjectStructure(projectFiles, allIssues, allSuggestions);

    return {
      valid: !allIssues.some(issue => issue.type === 'error'),
      issues: allIssues,
      suggestions: [...new Set(allSuggestions)] // Remove duplicates
    };
  }

  private async validateProjectStructure(
    projectFiles: { [path: string]: string },
    issues: ValidationIssue[],
    suggestions: string[]
  ): Promise<void> {
    
    const filePaths = Object.keys(projectFiles);
    
    // Check for required files
    const requiredFiles = ['setup_project.py', 'td_integration.py'];
    for (const required of requiredFiles) {
      if (!filePaths.includes(required)) {
        issues.push({
          type: 'error',
          message: `Missing required file: ${required}`,
          code: 'PROJECT_MISSING_FILE'
        });
      }
    }

    // Check for configuration files
    const hasConfigFiles = filePaths.some(path => path.includes('config') && path.endsWith('.json'));
    if (!hasConfigFiles) {
      suggestions.push('Add configuration files for better project management');
    }

    // Check for proper directory structure
    const hasScriptsDir = filePaths.some(path => path.startsWith('scripts/'));
    const hasConfigDir = filePaths.some(path => path.startsWith('config/'));
    
    if (!hasScriptsDir) {
      suggestions.push('Organize Python scripts in a dedicated scripts/ directory');
    }
    
    if (!hasConfigDir) {
      suggestions.push('Organize configuration files in a dedicated config/ directory');
    }

    // Check for README
    const hasReadme = filePaths.some(path => path.toLowerCase().includes('readme'));
    if (!hasReadme) {
      suggestions.push('Add README.md for project documentation');
    }

    // Check for requirements file
    const hasRequirements = filePaths.includes('requirements.txt');
    if (!hasRequirements) {
      suggestions.push('Add requirements.txt for dependency management');
    }
  }

  getCompatibilityInfo(): TouchDesignerCompatibility {
    return { ...this.touchDesignerCompatibility };
  }

  updateCompatibilityInfo(compatibility: Partial<TouchDesignerCompatibility>): void {
    this.touchDesignerCompatibility = {
      ...this.touchDesignerCompatibility,
      ...compatibility
    };
  }
}