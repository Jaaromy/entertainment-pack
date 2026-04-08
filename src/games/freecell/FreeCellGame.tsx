import { useState, useRef, useCallback } from 'react'
import CardView from '@/shared/components/CardView'
import { emptySlotStyle } from '@/shared/spriteSheet'
import { useFreecell } from './hooks/useFreecell'
import { CardLocation } from './types'
import {
  DRAG_START_THRESHOLD_SQ,
  DRAG_CLICK_SUPPRESS_RADIUS_SQ,
  DRAG_CLICK_SUPPRESS_TIMEOUT_MS,
} from '@/shared/constants'
import './freecell.css'

interface FreeCellGameProps {
  onHome?: () => void
}

export default function FreeCellGame({ onHome }: FreeCellGameProps) {
  const {
    state,
    canUndo,
    selection,
    onCardClick,
    onEmptyClick,
    onDrop,
    doUndo,
    startNewGame,
  } = useFreecell()

  const [dragSource, setDragSource] = useState<CardLocation | null>(null)
  const dragPreviewRef = useRef<HTMLDivElement>(null)

  // All hooks must be called before any early return
  const handleCardPointerDown = useCallback((
    loc: CardLocation,
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return

    const sourceEl = e.currentTarget
    const startX = e.clientX
    const startY = e.clientY
    const offsetX = e.nativeEvent.offsetX
    const offsetY = e.nativeEvent.offsetY
    const { width: CARD_W, height: CARD_H } = sourceEl.getBoundingClientRect()
    let dragging = false

    const handleMove = (me: PointerEvent) => {
      if (!dragging) {
        const dx = me.clientX - startX
        const dy = me.clientY - startY
        if (dx * dx + dy * dy < DRAG_START_THRESHOLD_SQ) return
        dragging = true
        sourceEl.style.opacity = '0'
        setDragSource(loc)
      }
      const el = dragPreviewRef.current
      if (el) {
        el.style.transform = `translate(${me.clientX - offsetX}px, ${me.clientY - offsetY}px)`
        el.style.display = 'block'
      }
    }

    const handleUp = (ue: PointerEvent) => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)

      if (!dragging) {
        sourceEl.style.opacity = ''
        onCardClick(loc)
        return
      }

      sourceEl.style.opacity = ''
      if (dragPreviewRef.current) dragPreviewRef.current.style.display = 'none'
      setDragSource(null)

      const releaseX = ue.clientX
      const releaseY = ue.clientY
      const suppressDragClick = (ce: MouseEvent) => {
        document.removeEventListener('click', suppressDragClick, { capture: true })
        const dx = ce.clientX - releaseX
        const dy = ce.clientY - releaseY
        if (dx * dx + dy * dy < DRAG_CLICK_SUPPRESS_RADIUS_SQ) ce.stopImmediatePropagation()
      }
      document.addEventListener('click', suppressDragClick, { capture: true })
      setTimeout(() => document.removeEventListener('click', suppressDragClick, { capture: true }), DRAG_CLICK_SUPPRESS_TIMEOUT_MS)

      // Find best-overlap drop target — same approach as Klondike
      const cardLeft   = ue.clientX - offsetX
      const cardTop    = ue.clientY - offsetY
      const cardRight  = cardLeft + CARD_W
      const cardBottom = cardTop  + CARD_H

      let bestArea: 'tableau' | 'freecell' | 'foundation' | null = null
      let bestPile = -1
      let bestOverlap = 0

      for (const el of document.querySelectorAll<HTMLElement>('[data-drop-area]')) {
        const rect = el.getBoundingClientRect()
        const overlapX = Math.min(cardRight, rect.right)  - Math.max(cardLeft, rect.left)
        const overlapY = Math.min(cardBottom, rect.bottom) - Math.max(cardTop,  rect.top)
        if (overlapX > 0 && overlapY > 0) {
          const overlap = overlapX * overlapY
          if (overlap > bestOverlap) {
            bestOverlap = overlap
            bestArea = el.dataset.dropArea as 'tableau' | 'freecell' | 'foundation'
            bestPile = parseInt(el.dataset.dropPile!)
          }
        }
      }

      if (bestArea !== null) onDrop(loc, bestArea, bestPile)
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
  }, [onCardClick, onEmptyClick, onDrop])

  if (!state || !state.tableau) {
    return <div>Loading...</div>
  }

  const isWon = state.status === 'won'

  return (
    <div className="freecell-board">
      {/* Drag preview — always in DOM so ref is always valid */}
      <div
        ref={dragPreviewRef}
        className="freecell-drag-preview"
        style={{ display: 'none' }}
      >
        {dragSource?.area === 'tableau' && state.tableau[dragSource.pile]?.[dragSource.cardIndex] && (
          <CardView
            card={state.tableau[dragSource.pile][dragSource.cardIndex]}
            isDragSource={false}
          />
        )}
        {dragSource?.area === 'freecell' && state.freeCells[dragSource.cell] && (
          <CardView
            card={state.freeCells[dragSource.cell]!}
            isDragSource={false}
          />
        )}
      </div>

      <div className="menu-bar">
        <div className="menu-bar-left">
          <button className="menu-deal-button" onClick={doUndo} disabled={!canUndo}>Undo</button>
          <button className="menu-deal-button" onClick={() => startNewGame(Date.now())}>New Game</button>
          {onHome && <button className="menu-deal-button" onClick={onHome}>All Games</button>}
        </div>
        <span className="menu-score">FreeCell</span>
      </div>

      <div className="freecell-top-row">
        <div>
          <div className="freecell-cells-label">Free Cells</div>
          <div className="freecell-cells">
            {state.freeCells.map((card, idx) => (
              <div
                key={idx}
                data-drop-area="freecell"
                data-drop-pile={idx}
                className={`freecell-cell${selection?.location.area === 'freecell' && selection.location.cell === idx ? ' selected' : ''}`}
                onClick={() => onEmptyClick('freecell', idx)}
              >
                {card
                  ? <CardView
                      card={card}
                      isDragSource={dragSource?.area === 'freecell' && dragSource.cell === idx}
                      onPointerDown={(e) => handleCardPointerDown({ area: 'freecell', cell: idx }, e)}
                    />
                  : <div style={emptySlotStyle} />
                }
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="freecell-foundations-label">Foundations</div>
          <div className="freecell-foundations">
            {state.foundations.map((pile, idx) => (
              <div
                key={idx}
                data-drop-area="foundation"
                data-drop-pile={idx}
                className={`freecell-foundation${selection?.location.area === 'foundation' && selection.location.pile === idx ? ' selected' : ''}`}
                onClick={() => onEmptyClick('foundation', idx)}
              >
                {pile.length > 0
                  ? <CardView
                      card={pile[pile.length - 1]}
                      isDragSource={dragSource?.area === 'foundation' && dragSource.pile === idx}
                    />
                  : <div style={emptySlotStyle} />
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {isWon && (
        <div className="freecell-status">You Won!</div>
      )}

      <div className="freecell-tableau">
        {state.tableau.map((pile, pileIdx) => (
          <div key={pileIdx} data-drop-area="tableau" data-drop-pile={pileIdx} className="freecell-column">
            {pile.length === 0
              ? <div className="freecell-empty-pile" onClick={() => onEmptyClick('tableau', pileIdx)} />
              : pile.map((card, cardIdx) => {
                  const location: CardLocation = { area: 'tableau', pile: pileIdx, cardIndex: cardIdx }
                  const isSelected =
                    selection?.location.area === 'tableau' &&
                    selection.location.pile === pileIdx &&
                    selection.location.cardIndex === cardIdx

                  return (
                    <div key={card.id} className={`freecell-column-card${isSelected ? ' selected' : ''}`}>
                      <CardView
                        card={card}
                        isDragSource={dragSource?.area === 'tableau' && dragSource.pile === pileIdx && dragSource.cardIndex === cardIdx}
                        onPointerDown={(e) => handleCardPointerDown(location, e)}
                      />
                    </div>
                  )
                })
            }
          </div>
        ))}
      </div>

      <div className="freecell-stats">
        Moves: {state.moves}
      </div>
    </div>
  )
}
