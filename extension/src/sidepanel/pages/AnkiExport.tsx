import { useState, useEffect } from "react";
import * as api from "../../lib/api";
import * as anki from "../../lib/anki";
import JSZip from "jszip";
import { Card } from "../../lib/types";

export default function AnkiExport() {
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [ankiConnected, setAnkiConnected] = useState(false);
  const [ankiDecks, setAnkiDecks] = useState<string[]>([]);
  const [targetDeck, setTargetDeck] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadCards();
    checkAnki();
  }, []);

  async function loadCards() {
    try {
      setLoading(true);
      const data = await api.getCards(undefined, 100);
      setCards(data);
    } catch (error) {
      console.error("Failed to load cards:", error);
    } finally {
      setLoading(false);
    }
  }

  async function checkAnki() {
    try {
      const connected = await anki.checkConnection();
      setAnkiConnected(connected);

      if (connected) {
        const decks = await anki.getDeckNames();
        setAnkiDecks(decks);
        if (decks.length > 0) {
          setTargetDeck(decks[0]);
        }
      }
    } catch (error) {
      setAnkiConnected(false);
    }
  }

  function toggleCard(id: string) {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCards(newSelected);
  }

  function selectAll() {
    setSelectedCards(new Set(cards.map((c) => c.id)));
  }

  function deselectAll() {
    setSelectedCards(new Set());
  }

  async function handleExportToAnki() {
    if (!targetDeck || selectedCards.size === 0) return;

    setExporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const cardId of selectedCards) {
      const card = cards.find((c) => c.id === cardId);
      if (!card) continue;

      try {
        await anki.exportCard(card, targetDeck);
        successCount++;
      } catch (error) {
        console.error("Failed to export card:", error);
        errorCount++;
      }
    }

    setExporting(false);
    alert(`Export complete!\nSuccess: ${successCount}\nFailed: ${errorCount}`);
  }

  async function handleExportCSV() {
    if (selectedCards.size === 0) return;

    setExporting(true);

    try {
      const zip = new JSZip();

      // Create CSV content
      const csvHeader =
        "Word,Sentence,Pinyin,Definition,Translation,Audio,Source,Tags\n";
      let csvContent = csvHeader;

      const mediaFolder = zip.folder("media");

      for (const cardId of selectedCards) {
        const card = cards.find((c) => c.id === cardId);
        if (!card) continue;

        const audioFilename = card.audioUrl ? `card_${card.id}.webm` : "";

        // Add audio file to zip
        if (card.audioUrl && mediaFolder) {
          try {
            const response = await fetch(card.audioUrl);
            const blob = await response.blob();
            mediaFolder.file(audioFilename, blob);
          } catch (error) {
            console.error("Failed to fetch audio:", error);
          }
        }

        // Add row to CSV
        const row = [
          escapeCSV(card.targetWord),
          escapeCSV(card.sentence),
          escapeCSV(card.pinyin),
          escapeCSV(card.definition),
          escapeCSV(card.translation),
          audioFilename ? `[sound:${audioFilename}]` : "",
          escapeCSV(`${card.videoTitle} (${card.channel})`),
          escapeCSV(card.tags.join(", ")),
        ].join(",");

        csvContent += row + "\n";
      }

      // Add CSV to zip
      zip.file("cards.csv", "\uFEFF" + csvContent); // UTF-8 BOM

      // Generate zip
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `caption-miner-export-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      alert("CSV export complete!");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  }

  function escapeCSV(value: string): string {
    if (!value) return "";
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <h2 className="font-bold mb-4" style={{ fontSize: "18px" }}>
        Export to Anki
      </h2>

      <div className="card">
        <h3 className="font-bold mb-2">AnkiConnect Status</h3>
        <div className="flex items-center gap-2">
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: ankiConnected ? "#10b981" : "#ef4444",
            }}
          />
          <p className="text-sm">
            {ankiConnected ? "Connected" : "Not connected"}
          </p>
        </div>

        {!ankiConnected && (
          <p className="text-sm text-gray mt-2">
            Make sure Anki is running with AnkiConnect installed.
          </p>
        )}

        <button
          className="button mt-3"
          onClick={checkAnki}
          style={{ fontSize: "12px", padding: "6px 12px" }}
        >
          Refresh
        </button>
      </div>

      {ankiConnected && (
        <div className="card">
          <label className="label">Target Deck</label>
          <select
            className="select"
            value={targetDeck}
            onChange={(e) => setTargetDeck(e.target.value)}
          >
            {ankiDecks.map((deck) => (
              <option key={deck} value={deck}>
                {deck}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">Select Cards ({selectedCards.size})</h3>
          <div className="flex gap-2">
            <button
              className="button button-secondary"
              onClick={selectAll}
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              All
            </button>
            <button
              className="button button-secondary"
              onClick={deselectAll}
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              None
            </button>
          </div>
        </div>

        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-2 mb-2"
              onClick={() => toggleCard(card.id)}
              style={{ cursor: "pointer" }}
            >
              <input
                type="checkbox"
                className="checkbox"
                checked={selectedCards.has(card.id)}
                onChange={() => {}}
              />
              <div>
                <p className="text-sm font-bold">{card.targetWord}</p>
                <p className="text-sm text-gray">{card.sentence}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {ankiConnected && (
          <button
            className="button"
            onClick={handleExportToAnki}
            disabled={exporting || selectedCards.size === 0}
          >
            {exporting ? "Exporting..." : "Export to Anki"}
          </button>
        )}

        <button
          className="button button-secondary"
          onClick={handleExportCSV}
          disabled={exporting || selectedCards.size === 0}
        >
          {exporting ? "Exporting..." : "Export CSV + Media Zip"}
        </button>
      </div>

      <p className="text-sm text-gray mt-4">
        CSV exports can be imported into Anki manually via File → Import.
      </p>
    </div>
  );
}
