import { useState, useEffect } from "react";
import * as api from "../../lib/api";
import { StudySession, Deck, CardMode } from "../../lib/types";

export default function StudySessionPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [session, setSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [newDeckName, setNewDeckName] = useState("");
  const [mode, setMode] = useState<CardMode>("word");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [leadIn, setLeadIn] = useState(0.5);
  const [tailOut, setTailOut] = useState(0.5);
  const [autoSeek, setAutoSeek] = useState(true);
  const [translationEnabled, setTranslationEnabled] = useState(true);

  useEffect(() => {
    loadDecks();
    loadSession();
  }, []);

  async function loadDecks() {
    try {
      // Try loading from local storage first (offline mode)
      const localResult = await chrome.storage.local.get(['localDecks']);
      if (localResult.localDecks && localResult.localDecks.length > 0) {
        setDecks(localResult.localDecks);
        if (localResult.localDecks.length > 0 && !selectedDeckId) {
          setSelectedDeckId(localResult.localDecks[0].id);
        }
        setLoading(false);
        return;
      }

      // Try loading from backend API
      try {
        const data = await api.getDecks();
        setDecks(data);
        if (data.length > 0 && !selectedDeckId) {
          setSelectedDeckId(data[0].id);
        }
      } catch (apiError) {
        console.log("Backend not available, using offline mode");
        // Create a default deck for offline use
        const defaultDeck = {
          id: `local-${Date.now()}`,
          name: "My Deck",
          language: "zh",
          userId: "local",
          createdAt: new Date().toISOString(),
        };
        await chrome.storage.local.set({ localDecks: [defaultDeck] });
        setDecks([defaultDeck]);
        setSelectedDeckId(defaultDeck.id);
      }
    } catch (error) {
      console.error("Failed to load decks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSession() {
    const result = await chrome.storage.local.get(["studySession"]);
    setSession(result.studySession || null);
  }

  async function handleCreateDeck() {
    if (!newDeckName.trim()) return;

    try {
      // Create a local deck without backend
      const deck = {
        id: `local-${Date.now()}`,
        name: newDeckName,
        language: "zh",
        userId: "local",
        createdAt: new Date().toISOString(),
      };
      
      // Store in chrome.storage
      const newDecks = [...decks, deck];
      await chrome.storage.local.set({ localDecks: newDecks });
      
      setDecks(newDecks);
      setSelectedDeckId(deck.id);
      setNewDeckName("");
    } catch (error) {
      console.error('Failed to create deck:', error);
      alert("Failed to create deck");
    }
  }

  async function handleStartSession() {
    if (!selectedDeckId) return;

    const deck = decks.find((d) => d.id === selectedDeckId);
    if (!deck) return;

    const newSession: StudySession = {
      deckId: selectedDeckId,
      deckName: deck.name,
      mode,
      audioEnabled,
      leadIn,
      tailOut,
      autoSeek,
      translationEnabled,
    };

    await chrome.storage.local.set({ studySession: newSession });
    setSession(newSession);
  }

  async function handleStopSession() {
    await chrome.storage.local.remove("studySession");
    setSession(null);
  }

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (session) {
    return (
      <div className="container">
        <div className="card">
          <h3 className="font-bold mb-2">Active Session</h3>
          <p className="text-sm text-gray mb-2">Deck: {session.deckName}</p>
          <p className="text-sm text-gray mb-2">Mode: {session.mode}</p>
          <p className="text-sm text-gray mb-4">
            Audio: {session.audioEnabled ? "Enabled" : "Disabled"}
          </p>
          <button className="button" onClick={handleStopSession}>
            Stop Session
          </button>
        </div>

        <div className="card">
          <h4 className="font-bold mb-2">Instructions</h4>
          <ol className="text-sm" style={{ paddingLeft: "20px" }}>
            <li>Navigate to a YouTube video with Chinese captions</li>
            <li>Enable captions on the video</li>
            <li>Click on any word in the caption overlay to create a card</li>
            <li>Cards will be automatically synced to your backend</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 className="font-bold mb-4" style={{ fontSize: "18px" }}>
        Start Study Session
      </h2>

      <div className="card">
        <label className="label">Select Deck</label>
        <select
          className="select"
          value={selectedDeckId}
          onChange={(e) => setSelectedDeckId(e.target.value)}
        >
          <option value="">Select a deck...</option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name}
            </option>
          ))}
        </select>

        <div className="mt-4">
          <label className="label">Create New Deck</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input"
              placeholder="Deck name"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
            />
            <button className="button" onClick={handleCreateDeck}>
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <label className="label">Mode</label>
        <select
          className="select"
          value={mode}
          onChange={(e) => setMode(e.target.value as CardMode)}
        >
          <option value="word">Word</option>
          <option value="sentence">Sentence</option>
          <option value="cloze">Cloze</option>
        </select>
      </div>

      <div className="card">
        <h3 className="font-bold mb-3">Audio Clip Settings</h3>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            className="checkbox"
            checked={audioEnabled}
            onChange={(e) => setAudioEnabled(e.target.checked)}
          />
          <label className="text-sm">Enable audio capture</label>
        </div>

        <div className="mb-3">
          <label className="label">Lead-in (seconds)</label>
          <input
            type="number"
            className="input"
            value={leadIn}
            onChange={(e) => setLeadIn(parseFloat(e.target.value))}
            step="0.1"
            min="0"
            max="5"
          />
        </div>

        <div className="mb-3">
          <label className="label">Tail-out (seconds)</label>
          <input
            type="number"
            className="input"
            value={tailOut}
            onChange={(e) => setTailOut(parseFloat(e.target.value))}
            step="0.1"
            min="0"
            max="5"
          />
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            className="checkbox"
            checked={autoSeek}
            onChange={(e) => setAutoSeek(e.target.checked)}
          />
          <label className="text-sm">Auto-seek to clip start</label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            className="checkbox"
            checked={translationEnabled}
            onChange={(e) => setTranslationEnabled(e.target.checked)}
          />
          <label className="text-sm">Enable translation</label>
        </div>
      </div>

      <button
        className="button"
        onClick={handleStartSession}
        disabled={!selectedDeckId}
        style={{ width: "100%" }}
      >
        Start Study Session
      </button>
    </div>
  );
}
