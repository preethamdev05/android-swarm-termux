export const CODING_PROFILE = `
# Kotlin/Android Coding Profile

## SDK and Build Configuration
- Gradle: As specified in task spec
- Kotlin: As specified in task spec, JVM target 17
- Android SDK: Min and target as specified in task spec
- Compile SDK: Same as target SDK

## Required Dependencies
- AndroidX Core KTX
- AndroidX AppCompat
- Material Design Components
- Jetpack Compose (if ui_system=Compose)
- AndroidX Lifecycle (ViewModel, LiveData)
- AndroidX Navigation (if multi-screen)
- Kotlin Coroutines
- Kotlin Serialization (if network/data)

## Kotlin File Requirements
- Package declaration first (must match directory structure)
- Imports after package, sorted alphabetically, no wildcards
- Single public class per file (except sealed hierarchies)
- PascalCase for classes, camelCase for functions/properties
- 4-space indentation, no tabs
- Explicit null handling, prefer non-null types
- Explicit visibility modifiers

## XML File Requirements (Views)
- Root element matches file purpose
- Declare android, app, tools namespaces on root
- Use @+id/ for new IDs, camelCase naming
- Use dp for layout, sp for text
- Reference @color/ and @string/ resources, no hardcoded values

## Compose Requirements
- Composable functions: PascalCase, @Composable annotation
- State: Use remember, mutableStateOf, collectAsState
- Include @Preview function for screens
- Chain modifiers fluently

## Gradle File Requirements
- Plugins block at top using id() DSL
- Android block: configure compileSdk, minSdk, targetSdk, kotlinOptions
- Dependencies grouped by type
- Explicit versions, no +

## AndroidManifest.xml Requirements
- Package matches app_name and structure
- Declare required permissions
- Application tag: android:name, android:icon, android:theme
- Main activity with LAUNCHER intent-filter

## Forbidden Patterns
- android.support.* (use AndroidX)
- AsyncTask (use Coroutines)
- Handler.postDelayed (use Coroutines)
- ProgressDialog (use Material Design)
- Hardcoded API keys/URLs
- Insecure network (use HTTPS)
- UI work on main thread
- runBlocking (except main/tests)
- Activity/Fragment refs in long-lived objects
- var state in Composable (use mutableStateOf)

## Rejection Criteria

### BLOCKER (Must Reject)
- Syntax errors
- Missing required Android components
- Incorrect superclass
- Invalid Android API usage
- Unresolved imports/dependencies
- Missing @Composable for Compose functions
- Incorrect/missing Gradle plugin
- Missing/malformed AndroidManifest.xml

### MAJOR (Should Reject)
- Incorrect architecture pattern
- Missing null checks
- Poor error handling (empty catch blocks)
- Hardcoded strings/colors/dimensions
- Missing lifecycle handling
- Incorrect Coroutine scope (GlobalScope)

### MINOR (Accept with Warning)
- Verbose code
- Missing edge case handling (non-critical)
- Suboptimal performance
- Missing Compose preview
`;
