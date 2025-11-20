import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { CharacterCardListItem } from "../services/api.js";
import { listCharacterCards } from "../services/api.js";

export function Home() {
	const [cards, setCards] = useState<CharacterCardListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function loadCards() {
			try {
				setLoading(true);
				const loadedCards = await listCharacterCards();
				setCards(loadedCards);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load character cards");
			} finally {
				setLoading(false);
			}
		}

		loadCards();
	}, []);

	if (loading) {
		return <div className="home-loading">Loading characters...</div>;
	}

	if (error) {
		return <div className="home-error">Error: {error}</div>;
	}

	return (
		<div className="home-page">
			<header className="home-header">
				<h1>Select a Character</h1>
				<p>Choose a character to start chatting with</p>
			</header>

			<div className="character-grid">
				{cards.map((card) => (
					<Link to={`/chat/${card.id}`} key={card.id} className="character-card-link">
						<div className="character-card">
							<div className="character-avatar-placeholder">
								{card.data.data.name.charAt(0).toUpperCase()}
							</div>
							<div className="character-info">
								<h3 className="character-name">{card.data.data.name}</h3>
								<p className="character-tagline">{card.data.data.description}</p>
							</div>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}