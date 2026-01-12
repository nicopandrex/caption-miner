import { useState, useEffect } from "react";
import * as api from "../../lib/api";
import { Card } from "../../lib/types";

export default function CardsList() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    try {
      // First try to load from local storage
      const localData = await chrome.storage.local.get(['cards']);
      if (localData.cards && localData.cards.length > 0) {
        console.log('Loading cards from local storage:', localData.cards);
        setCards(localData.cards);
        setLoading(false);
        return;
      }

      // Fall back to API if no local cards
      const data = await api.getCards(undefined, 50);
      setCards(data);
    } catch (error) {
      console.error("Failed to load cards:", error);
      
      // If API fails, try local storage as fallback
      try {
        const localData = await chrome.storage.local.get(['cards']);
        if (localData.cards) {
          setCards(localData.cards);
        }
      } catch (storageError) {
        console.error("Failed to load from storage:", storageError);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this card?")) return;

    try {
      // Try API first
      await api.deleteCard(id);
      setCards(cards.filter((c) => c.id !== id));
    } catch (error) {
      // If API fails, delete from local storage
      console.warn("API delete failed, deleting locally:", error);
      const updatedCards = cards.filter((c) => c.id !== id);
      setCards(updatedCards);
      await chrome.storage.local.set({ cards: updatedCards });
    }
  }

  async function handleSave(card: Card) {
    try {
      // Try API first
      await api.updateCard(card.id, {
        targetWord: card.targetWord,
        sentence: card.sentence,
        sentenceCloze: card.sentenceCloze,
        pinyin: card.pinyin,
        definition: card.definition,
        translation: card.translation,
        tags: card.tags,
      });
      setCards(cards.map((c) => (c.id === card.id ? card : c)));
      setEditingCard(null);
    } catch (error) {
      // If API fails, save to local storage
      console.warn("API save failed, saving locally:", error);
      const updatedCards = cards.map((c) => (c.id === card.id ? card : c));
      setCards(updatedCards);
      await chrome.storage.local.set({ cards: updatedCards });
      setEditingCard(null);
    }
  }

  function playAudio(audioUrl: string) {
    const audio = new Audio(audioUrl);
    audio.play();
  }

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (cards.length === 0) {
    return (
      <div className="container">
        <p className="text-sm text-gray">
          No cards yet. Start a study session and click on words to create
          cards.
        </p>
      </div>
    );
  }

  if (editingCard) {
    return (
      <div className="container">
        <h2 className="font-bold mb-4" style={{ fontSize: "18px" }}>
          Edit Card
        </h2>

        <div className="card">
          <div className="mb-3">
            <label className="label">Target Word</label>
            <input
              type="text"
              className="input"
              value={editingCard.targetWord}
              onChange={(e) =>
                setEditingCard({ ...editingCard, targetWord: e.target.value })
              }
            />
          </div>

          <div className="mb-3">
            <label className="label">Sentence</label>
            <textarea
              className="input"
              rows={3}
              value={editingCard.sentence}
              onChange={(e) =>
                setEditingCard({ ...editingCard, sentence: e.target.value })
              }
            />
          </div>

          <div className="mb-3">
            <label className="label">Pinyin</label>
            <input
              type="text"
              className="input"
              value={editingCard.pinyin}
              onChange={(e) =>
                setEditingCard({ ...editingCard, pinyin: e.target.value })
              }
            />
          </div>

          <div className="mb-3">
            <label className="label">Definition</label>
            <textarea
              className="input"
              rows={2}
              value={editingCard.definition}
              onChange={(e) =>
                setEditingCard({ ...editingCard, definition: e.target.value })
              }
            />
          </div>

          <div className="mb-3">
            <label className="label">Translation</label>
            <textarea
              className="input"
              rows={2}
              value={editingCard.translation}
              onChange={(e) =>
                setEditingCard({ ...editingCard, translation: e.target.value })
              }
            />
          </div>

          <div className="flex gap-2">
            <button className="button" onClick={() => handleSave(editingCard)}>
              Save
            </button>
            <button
              className="button button-secondary"
              onClick={() => setEditingCard(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 className="font-bold mb-4" style={{ fontSize: "18px" }}>
        Cards ({cards.length})
      </h2>

      {cards.map((card) => (
        <div key={card.id} className="card">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold" style={{ fontSize: "16px" }}>
              {card.targetWord}
            </h3>
            <span
              className="text-sm"
              style={{
                background: "#eff6ff",
                color: "#3b82f6",
                padding: "2px 8px",
                borderRadius: "4px",
              }}
            >
              {card.mode}
            </span>
          </div>

          <p className="text-sm mb-2">{card.sentence}</p>

          {card.pinyin && (
            <p className="text-sm text-gray mb-2">{card.pinyin}</p>
          )}

          {card.definition && (
            <p className="text-sm text-gray mb-2">{card.definition}</p>
          )}

          {card.translation && (
            <p className="text-sm" style={{ fontStyle: "italic" }}>
              {card.translation}
            </p>
          )}

          <div className="flex gap-2 mt-3">
            {card.audioUrl && (
              <button
                className="button"
                onClick={() => playAudio(card.audioUrl!)}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                ▶ Play
              </button>
            )}
            <button
              className="button button-secondary"
              onClick={() => setEditingCard(card)}
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              Edit
            </button>
            <button
              className="button button-secondary"
              onClick={() => handleDelete(card.id)}
              style={{
                fontSize: "12px",
                padding: "6px 12px",
                background: "#ef4444",
              }}
            >
              Delete
            </button>
          </div>

          <p className="text-sm text-gray mt-2">
            {new Date(card.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
