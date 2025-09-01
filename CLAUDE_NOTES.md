# Claude Development Notes - Emre Digital Twin Platform

## Current System Overview (Updated: 2025-08-31)

### Core Architecture
- **Platform**: Next.js 13+ with TypeScript, Three.js for 3D rendering
- **Database**: SQLite with Prisma ORM for asset metadata
- **3D Assets**: GLB files with GUID-based naming, stored with Git LFS
- **Navigation**: Apple-style MenuBar component across all pages

### Key Pages & Components
1. **Home (`/`)** - Main dashboard with file upload, tabbed viewers
2. **Assets (`/assets`)** - Asset library with metadata management  
3. **Multi-viewer (`/multi-viewer`)** - Multiple GLB models in one scene
4. **Hierarchy (`/hierarchy`)** - O_DD asset hierarchy browser
5. **Data (`/data`)** - Pivot table data management interface
6. **Mother-viewer (`/mother-viewer`)** - Main 3D building model with drill-down navigation

---

## O_DD Hierarchy System (CRITICAL IMPLEMENTATION)

### Understanding O_DD Classification
O_DD (OmniClass) uses a strict 4-level hierarchy system:

```
O_DD1: Major building systems (Structure, HVAC, Electrical, etc.)
O_DD2: Sub-systems within O_DD1 (Foundation, Framing, etc.)
O_DD3: Detailed components within O_DD2 (Footings, Beams, etc.) 
O_DD4: Specific elements within O_DD3 (Concrete, Steel, etc.)
```

### STRICT HIERARCHY RULES
**For a volume to appear at O_DD Level X:**
- ✅ Must have O_DD1 through O_DDX parameters filled with values
- ✅ Must have O_DD(X+1) through O_DD4 parameters EMPTY/NULL
- ❌ Cannot skip levels (e.g., O_DD1 + O_DD3 without O_DD2)

### Implementation Details

#### Mother Viewer Drill-Down System
**File**: `app/mother-viewer/page.tsx`
- **Initial State**: Shows only PURE O_DD1 volumes (O_DD1 filled, O_DD2/3/4 empty)
- **Drill-Down**: O_DD1 → O_DD2 → O_DD3 → O_DD4 progression
- **Parent-Child Logic**: Uses shared O_DD1 classification to find children

#### 3D Viewer Component  
**File**: `app/components/MotherGLBViewer.tsx`
- **identifyO_DD1Items()**: Async function that checks ALL volumes for pure O_DD1 classification
- **Visibility Logic**: Only visibleGuids array items are shown, rest are hidden
- **Material System**: Selectable items = normal materials, non-selectable = dimmed gray

#### Key State Management
```typescript
// Mother viewer state
const [currentHierarchyLevel, setCurrentHierarchyLevel] = useState(1) // O_DD1, O_DD2, etc.
const [visibleGuids, setVisibleGuids] = useState<Set<string>>(new Set()) // Currently visible volumes
const [selectableGuids, setSelectableGuids] = useState<Set<string>>(new Set()) // Currently clickable
const [hierarchyBreadcrumbs, setHierarchyBreadcrumbs] = useState<Array<{guid: string, name: string, level: number}>>([])
```

### API Integration
**Revit Metadata API**: `/api/assets/revit-metadata?filepath=${guid}.glb`
- Returns volume parameters including O_DD1, O_DD2, O_DD3, O_DD4 values
- Used to determine volume classification level
- Critical for drill-down functionality

---

## Multi-GLB Viewer System

### Layout Architecture
**File**: `app/multi-viewer/page.tsx`
- **Full-screen 3D viewer** with overlay panels (not split-panel)
- **Overlay Panels**: Absolutely positioned, collapsible with localStorage persistence
  - Top Left: Asset list (w-80)
  - Bottom Left: Revit parameters (w-80)  
  - Top Right: Controls (w-72)

### Panel System
```typescript
const [isAssetListCollapsed, setIsAssetListCollapsed] = useState(false)
const [isParametersCollapsed, setIsParametersCollapsed] = useState(false)
const [isControlsCollapsed, setIsControlsCollapsed] = useState(false)
```

### 3D Enhancements
- **Top-left sunlight**: Enhanced directional lighting for better visibility
- **Camera zoom fix**: Double-click maintains viewing angle instead of resetting rotation
- **Auto-zoom to extents**: Fits all loaded models in view

---

## File Upload & Asset Management

### File Size Limits
- **Main page upload**: 500MB max (increased from 100MB)
- **Supported formats**: .glb, .jpg, .jpeg, .png, .webp for panoramas

### Asset Storage Structure
```
public/assets/glb/          - GLB 3D models
public/assets/panoramas/    - 360° panoramic images  
public/mother-glb/          - Main building model
public/bulk-upload/         - Batch processing folder
```

### GUID-Based Naming
All assets use GUID format: `{guid}-{suffix}.glb`
- **Example**: `21a96bfe-1d2f-4913-a727-8c72a07cf272-003cf9e2.glb`
- **Pattern**: 8-4-4-4-12-8 hex format

---

## Navigation System

### MenuBar Component
**File**: `app/components/MenuBar.tsx`
- **Apple HIG-inspired design**: Black/90 opacity, backdrop blur
- **Sticky positioning**: top-0 z-50
- **Active state highlighting**: Current page detection via usePathname()
- **Navigation links**: Home, Assets, Multi Viewer, Hierarchy, Data, Mother Viewer

### Removed Legacy Navigation
All page-specific navigation buttons/links have been removed in favor of the unified MenuBar system.

---

## Development Guidelines

### Code Style Preferences
- **NO COMMENTS** unless explicitly requested
- **Concise responses** - avoid unnecessary explanations
- **Edit existing files** rather than creating new ones
- **Follow existing patterns** in codebase

### Tool Usage Patterns
- **TodoWrite**: Use for complex multi-step tasks (3+ steps)
- **MultiEdit**: Preferred for multiple edits to same file
- **Grep/Glob**: For searching, avoid bash grep/find
- **Read before Edit**: Always read files before editing

### Git LFS Setup
- **Configured for**: *.glb, *.bin files
- **Storage**: Large 3D assets tracked with LFS
- **Never commit secrets** or expose credentials

---

## Current System State

### Working Features
✅ Apple-style navigation across all pages
✅ Strict O_DD hierarchy drill-down in mother viewer  
✅ Multi-GLB viewer with collapsible overlay panels
✅ Enhanced lighting and camera controls
✅ File upload with 500MB limit
✅ Asset metadata integration with Revit parameters

### Architecture Decisions
- **Hierarchy management**: Parent component manages state, child component handles rendering
- **Visibility control**: Uses visibleGuids/selectableGuids arrays for precise control
- **API integration**: Fetches Revit metadata on-demand for O_DD analysis
- **Performance**: Caches volume GUIDs to minimize redundant API calls

### Known Limitations
- **O_DD search performance**: Checks all volumes individually (could be optimized with batch API)
- **Parent-child relationships**: Currently uses shared O_DD1 classification (may need refinement)
- **Error handling**: Graceful fallbacks but could be more robust

---

## DRILL-DOWN HIERARCHY IMPLEMENTATION (PAUSED FOR DEBUGGING)

### Status: IMPLEMENTED BUT TEMPORARILY DISABLED
The complete drill-down hierarchy system has been implemented but is currently disabled for basic visibility testing.

#### Key Components Implemented:
- **Master Building GUID**: `5ed5a9ae-bb0a-4af2-bf7c-25da60493dd0-003f9206` as permanent hierarchy root
- **LCX_GUID_PARENT_01_GUID Navigation**: Uses actual Revit parent-child relationships
- **6-Level Hierarchy**: Master (0) → Floor (1) → O_DD1 (2) → O_DD2 (3) → O_DD3 (4) → O_DD4 (5)
- **Floor Detection**: Uses `VOLUME_CATEGORY = "FLOOR"` parameter
- **Pure O_DD Classification**: Strict validation (O_DD1 filled, O_DD2/3/4 empty)
- **Breadcrumb Navigation**: Full back-navigation with proper level names

#### Functions Ready for Re-activation:
```typescript
// app/mother-viewer/page.tsx
const findChildVolumes = async (parentGuid: string, filterOptions?) => { ... }
const drillDownToLevel = async (selectedVolume: any, targetLevel: number) => { ... }
const navigateBackToLevel = async (targetBreadcrumb) => { ... }
const getLevelName = (level: number): string => { ... }
```

#### State Variables for Hierarchy:
```typescript
const [currentHierarchyLevel, setCurrentHierarchyLevel] = useState(0)
const [hierarchyBreadcrumbs, setHierarchyBreadcrumbs] = useState([])
const [visibleGuids, setVisibleGuids] = useState(new Set())
const [selectableGuids, setSelectableGuids] = useState(new Set())
```

#### Comprehensive Debugging Added:
- Full console debugging throughout all functions
- GUID discovery and validation
- Parent-child relationship logging
- State change tracking
- API call monitoring

#### Issue Identified:
Master building GUID hardcoded value may not match actual GLB contents. Fallback mechanism implemented to use first available GUID for testing.

#### Next Steps for Re-activation:
1. Verify correct Master building GUID from GLB contents
2. Test basic visibility control first
3. Re-enable drill-down navigation once visibility works
4. Validate parent-child relationships with actual data

---

## Future Enhancement Areas
- Batch metadata API for improved O_DD analysis performance
- More sophisticated parent-child relationship logic  
- Caching of O_DD classification data
- Enhanced error handling and user feedback
- Re-integrate drill-down hierarchy after visibility testing

---

*Last Updated: 2025-09-01 by Claude*