import streamDeck from "@elgato/streamdeck";
import { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

@action({ UUID: "com.datti.indicaluna.smart-button" })
export class SmartButton extends SingletonAction<SmartButtonSettings> {
	override async onKeyDown(ev: KeyDownEvent<SmartButtonSettings>): Promise<void> {
        debugger;
        const { settings } = ev.payload;
		const moonrakerUrl = (settings.moonrakerUrl ?? "").trim();
		const gcode = (settings.gcode ?? "").trim();

		if (!moonrakerUrl || !gcode) {
			streamDeck.logger.warn("Smart Button missing settings", { moonrakerUrl, hasGcode: !!gcode });
			await ev.action.showAlert();
			return;
		}

		try {
			await sendGcode(moonrakerUrl, gcode);
			await ev.action.showOk();
		} catch (error) {
			streamDeck.logger.error("Failed to send G-code", error);
			await ev.action.showAlert();
		}
	}
}

type SmartButtonSettings = {
	moonrakerUrl?: string;
	gcode?: string;
};

async function sendGcode(moonrakerUrl: string, gcode: string): Promise<void> {
	const normalizedBaseUrl = moonrakerUrl.replace(/\/+$/, "");
	const url = `${normalizedBaseUrl}/printer/gcode/script`;
	const payload = { script: gcode };

	streamDeck.logger.info("Sending G-code", { url, gcode });

	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		throw new Error(`Moonraker request failed with status ${response.status}`);
	}
}
