/**
 * ErrorDisplay React component
 * Display error chunks from API (fail-fast error propagation), show error code + message, auto-dismiss after 5s
 */

import React, { useEffect } from "react";

export interface ErrorDisplayProps {
	error: string | null;
	onDismiss: () => void;
	autoDismissMs?: number;
}

export function ErrorDisplay({
	error,
	onDismiss,
	autoDismissMs = 5000,
}: ErrorDisplayProps) {
	useEffect(() => {
		if (error && autoDismissMs > 0) {
			const timer = setTimeout(() => {
				onDismiss();
			}, autoDismissMs);
			return () => clearTimeout(timer);
		}
	}, [error, autoDismissMs, onDismiss]);

	if (!error) {
		return null;
	}

	return (
		<div className="error-display">
			<div className="error-message">{error}</div>
			<button className="error-dismiss" onClick={onDismiss}>
				×
			</button>
		</div>
	);
}

