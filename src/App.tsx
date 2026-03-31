import { useState } from 'react'
import KlondikeGame from './games/klondike/components/KlondikeGame'
import CardGallery from './games/klondike/components/CardGallery'

export default function App() {
  const [view, setView] = useState<'game' | 'gallery'>('game')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#007800' }}>
      <div style={{
        display: 'flex', gap: 6, padding: '8px 12px',
        background: 'rgba(0,0,0,0.25)',
      }}>
        <button onClick={() => setView('game')} style={tabStyle(view === 'game')}>
          Game
        </button>
        <button onClick={() => setView('gallery')} style={tabStyle(view === 'gallery')}>
          Card Gallery
        </button>
      </div>
      {view === 'game' ? <KlondikeGame /> : <CardGallery />}
    </div>
  )
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
    color: active ? '#007800' : '#fff',
    border: '1px solid rgba(255,255,255,0.5)',
    padding: '4px 12px',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'sans-serif',
  }
}
