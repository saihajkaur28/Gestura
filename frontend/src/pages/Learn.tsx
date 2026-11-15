import { useState } from 'react'
import { BookOpen, CheckCircle2, ChevronRight, Gauge, MessageSquare, Play, Sparkles } from 'lucide-react'
import ASLVideoPlayer from '../components/ASLVideoPlayer'
import type { ASLVideoItem } from '../data/learnVocabulary'
import { ALPHABET_ITEMS, COMMON_PHRASES, COMMON_WORDS } from '../data/learnVocabulary'

type LearnTab = 'alphabet' | 'words' | 'phrases'

export default function Learn() {
  const [activeTab, setActiveTab] = useState<LearnTab>('alphabet')
  const [selectedItem, setSelectedItem] = useState<ASLVideoItem | null>(null)

  // When a video is selected, render the dedicated ASLVideoPlayer view with interactive 3-section layout
  if (selectedItem) {
    return (
      <ASLVideoPlayer
        item={selectedItem}
        onSelectItem={(newItem) => setSelectedItem(newItem)}
        onBack={() => setSelectedItem(null)}
        alphabetItems={ALPHABET_ITEMS}
        commonWords={COMMON_WORDS}
        commonPhrases={COMMON_PHRASES}
      />
    )
  }

  return (
    <div className="learn-page">
      {/* Page Header */}
      <div className="learn-header">
        <div className="learn-header-badge">
          <Sparkles size={16} strokeWidth={2.2} />
          <span>Interactive Sign Language Curriculum</span>
        </div>
        <h1 className="learn-title">Learn American Sign Language</h1>
        <p className="learn-description">
          Master authentic manual alphabet fingerspelling, core verified everyday vocabulary, and essential conversational phrases with synchronized video demonstrations, right-side alphabet navigation, and multi-speed controls.
        </p>

        {/* Feature Highlights Pills */}
        <div className="learn-highlights-row">
          <div className="learn-highlight-pill">
            <CheckCircle2 size={16} className="text-sage" />
            <span>All 26 A–Z Alphabet Letters</span>
          </div>
          <div className="learn-highlight-pill">
            <CheckCircle2 size={16} className="text-sage" />
            <span>12 Core Everyday Words</span>
          </div>
          <div className="learn-highlight-pill">
            <CheckCircle2 size={16} className="text-sage" />
            <span>10 Conversational Phrases</span>
          </div>
          <div className="learn-highlight-pill">
            <Gauge size={16} className="text-sage" />
            <span>0.5x – 1.5x Speed Control</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="learn-tabs" role="tablist" aria-label="Learning categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'alphabet'}
          className={`learn-tab-btn ${activeTab === 'alphabet' ? 'active' : ''}`}
          onClick={() => setActiveTab('alphabet')}
        >
          <BookOpen size={18} strokeWidth={2.2} />
          <span>ASL Alphabet (26 Letters)</span>
          <span className="learn-tab-count">26</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'words'}
          className={`learn-tab-btn ${activeTab === 'words' ? 'active' : ''}`}
          onClick={() => setActiveTab('words')}
        >
          <Sparkles size={18} strokeWidth={2.2} />
          <span>Common Words</span>
          <span className="learn-tab-count">{COMMON_WORDS.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'phrases'}
          className={`learn-tab-btn ${activeTab === 'phrases' ? 'active' : ''}`}
          onClick={() => setActiveTab('phrases')}
        >
          <MessageSquare size={18} strokeWidth={2.2} />
          <span>Common Phrases</span>
          <span className="learn-tab-count">{COMMON_PHRASES.length}</span>
        </button>
      </div>

      {/* Content Sections */}
      <div className="learn-content-container">
        {/* Tab 1: Alphabet Grid (A through Z) */}
        {activeTab === 'alphabet' && (
          <div className="learn-section" role="tabpanel" aria-label="ASL Alphabet">
            <div className="learn-section-intro">
              <div className="learn-section-meta">
                <h2>Manual Alphabet (A–Z)</h2>
                <p>Click any letter to open the integrated learning workspace with right-side A–Z quick navigation and 0.5x–1.5x speed controls.</p>
              </div>
              <span className="badge badge-ok">All 26 Letters Verified</span>
            </div>

            <div className="alphabet-grid" role="grid" aria-label="Alphabet Cards">
              {ALPHABET_ITEMS.map((letterItem) => (
                <button
                  key={letterItem.id}
                  type="button"
                  className="alphabet-card"
                  onClick={() => setSelectedItem(letterItem)}
                  aria-label={`Learn sign for letter ${letterItem.title}`}
                >
                  <div className="alphabet-card-head">
                    <span className="alphabet-letter">{letterItem.title}</span>
                    <span className="alphabet-play-badge" aria-hidden="true">
                      <Play size={14} fill="currentColor" />
                    </span>
                  </div>
                  <div className="alphabet-card-body">
                    <span className="alphabet-label">Letter {letterItem.title}</span>
                    <span className="alphabet-sub">Fingerspelling</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Common Words */}
        {activeTab === 'words' && (
          <div className="learn-section" role="tabpanel" aria-label="Common Words">
            <div className="learn-section-intro">
              <div className="learn-section-meta">
                <h2>Common ASL Words</h2>
                <p>High-frequency everyday vocabulary words with authentic sign demonstration videos from Yale ASL Signbank.</p>
              </div>
              <span className="badge badge-ok">{COMMON_WORDS.filter((w) => w.status === 'available').length} Verified Available</span>
            </div>

            <div className="vocabulary-grid">
              {COMMON_WORDS.map((wordItem) => (
                <div
                  key={wordItem.id}
                  className="card vocabulary-card"
                  onClick={() => setSelectedItem(wordItem)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedItem(wordItem)
                    }
                  }}
                  aria-label={`Learn sign for word ${wordItem.title}`}
                >
                  <div className="vocab-card-header">
                    <span className="badge badge-category">{wordItem.category}</span>
                    {wordItem.status === 'available' ? (
                      <span className="vocab-play-icon" aria-hidden="true">
                        <Play size={16} fill="currentColor" />
                      </span>
                    ) : (
                      <span className="badge badge-loading">In Pipeline</span>
                    )}
                  </div>

                  <h3 className="vocab-title">{wordItem.title}</h3>
                  {wordItem.subtitle && <span className="vocab-subtitle">{wordItem.subtitle}</span>}
                  
                  {wordItem.description && (
                    <p className="vocab-description">{wordItem.description}</p>
                  )}

                  <div className="vocab-footer">
                    <span className="vocab-handshape-pill">{wordItem.handshape}</span>
                    <span className="vocab-view-link">
                      <span>{wordItem.status === 'available' ? 'Watch & Learn' : 'View Details'}</span>
                      <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Common Phrases */}
        {activeTab === 'phrases' && (
          <div className="learn-section" role="tabpanel" aria-label="Common Phrases">
            <div className="learn-section-intro">
              <div className="learn-section-meta">
                <h2>Everyday ASL Phrases</h2>
                <p>Authentic conversational phrase videos representing essential questions, introductions, greetings, and emergency requests.</p>
              </div>
              <span className="badge badge-ok">{COMMON_PHRASES.filter((p) => p.status === 'available').length} Verified Available</span>
            </div>

            <div className="sentences-grid">
              {COMMON_PHRASES.map((phraseItem) => (
                <div
                  key={phraseItem.id}
                  className="card sentence-card"
                  onClick={() => setSelectedItem(phraseItem)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedItem(phraseItem)
                    }
                  }}
                  aria-label={`Learn sign for phrase ${phraseItem.title}`}
                >
                  <div className="sentence-card-top">
                    <span className="badge badge-sentence">{phraseItem.category}</span>
                    {phraseItem.status === 'available' ? (
                      <span className="sentence-play-circle" aria-hidden="true">
                        <Play size={18} fill="currentColor" />
                      </span>
                    ) : (
                      <span className="badge badge-loading">In Pipeline</span>
                    )}
                  </div>

                  <h3 className="sentence-title">{phraseItem.title}</h3>
                  {phraseItem.subtitle && <span className="sentence-subtitle">{phraseItem.subtitle}</span>}

                  {phraseItem.description && (
                    <p className="sentence-desc">{phraseItem.description}</p>
                  )}

                  <div className="sentence-bottom-row">
                    <span className="sentence-tag">{phraseItem.handshape}</span>
                    <span className="sentence-cta">
                      <span>{phraseItem.status === 'available' ? 'Practice Sign' : 'View Details'}</span>
                      <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

