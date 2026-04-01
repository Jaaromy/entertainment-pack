# Mobile Compatibility Plan

## Goal
Make Klondike Solitaire fully playable on iPhone (iOS Safari). The click-to-select mechanic already works on mobile; the blocking issues are layout overflow and the absence of touch drag support.

## Status
- [x] CSS responsive card sizing (`klondike.css`)
- [x] `touch-action` CSS to prevent zoom/scroll interference
- [x] `useKlondike.ts` pointer-drag system (written but not yet wired to components)
- [ ] `CardView.tsx` — remove HTML5 drag props, add `onPointerDown`
- [ ] `TableauPile.tsx` — add `data-drop-area`/`data-drop-pile` attrs, replace drag props
- [ ] `FoundationPile.tsx` — same as TableauPile
- [ ] `WastePile.tsx` — replace drag props with `onPointerDown`
- [ ] `KlondikeGame.tsx` — render ghost, remove drag handler wiring, pass `onPointerDown`
- [ ] `CardGallery.tsx` — pass `draggable={false}` removal (minor cleanup)

---

## What Was Done

### `klondike.css`
- `--gap: 8px` extracted as a CSS variable (used by all grid/flex containers)
- `--card-w` is now `min(72px, calc((100vw - 32px - var(--gap) * 6) / 7))` so 7 columns always fit any screen width
- `--card-h` and `--waste-offset` derived from `--card-w` (already proportional)
- `.klondike-board--large` uses `min(96px, ...)` with same formula
- `touch-action: manipulation` on `.klondike-game` — prevents double-tap zoom
- `touch-action: none` on `.card` — prevents scroll starting on a card touch
- `.drag-ghost` class added for the pointer-drag ghost element

### `useKlondike.ts`
The hook was rewritten to replace the HTML5 drag API with pointer events:
- Removed from `UseKlondikeReturn`: `onDragStart`, `onDragEnd`, `onDragOver`, `onDrop`
- Added to `UseKlondikeReturn`: `onPointerDown`, `ghostPos`, `ghostCards`
- `pointerDragRef` — mutable ref tracking drag state (loc, cards, startX/Y, isDragging, dragOver)
- `suppressNextClickRef` — set `true` after a completed drag so the subsequent `click` event is ignored
- Global `pointermove` / `pointerup` listeners registered once in `useEffect([], [])`
  - `pointermove`: after 6px movement threshold, enters drag mode; calls `document.elementFromPoint` to find drop target via `data-drop-area` / `data-drop-pile` HTML attributes
  - `pointerup`: executes the move if over a valid target; sets suppress-click flag
- `commitFnRef` keeps a live reference to `commit` so the `useEffect` handlers avoid stale closure

---

## What Still Needs Doing

### `CardView.tsx`
Remove `draggable`, `onDragStart`, `onDragEnd` props. Add `onPointerDown` prop.

```tsx
interface CardViewProps {
  card: Card;
  isSelected: boolean;
  isDragSource: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
}
// Remove draggable attribute and drag event handlers from the div
```

### `TableauPile.tsx`
- Remove props: `onDragStart`, `onDragEnd`, `onDragOver`, `onDrop`
- Add prop: `onPointerDown: (loc: CardLocation, e: React.PointerEvent) => void`
- Add `data-drop-area="tableau"` and `data-drop-pile={pileIndex}` to both the empty-pile div and the pile container div
- Pass `onPointerDown={e => onPointerDown(loc, e)}` to each `CardView`
- Remove the `handleDragOver` / `handleDrop` internal handlers

### `FoundationPile.tsx`
- Same pattern as TableauPile
- `data-drop-area="foundation"` and `data-drop-pile={index}`
- Remove drag event props; add `onPointerDown`

### `WastePile.tsx`
- Remove props: `onDragStart`, `onDragEnd`
- Add prop: `onPointerDown: (loc: CardLocation, e: React.PointerEvent) => void`
- Pass to top card's `CardView`

### `KlondikeGame.tsx`
- Destructure `ghostPos`, `ghostCards`, `onPointerDown` from `useKlondike()`
- Remove: `onDragStart`, `onDragEnd`, `onDragOver`, `onDrop`, `dragOverTarget` (still needed for visual highlight), `makeFoundationDragOverHandler`, `makeTableauDragOverHandler`
- Pass `onPointerDown` to `WastePile`, `FoundationPile`, `TableauPile`
- Render ghost at the bottom of the board div (inside `.klondike-game`):

```tsx
import CardView from './CardView';

{ghostPos && ghostCards && ghostCards.length > 0 && (
  <div
    className="drag-ghost"
    style={{ left: ghostPos.x, top: ghostPos.y }}
  >
    {ghostCards.map((card, i) => (
      <CardView
        key={card.id}
        card={card}
        isSelected={false}
        isDragSource={false}
        style={{
          position: i === 0 ? 'relative' : 'absolute',
          top: i === 0 ? 0 : i * 22,
          left: 0,
          zIndex: i,
        }}
      />
    ))}
  </div>
)}
```

---

## Testing Checklist
1. iPhone Safari — 7 columns fit without horizontal scroll at both Normal and Large sizes
2. Tap a card → yellow highlight appears
3. Tap destination → card moves
4. Double-tap a card → auto-moves to foundation (no zoom triggered)
5. Press-and-drag a card → ghost follows finger → release over valid pile → card moves
6. Press-and-drag → release over invalid target → card snaps back, no move
7. Drag then release without moving far enough → treated as tap, selection works normally
8. Desktop mouse drag still works (pointer events handle both)
9. Stock pile tap works
10. Options dialog is accessible and usable on small screen
