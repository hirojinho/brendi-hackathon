# Tab Crash Fix - Testing Instructions

## Current Status
The application has been updated with:
1. **Minimal Mode**: All tabs now start in a simplified mode to prevent crashes
2. **Error Boundaries**: Each tab is isolated to prevent crashes from spreading
3. **Development Toggle**: You can switch between minimal and full modes

## Testing Steps

### 1. Start the Application
```bash
cd desktop
npm run dev
```

### 2. Test Tab Switching (Minimal Mode)
The application should start in "Minimal Mode" by default. Try clicking on each tab:
- **Chat** - Should show a minimal chat interface
- **Notes** - Should show a minimal notes interface  
- **Zettelkasten** - Should show a simple placeholder
- **Review** - Should show a simple placeholder
- **Documents** - Should show a simple placeholder

**Expected Result**: All tabs should load without crashing the application.

### 3. Development Mode Toggle (If in Development)
If you're running in development mode, you should see a toggle button at the top center:
- Click the toggle button to switch between "Minimal Mode" and "Full Mode"
- Or use keyboard shortcut: `Cmd+Shift+M` (Mac) or `Ctrl+Shift+M` (Windows/Linux)

### 4. Test Full Mode (Advanced)
If minimal mode works, try switching to full mode:
- Click the toggle button or use `Cmd+Shift+M`
- Test each tab again
- If any tab crashes, it should show an error message instead of crashing the entire app

### 5. Error Recovery Testing
If you encounter an error in any tab:
- The tab should show an error message with a "Try Again" or "Refresh App" button
- Other tabs should continue to work normally
- You can click "Try Again" to retry the failed component

## Keyboard Shortcuts (Development Mode)
- `Cmd+Shift+M` - Toggle between minimal and full components
- `Cmd+Shift+D` - Toggle diagnostics panel
- `Cmd+1-5` - Switch between tabs directly
- `Escape` - Close diagnostics panel

## What to Look For

### ✅ Success Indicators
- Application starts without crashing
- All tabs can be clicked and load content
- Tab switching is smooth and responsive
- Error messages appear instead of crashes (if issues occur)

### ❌ Failure Indicators  
- Application crashes/stops when clicking tabs
- White screen or frozen interface
- Console errors that prevent tab loading
- Entire application becomes unresponsive

## Troubleshooting

### If Tabs Still Crash
1. **Check Console**: Open Developer Tools (F12) and check for error messages
2. **Try Minimal Mode**: Ensure the toggle shows "Minimal Mode" (green button)
3. **Restart Application**: Close and restart the app
4. **Report Specific Errors**: Note which specific tab crashes and any error messages

### If Minimal Mode Works But Full Mode Crashes
This indicates the issue is with specific complex components:
- **Chat Tab**: Likely `useChat` hook or service dependencies
- **Notes Tab**: Likely `NotesManagementPanel` or related services
- **Other Tabs**: Likely missing service implementations

## Next Steps

### If Minimal Mode Works
- The crash issue is resolved for basic functionality
- Complex features can be gradually re-enabled
- Individual components can be debugged separately

### If Issues Persist
- Check browser console for specific error messages
- Try running: `npm run build:renderer` to rebuild
- Check if backend services are running properly

## Development Notes
- Minimal components are in: `desktop/src/renderer/components/desktop/Minimal*.tsx`
- Error boundaries are in: `desktop/src/renderer/components/DesktopApp.tsx`
- Toggle logic allows safe testing of complex components

The goal is to have a stable application where you can switch between all tabs without crashes, even if some features are temporarily simplified.