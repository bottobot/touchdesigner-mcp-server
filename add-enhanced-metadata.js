import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple subcategory detection based on operator name patterns
function detectSubcategory(operator) {
    const name = operator.name.toLowerCase();
    const displayName = operator.displayName.toLowerCase();
    
    // Audio subcategories
    if (name.includes('audio') || name.includes('sound')) {
        if (name.includes('device') || name.includes('in') || name.includes('out')) {
            return 'Audio I/O';
        }
        if (name.includes('filter') || name.includes('eq') || name.includes('dynamics')) {
            return 'Audio Processing';
        }
        if (name.includes('spectrum') || name.includes('analyze')) {
            return 'Audio Analysis';
        }
        if (name.includes('file') || name.includes('play') || name.includes('render')) {
            return 'Audio Playback';
        }
        return 'Audio';
    }
    
    // Input/Output subcategories
    if (name.includes('in') && !name.includes('kinect') && !name.includes('audio')) {
        return 'Input';
    }
    if (name.includes('out') && !name.includes('audio')) {
        return 'Output';
    }
    
    // Device subcategories
    if (name.includes('kinect') || name.includes('leap') || name.includes('realsense') || 
        name.includes('oak') || name.includes('zed')) {
        return 'Sensor Devices';
    }
    
    // Network/Communication subcategories
    if (name.includes('osc') || name.includes('midi') || name.includes('dmx') || 
        name.includes('tcp') || name.includes('udp') || name.includes('serial')) {
        return 'Network & Communication';
    }
    
    // Math/Logic subcategories
    if (name.includes('math') || name.includes('logic') || name.includes('expression') ||
        name.includes('function')) {
        return 'Math & Logic';
    }
    
    // Time-based subcategories
    if (name.includes('time') || name.includes('clock') || name.includes('timer') ||
        name.includes('delay') || name.includes('speed')) {
        return 'Time & Timing';
    }
    
    // Animation subcategories
    if (name.includes('lfo') || name.includes('wave') || name.includes('pattern') ||
        name.includes('noise') || name.includes('spring')) {
        return 'Animation & Generators';
    }
    
    // Channel manipulation
    if (name.includes('select') || name.includes('merge') || name.includes('join') ||
        name.includes('shuffle') || name.includes('reorder')) {
        return 'Channel Operations';
    }
    
    // Tracking subcategories
    if (name.includes('track') || name.includes('body') || name.includes('face') ||
        name.includes('blob')) {
        return 'Tracking & Motion Capture';
    }
    
    // Filter/Process subcategories
    if (name.includes('filter') || name.includes('lag') || name.includes('smooth') ||
        name.includes('limit')) {
        return 'Filtering & Processing';
    }
    
    // Default subcategory based on category
    return 'General';
}

// Extract use cases from description and operator name
function extractUseCases(operator) {
    const useCases = [];
    const name = operator.name.toLowerCase();
    const description = (operator.description || '').toLowerCase();
    const summary = (operator.summary || '').toLowerCase();
    
    // Audio use cases
    if (name.includes('audio')) {
        if (name.includes('device in')) {
            useCases.push('Capture audio from microphones or audio interfaces');
            useCases.push('Real-time audio input for interactive installations');
        }
        if (name.includes('device out')) {
            useCases.push('Output audio to speakers or audio interfaces');
            useCases.push('Multi-channel audio playback');
        }
        if (name.includes('spectrum')) {
            useCases.push('Audio visualization and frequency analysis');
            useCases.push('Beat detection and rhythm analysis');
        }
        if (name.includes('filter')) {
            useCases.push('Audio frequency filtering and EQ');
            useCases.push('Sound design and audio effects');
        }
    }
    
    // Tracking use cases
    if (name.includes('kinect')) {
        useCases.push('Motion capture and skeleton tracking');
        useCases.push('Interactive installations with body tracking');
        useCases.push('Depth sensing for 3D applications');
    }
    
    // Network use cases
    if (name.includes('osc')) {
        useCases.push('Network communication between applications');
        useCases.push('Remote control of TouchDesigner parameters');
        useCases.push('Integration with other creative software');
    }
    
    // MIDI use cases
    if (name.includes('midi')) {
        useCases.push('MIDI controller input for parameter control');
        useCases.push('MIDI sequencing and playback');
        useCases.push('Integration with music production software');
    }
    
    // Math/Logic use cases
    if (name.includes('math')) {
        useCases.push('Mathematical operations on channel data');
        useCases.push('Signal processing and data manipulation');
    }
    
    // Animation use cases
    if (name.includes('lfo')) {
        useCases.push('Low frequency oscillation for animation');
        useCases.push('Automated parameter modulation');
        useCases.push('Creating rhythmic patterns');
    }
    
    if (name.includes('noise')) {
        useCases.push('Procedural animation and randomness');
        useCases.push('Organic motion generation');
        useCases.push('Adding variation to parameters');
    }
    
    // Time-based use cases
    if (name.includes('timer')) {
        useCases.push('Event timing and sequencing');
        useCases.push('Creating time-based triggers');
        useCases.push('Performance timing and cues');
    }
    
    // Default use cases if none found
    if (useCases.length === 0) {
        useCases.push('Signal processing and data manipulation');
        useCases.push('Parameter control and automation');
    }
    
    return useCases;
}

// Parse inputs from operator (simplified version)
function parseInputs(operator) {
    const inputs = [];
    const name = operator.name.toLowerCase();
    
    // Common input patterns
    if (name.includes('math') || name.includes('blend') || name.includes('composite')) {
        inputs.push({
            name: 'Input 1',
            type: 'CHOP',
            description: 'First input channel data'
        });
        inputs.push({
            name: 'Input 2',
            type: 'CHOP',
            description: 'Second input channel data'
        });
    } else if (name.includes('filter') || name.includes('lag') || name.includes('smooth')) {
        inputs.push({
            name: 'Input',
            type: 'CHOP',
            description: 'Channel data to process'
        });
    } else if (name.includes('select') || name.includes('switch')) {
        inputs.push({
            name: 'Input',
            type: 'CHOP',
            description: 'Source channel data'
        });
    }
    
    // Device inputs typically don't have CHOP inputs
    if (name.includes('device') || name.includes('kinect') || name.includes('midi')) {
        // These typically have no CHOP inputs
        return [];
    }
    
    // Default single input for most operators
    if (inputs.length === 0 && !name.includes('constant') && !name.includes('noise') && 
        !name.includes('lfo') && !name.includes('pattern')) {
        inputs.push({
            name: 'Input',
            type: 'CHOP',
            description: 'Input channel data'
        });
    }
    
    return inputs;
}

// Parse outputs from operator (simplified version)
function parseOutputs(operator) {
    const outputs = [];
    const name = operator.name.toLowerCase();
    
    // Audio outputs
    if (name.includes('audio')) {
        if (name.includes('spectrum')) {
            outputs.push({
                name: 'Frequency Bins',
                type: 'CHOP',
                description: 'Frequency spectrum data'
            });
        } else {
            outputs.push({
                name: 'Audio',
                type: 'CHOP',
                description: 'Audio channel data'
            });
        }
    }
    
    // Tracking outputs
    else if (name.includes('kinect')) {
        outputs.push({
            name: 'Skeleton Data',
            type: 'CHOP',
            description: 'Joint positions and rotations'
        });
    }
    
    // Math/Logic outputs
    else if (name.includes('math') || name.includes('logic')) {
        outputs.push({
            name: 'Result',
            type: 'CHOP',
            description: 'Calculated result channels'
        });
    }
    
    // Time-based outputs
    else if (name.includes('timer') || name.includes('clock')) {
        outputs.push({
            name: 'Time',
            type: 'CHOP',
            description: 'Time-based output channels'
        });
    }
    
    // Default output
    else {
        outputs.push({
            name: 'Output',
            type: 'CHOP',
            description: 'Processed channel data'
        });
    }
    
    return outputs;
}

// Process a single metadata file
function processMetadataFile(filePath) {
    console.log(`Processing ${filePath}...`);
    
    try {
        // Read existing metadata
        const metadata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Add enhanced fields to each operator
        metadata.operators = metadata.operators.map(operator => {
            // Add new fields without breaking existing structure
            return {
                ...operator,
                subcategory: operator.subcategory || detectSubcategory(operator),
                use_cases: operator.use_cases || extractUseCases(operator),
                inputs: operator.inputs && operator.inputs.length > 0 ? operator.inputs : parseInputs(operator),
                outputs: operator.outputs && operator.outputs.length > 0 ? operator.outputs : parseOutputs(operator)
            };
        });
        
        // Update lastUpdated
        metadata.lastUpdated = new Date().toISOString();
        
        // Write updated metadata back
        fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
        console.log(`✓ Updated ${filePath}`);
        
        return true;
    } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
        return false;
    }
}

// Main migration function
function migrateMetadata() {
    console.log('Starting metadata migration...\n');
    
    const metadataDir = path.join(__dirname, 'metadata');
    const metadataFiles = [
        'comprehensive_chop_metadata.json',
        'comprehensive_comp_metadata.json',
        'comprehensive_component_metadata.json',
        'comprehensive_dat_metadata.json',
        'comprehensive_mat_metadata.json',
        'comprehensive_pop_metadata.json',
        'comprehensive_sop_metadata.json',
        'comprehensive_top_metadata.json'
    ];
    
    let successCount = 0;
    let failCount = 0;
    
    metadataFiles.forEach(file => {
        const filePath = path.join(metadataDir, file);
        if (fs.existsSync(filePath)) {
            if (processMetadataFile(filePath)) {
                successCount++;
            } else {
                failCount++;
            }
        } else {
            console.log(`✗ File not found: ${filePath}`);
            failCount++;
        }
    });
    
    console.log('\nMigration complete!');
    console.log(`✓ Successfully updated: ${successCount} files`);
    console.log(`✗ Failed: ${failCount} files`);
}

// Run migration when script is executed directly
migrateMetadata();

export {
    detectSubcategory,
    extractUseCases,
    parseInputs,
    parseOutputs
};