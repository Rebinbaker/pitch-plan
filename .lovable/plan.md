

## Plan: Persist sub-view state (list/map) when switching tabs

### Problem
The `viewMode` state (`'list' | 'map'`) in `ProjectDashboard.tsx` is initialized to `'list'` every render. When the user switches to another tab and comes back, the component remounts and resets to list view.

### Solution
Store `viewMode` in the parent (`Index.tsx`) or use `localStorage` so it persists across tab switches.

**Simplest approach**: Use `localStorage` via a small hook or inline logic in `ProjectDashboard.tsx`.

### Changes

**`src/components/ProjectDashboard.tsx`** (1 file, ~3 lines changed):
- Change `useState<'list' | 'map'>('list')` to read initial value from `localStorage`
- Add a `useEffect` to persist `viewMode` changes to `localStorage`

```tsx
const [viewMode, setViewMode] = useState<'list' | 'map'>(() => {
  return (localStorage.getItem('projectViewMode') as 'list' | 'map') || 'list';
});

useEffect(() => {
  localStorage.setItem('projectViewMode', viewMode);
}, [viewMode]);
```

This is a minimal, self-contained fix — no other files need changes.

