import { useState } from 'react'
import { useHashRoute } from './router/useHashRoute'
import LandingPage from './pages/LandingPage'
import KlondikeGame from './games/klondike/components/KlondikeGame'
import CardGallery from './games/klondike/components/CardGallery'
import StatsScreen from './games/klondike/components/StatsScreen'
import BlackjackGame from './games/blackjack/components/BlackjackGame'
import FreeCellGame from './games/freecell/FreeCellGame'
import './games/klondike/klondike.css'
import './games/freecell/freecell.css'

type KlondikeView = 'game' | 'stats' | 'gallery'

export default function App() {
  const { route, navigate } = useHashRoute()
  const [klondikeView, setKlondikeView] = useState<KlondikeView>('game')

  if (route === '/klondike') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#007800' }}>
        {klondikeView === 'game' && (
          <KlondikeGame
            onNavigate={(v) => setKlondikeView(v)}
            onHome={() => { setKlondikeView('game'); navigate('/'); }}
          />
        )}
        {klondikeView === 'stats' && <StatsScreen onBack={() => setKlondikeView('game')} />}
        {klondikeView === 'gallery' && <CardGallery onBack={() => setKlondikeView('game')} />}
      </div>
    )
  }

  if (route === '/blackjack') {
    return <BlackjackGame onHome={() => navigate('/')} />
  }

  if (route === '/freecell') {
    return <FreeCellGame onHome={() => navigate('/')} />
  }

  return <LandingPage onSelect={navigate} />
}
