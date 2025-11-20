/**
 * App root component
 * Sets up routing for the application
 */

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home.js";
import { Chat } from "./pages/Chat.js";

export function App() {
	return (
		<BrowserRouter>
			<div className="app">
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/chat/:characterId" element={<Chat />} />
				</Routes>
			</div>
		</BrowserRouter>
	);
}
