import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { evalIn, waitFor } from "@openwork/behaviors";
import { navigate } from "@openwork/cdp";
import { screenshot, validate } from "@openwork/fraimz";
import { expectFrame } from "@openwork/fraimz/vitest";
import { chrome } from "@openwork/hosts";
import { localMysqlIsRunning, needs, server, test } from "@openwork/testkit";
import { expect } from "vitest";

const expectation =
	"The signed-in OpenWork Web workspace shell is visible and ready for a task";
const appSpecsEnabled = process.env.OPENWORK_EVAL_APP_SPECS === "1";
const daytonaPlacement = process.env.OPENWORK_EVAL_DAYTONA === "1";
const attachedDen = Boolean(process.env.OPENWORK_EVAL_DEN_API_URL?.trim());
const mysqlOpen =
	daytonaPlacement || attachedDen || (await localMysqlIsRunning());
const title = !appSpecsEnabled
	? "hosted browser app boot skipped — needs: set OPENWORK_EVAL_APP_SPECS=1"
	: !mysqlOpen
		? "hosted browser app boot skipped — needs MySQL on 127.0.0.1:3306 for local placement"
		: "hosted browser app boot records the signed-in OpenWork Web workspace shell";

test.skipIf(!appSpecsEnabled || !mysqlOpen)(
	title,
	async ({ evidence, place }) => {
		needs({ optIn: ["OPENWORK_EVAL_APP_SPECS"] });
		await using den = await server({ place });
		await using browser = await chrome({
			name: "hosted-browser-app-boot",
			startUrl: den.ref.webUrl,
			headless: true,
			host: place.host(),
		});
		await browser.client.send("Emulation.setDeviceMetricsOverride", {
			width: 1440,
			height: 1000,
			deviceScaleFactor: 1,
			mobile: false,
		});
		await waitFor(
			browser,
			`location.href.startsWith(${JSON.stringify(den.ref.webUrl)})
    && document.readyState === "complete"`,
			{
				timeoutMs: 60_000,
				label: "OpenWork Web origin before admin auth token handoff",
			},
		);

		const tokenStored = await evalIn(
			browser,
			`(() => {
    localStorage.setItem("openwork:web:auth-token", ${JSON.stringify(den.admin.token)});
    return localStorage.getItem("openwork:web:auth-token") === ${JSON.stringify(den.admin.token)};
  })()`,
		);
		expect(tokenStored).toBe(true);

		await navigate(browser.client, `${den.ref.webUrl}/dashboard`);
		await waitFor(
			browser,
			`(() => {
    const heading = [...document.querySelectorAll("h2")]
      .find((entry) => (entry.textContent ?? "").trim() === "What do you need done?");
    const composer = document.querySelector('[contenteditable="true"][aria-placeholder]');
    return location.pathname.startsWith("/dashboard")
      && Boolean(heading)
      && Boolean(composer)
      && !document.querySelector('input[type="password"]');
  })()`,
			{
				timeoutMs: 60_000,
				label: "signed-in workspace heading and task composer",
			},
		);

		const shot = await screenshot(browser);
		const seen = await validate(shot, [expectation], {
			ask: async (request) =>
				request.prompt.startsWith("Objectively describe")
					? JSON.stringify({
							description:
								"A signed-in OpenWork Web workspace with navigation and a task composer.",
						})
					: JSON.stringify({
							results: [
								{
									expectation,
									passed: true,
									evidence:
										"The workspace heading and task composer were visible after authenticated DOM readiness checks.",
								},
							],
						}),
		});
		expectFrame(seen);

		await evidence.close();
		const roll: unknown = JSON.parse(
			await readFile(join(evidence.dir, "roll.json"), "utf8"),
		);
		expect(roll).toMatchObject({
			summary: {
				ok: true,
				totalFrames: 1,
				passedFrames: 1,
				failedFrames: 0,
				unvalidatedFrames: 0,
			},
			frames: [
				{
					caption: expectation,
					fileName: expect.stringMatching(/\.png$/),
					hash: expect.stringMatching(/^[a-f0-9]{64}$/),
					ok: true,
				},
			],
		});
	},
);
