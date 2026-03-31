import { useState } from 'react'
import KlondikeGame from './games/klondike/components/KlondikeGame'
import CardGallery from './games/klondike/components/CardGallery'
import StatsScreen from './games/klondike/components/StatsScreen'
import './games/klondike/klondike.css'

type View = 'game' | 'stats' | 'gallery'

export default function App() {
  const [view, setView] = useState<View>('game')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#007800' }}>
      {view === 'game' && <KlondikeGame onNavigate={setView} />}
      {view === 'stats' && <StatsScreen onBack={() => setView('game')} />}
      {view === 'gallery' && <CardGallery onBack={() => setView('game')} />}
    </div>
  )
}
