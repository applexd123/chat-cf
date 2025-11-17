/**
 * Frontend entry point
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles/app.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(React.createElement(App));

