import { useState } from 'react'
import { BookOpen, CheckCircle2, ChevronRight, Gauge, MessageSquare, Play, Sparkles } from 'lucide-react'
import ASLVideoPlayer from '../components/ASLVideoPlayer'
import type { ASLVideoItem } from '../components/ASLVideoPlayer'
import { ALPHABET_ITEMS, COMMON_SENTENCES, COMMON_WORDS } from '../data/learnVocabulary'

type LearnTab = 'alphabet' | 'words' | 'sentences'

export default function Learn() {
  const [activeTab, setActiveTab] = useState<LearnTab>('alphabet')
  const [selectedItem, setSelectedItem] = useState<ASLVideoItem | null>(null)

  // When a video is selected, render the dedicated ASLVideoPlayer view
  if (selectedItem) {
    return <ASLVideoPlayer item={selectedItem} onBack={() => setSelectedItem(null)} />
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
          Master authentic manual alphabet fingerspelling, core verified everyday vocabulary, and essential complete sentences with synchronized video demonstrations and adjustable playback speed.
        </p>

        {/* Feature Highlights Pills */}
        <div className="learn-highlights-row">
          <div className="learn-highlight-pill">
            <CheckCircle2 size={16} className="text-sage" />
            <span>All 26 A–Z Alphabet Letters</span>
          </div>
          <div className="learn-highlight-pill">
            <CheckCircle2 size={16} className="text-sage" />
            <span>5 Verified Core Words</span>
          </div>
          <div className="learn-highlight-pill">
            <CheckCircle2 size={16} className="text-sage" />
            <span>5 Verified Complete Sentences</span>
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
          <span className="learn-tab-count">5</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'sentences'}
          className={`learn-tab-btn ${activeTab === 'sentences' ? 'active' : ''}`}
          onClick={() => setActiveTab('sentences')}
        >
          <MessageSquare size={18} strokeWidth={2.2} />
          <span>Common Sentences</span>
          <span className="learn-tab-count">5</span>
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
                <p>Click any letter to open its dedicated authentic sign video demonstration with 0.5x–1.5x slow-motion controls.</p>
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

        {/* Tab 2: Common Words (5 Verified Signs) */}
        {activeTab === 'words' && (
          <div className="learn-section" role="tabpanel" aria-label="Common Words">
            <div className="learn-section-intro">
              <div className="learn-section-meta">
                <h2>Common ASL Words</h2>
                <p>Five high-frequency everyday vocabulary words with authentic sign demonstration videos from Yale ASL Signbank.</p>
              </div>
              <span className="badge badge-ok">5 Verified Videos</span>
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
                    <span className="vocab-play-icon" aria-hidden="true">
                      <Play size={16} fill="currentColor" />
                    </span>
                  </div>

                  <h3 className="vocab-title">{wordItem.title}</h3>
                  {wordItem.subtitle && <span className="vocab-subtitle">{wordItem.subtitle}</span>}
                  
                  {wordItem.description && (
                    <p className="vocab-description">{wordItem.description}</p>
                  )}

                  <div className="vocab-footer">
                    <span className="vocab-handshape-pill">{wordItem.handshape}</span>
                    <span className="vocab-view-link">
                      <span>Watch & Learn</span>
                      <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Common Sentences (5 Verified Complete Phrases) */}
        {activeTab === 'sentences' && (
          <div className="learn-section" role="tabpanel" aria-label="Common Sentences">
            <div className="learn-section-intro">
              <div className="learn-section-meta">
                <h2>Everyday ASL Sentences</h2>
                <p>Five complete, authentic conversational sentence videos representing essential questions, expressions, and emergency statements.</p>
              </div>
              <span className="badge badge-ok">5 Authentic Complete Sentences</span>
            </div>

            <div className="sentences-grid">
              {COMMON_SENTENCES.map((sentenceItem) => (
                <div
                  key={sentenceItem.id}
                  className="card sentence-card"
                  onClick={() => setSelectedItem(sentenceItem)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedItem(sentenceItem)
                    }
                  }}
                  aria-label={`Learn sign for sentence ${sentenceItem.title}`}
                >
                  <div className="sentence-card-top">
                    <span className="badge badge-sentence">Full Sentence</span>
                    <span className="sentence-play-circle" aria-hidden="true">
                      <Play size={18} fill="currentColor" />
                    </span>
                  </div>

                  <h3 className="sentence-title">{sentenceItem.title}</h3>
                  {sentenceItem.subtitle && <span className="sentence-subtitle">{sentenceItem.subtitle}</span>}

                  {sentenceItem.description && (
                    <p className="sentence-desc">{sentenceItem.description}</p>
                  )}

                  <div className="sentence-bottom-row">
                    <span className="sentence-tag">{sentenceItem.handshape}</span>
                    <span className="sentence-cta">
                      <span>Practice Sign</span>
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
