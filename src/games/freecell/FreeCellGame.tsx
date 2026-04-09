import { useState, useRef, useCallback, useEffect } from 'react'
import CardView from '@/shared/components/CardView'
import { emptySlotStyle } from '@/shared/spriteSheet'
import { useFreecell } from './hooks/useFreecell'
import { CardLocation } from './types'
import {
  DRAG_START_THRESHOLD_SQ,
  DRAG_CLICK_SUPPRESS_RADIUS_SQ,
  DRAG_CLICK_SUPPRESS_TIMEOUT_MS,
  SUITS,
  SUIT_SYMBOL,
  RED_SUITS,
} from '@/shared/constants'
import './freecell.css'

interface FreeCellGameProps {
  onHome?: () => void
}

export default function FreeCellGame({ onHome }: FreeCellGameProps) {
  const {
    state,
    stats,
    previouslyBeaten,
    canUndo,
    onDrop,
    onDoubleClick,
    doUndo,
    startNewGame,
    startGameNumber,
    restartGame,
    resetStats,
    devCheatWin,
  } = useFreecell()

  function handleSelectGame() {
    const input = window.prompt('Enter game number (1–32000):')
    if (input === null) return
    const n = parseInt(input.trim(), 10)
    if (!Number.isInteger(n) || n < 1 || n > 32000) {
      alert('Invalid game number. Enter a whole number between 1 and 32000.')
      return
    }
    startGameNumber(n)
  }

  const [gameMenuOpen, setGameMenuOpen] = useState(false)
  const gameMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!gameMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (gameMenuRef.current && !gameMenuRef.current.contains(e.target as Node)) {
        setGameMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [gameMenuOpen])

  const pickGameMenu = (fn: () => void) => {
    setGameMenuOpen(false)
    fn()
  }

  const [dragSource, setDragSource] = useState<CardLocation | null>(null)
  const [peekLoc, setPeekLoc] = useState<{ pile: number; cardIndex: number } | null>(null)
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

    if (loc.area === 'tableau') {
      setPeekLoc({ pile: loc.pile, cardIndex: loc.cardIndex })
    }

    const handleMove = (me: PointerEvent) => {
      if (!dragging) {
        const dx = me.clientX - startX
        const dy = me.clientY - startY
        if (dx * dx + dy * dy < DRAG_START_THRESHOLD_SQ) return
        dragging = true
        setPeekLoc(null)
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
        setPeekLoc(null)
        return
      }

      sourceEl.style.opacity = ''
      if (dragPreviewRef.current) dragPreviewRef.current.style.display = 'none'
      setDragSource(null)
      setPeekLoc(null)

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
  }, [onDrop])

  if (!state || !state.tableau || state.seed == null) {
    return <div>Loading...</div>
  }

  const isWon = state.status === 'won'

  return (
    <div className="freecell-game game-container">
    <div className="freecell-board">
      {/* Drag preview — always in DOM so ref is always valid */}
      <div
        ref={dragPreviewRef}
        className="freecell-drag-preview"
        style={{ display: 'none' }}
      >
        {dragSource?.area === 'tableau' &&
          state.tableau[dragSource.pile]?.slice(dragSource.cardIndex).map((card) => (
            <div key={card.id} className="freecell-drag-preview-card">
              <CardView card={card} isDragSource={false} />
            </div>
          ))
        }
        {dragSource?.area === 'freecell' && state.freeCells[dragSource.cell] && (
          <CardView
            card={state.freeCells[dragSource.cell]!}
            isDragSource={false}
          />
        )}
      </div>

      <div className="menu-bar">
        <div className="menu-bar-left">
          <div className="menu-bar-inner" ref={gameMenuRef}>
            <button
              className={`menu-deal-button${gameMenuOpen ? ' menu-deal-button--open' : ''}`}
              onClick={() => setGameMenuOpen(o => !o)}
            >
              Game
            </button>
            {gameMenuOpen && (
              <div className="menu-dropdown">
                <button className="menu-option" onClick={() => pickGameMenu(startNewGame)}>New Game</button>
                <button className="menu-option" onClick={() => pickGameMenu(restartGame)}>Restart</button>
                <button className="menu-option" onClick={() => pickGameMenu(handleSelectGame)}>Select Game</button>
                <div className="menu-divider" />
                <button className="menu-option" onClick={() => pickGameMenu(() => {
                  if (window.confirm('Reset all FreeCell stats? This cannot be undone.')) resetStats()
                })}>Reset Stats</button>
                {onHome && <>
                  <div className="menu-divider" />
                  <button className="menu-option" onClick={() => pickGameMenu(onHome)}>All Games</button>
                </>}
              </div>
            )}
          </div>
          <button className="menu-deal-button" onClick={doUndo} disabled={!canUndo}>Undo</button>
          {devCheatWin && <button className="menu-deal-button menu-deal-button--dev" onClick={devCheatWin}>Dev: Win</button>}
        </div>
        <span className="menu-score">Game #{state.seed}</span>
      </div>

      <div className="freecell-top-row">
        {state.freeCells.map((card, idx) => (
          <div
            key={idx}
            data-drop-area="freecell"
            data-drop-pile={idx}
            className="freecell-cell"
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
        {previouslyBeaten ? (
          <div className="freecell-separator freecell-separator--won">
            <div className="freecell-medal">
              <span className="freecell-medal-star">★</span>
            </div>
          </div>
        ) : (
          <div className="freecell-separator">♣</div>
        )}
        {state.foundations.map((pile, idx) => (
          <div
            key={idx}
            data-drop-area="foundation"
            data-drop-pile={idx}
            className="freecell-foundation"
          >
            {pile.length > 0
              ? <CardView
                  card={pile[pile.length - 1]}
                  isDragSource={dragSource?.area === 'foundation' && dragSource.pile === idx}
                />
              : <span className={`freecell-suit-hint${RED_SUITS.includes(SUITS[idx]) ? ' freecell-suit-hint--red' : ''}`}>
                  {SUIT_SYMBOL[SUITS[idx]]}
                </span>
            }
          </div>
        ))}
      </div>

      {isWon && (
        <div className="freecell-status">You Won!</div>
      )}

      <div className="freecell-tableau">
        {state.tableau.map((pile, pileIdx) => (
          <div key={pileIdx} data-drop-area="tableau" data-drop-pile={pileIdx} className="freecell-column">
            {pile.length === 0
              ? <div className="freecell-empty-pile" />
              : pile.map((card, cardIdx) => {
                  const location: CardLocation = { area: 'tableau', pile: pileIdx, cardIndex: cardIdx }
                  const isPeeked = peekLoc?.pile === pileIdx && peekLoc?.cardIndex === cardIdx

                  const isTopCard = cardIdx === pile.length - 1
                  return (
                    <div
                      key={card.id}
                      className={`freecell-column-card${isPeeked ? ' freecell-column-card--peeked' : ''}`}
                      onDoubleClick={isTopCard ? () => onDoubleClick(location) : undefined}
                    >
                      <CardView
                        card={card}
                        isDragSource={dragSource?.area === 'tableau' && dragSource.pile === pileIdx && cardIdx >= dragSource.cardIndex}
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
        <span>
          {stats.gameBests[state.seed] !== undefined && (
            <span className="freecell-stats-best">Previous Best: {stats.gameBests[state.seed]} | </span>
          )}
          Moves: {state.moves}
        </span>
        {stats.gamesPlayed > 0 && (
          <span>Win%: {Math.round((stats.gamesWon / stats.gamesPlayed) * 100)}%</span>
        )}
        <span>Streak: {stats.currentStreak}/{stats.bestStreak}</span>
      </div>
    </div>
    </div>
  )
}
