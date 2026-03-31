import type { Card } from '../types';
import { SUITS, RANKS, SUIT_SYMBOL } from '../constants';
import CardView from './CardView';
import '../klondike.css';

function makeCard(rank: number, suit: string, faceUp: boolean): Card {
  return {
    id: `${rank}${suit[0].toUpperCase()}`,
    rank: rank as Card['rank'],
    suit: suit as Card['suit'],
    faceUp,
  };
}

export default function CardGallery() {
  return (
    <div style={{ padding: '24px 32px', userSelect: 'none' }}>
      <h1 style={{ color: '#fff', fontFamily: 'sans-serif', marginBottom: 8, fontSize: '1.4rem' }}>
        Card Gallery
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', fontSize: '0.85rem', marginBottom: 24 }}>
        All 52 cards + face-down back
      </p>

      {/* Face-down back */}
      <Section label="Card Back">
        <CardSlot card={makeCard(1, 'spades', false)} />
      </Section>

      {/* Each suit */}
      {SUITS.map(suit => (
        <Section key={suit} label={`${SUIT_SYMBOL[suit]} ${suit.charAt(0).toUpperCase() + suit.slice(1)}`}>
          {RANKS.map(rank => (
            <CardSlot key={rank} card={makeCard(rank, suit, true)} />
          ))}
        </Section>
      ))}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'sans-serif',
        fontSize: '0.8rem',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {children}
      </div>
    </div>
  );
}

function CardSlot({ card }: { card: Card }) {
  return (
    <div style={{ position: 'relative', width: 72, height: 100, flexShrink: 0 }}>
      <CardView
        card={card}
        isSelected={false}
        isDragSource={false}
        draggable={false}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
    </div>
  );
}
