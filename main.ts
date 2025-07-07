import { App, Plugin, PluginSettingTab, Setting, TFile, Notice, Modal } from "obsidian";

interface RefinerSettings {
	apiKey: string;
	model: string;
	apiUrl: string;
	tags: string;
	additionalInstructions: string;
	useOllama: boolean;
}

const DEFAULT_SETTINGS: RefinerSettings = {
	apiKey: "",
	model: "gpt-4o",
	apiUrl: "https://api.openai.com/v1/chat/completions",
	tags: "",
	additionalInstructions: "",
	useOllama: false,
};

export default class RefinerPlugin extends Plugin {
	settings: RefinerSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "refine-current-note",
			name: "Refine Current Note",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (file && !checking) this.refineNote(file);
				return !!file;
			},
		});

		this.addCommand({
			id: "refine-from-file-menu",
			name: "Refine Note (Right-click)",
			checkCallback: (checking) => true,
			callback: async () => {
				const file = this.app.workspace.getActiveFile();
				if (file) await this.refineNote(file);
			},
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile && file.extension === "md") {
					menu.addItem((item) =>
						item.setTitle("Refine with NoteSmith").setIcon("wand").onClick(() => {
							this.refineNote(file);
						})
					);
				}
			})
		);

		this.addSettingTab(new RefinerSettingTab(this.app, this));
	}

	async refineNote(file: TFile) {
		const spinner = new LoadingModal(this.app);
		spinner.open();

		try {
			const original = await this.app.vault.read(file);

			const tagInstruction = this.settings.tags.trim()
				? `If any content fits the following tags, add them where appropriate (e.g. headers, checklists). Doesn't just have to be for headers, can be at any point in the document: ${this.settings.tags}`
				: "";

			const baseInstructions = `You are a helpful assistant that formats and improves Markdown notes for use in Obsidian.

Clean up the following note by:
- Fixing grammar, punctuation, and inconsistent structure
- Making the content easier to read and logically organized
- Applying proper Obsidian Markdown formatting:
  - Use \`#\`, \`##\`, \`###\`, \`####\` for headings
  - Format lists using \`-\` or \`1.\` consistently
  - Convert any tasks into \`[ ]\` or \`[x]\` checkboxes
  - Preserve and reformat code blocks, blockquotes, and inline formatting
  - Don't wrap the whole response in a code block
  - Avoid \`---\` at the top (it breaks Obsidian rendering)

Keep all important content, but reword or reformat for clarity where helpful.`;

			const prompt = `${baseInstructions}
${tagInstruction ? `\n- ${tagInstruction}` : ""}
${this.settings.additionalInstructions ? `\n\nAdditional Instructions:\n${this.settings.additionalInstructions}` : ""}
\n\n### Note:\n${original}`;


			const refined = this.settings.useOllama
				? await this.callMistral(prompt)
				: await this.callOpenAI(prompt);

			if (refined) {
				await this.app.vault.modify(file, refined);
				new Notice(`Note refined: ${file.name}`);
			} else {
				new Notice("Failed to refine the note.");
			}
		} catch (err) {
			console.error("Refiner Error:", err);
			new Notice("An error occurred while refining the note.");
		} finally {
			spinner.close();
		}
	}

	async callMistral(prompt: string): Promise<string | null> {
		const { apiUrl } = this.settings; // e.g. "http://localhost:3000/api/v1/generate"

		try {
			const res = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: this.settings.model,
					messages: [
						{
							role: "user",
							content: prompt,
						}
					],
					max_tokens: 512,
					temperature: 0.3,
				}),
			});

			if (!res.ok) {
				const text = await res.text();
				throw new Error(`API Error: ${res.status} ${res.statusText} - ${text}`);
			}

			const json = await res.json();
			// OpenWebUI returns { response: string }
			return json.response || null;
		} catch (err) {
			console.error("Mistral API Error:", err);
			return null;
		}
	}


	async callOpenAI(content: string): Promise<string | null> {
		const { apiKey, model, apiUrl } = this.settings;

		try {
			const res = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model,
					messages: [{ role: "user", content }],
					temperature: 0.3,
				}),
			});

			if (!res.ok) {
				const text = await res.text();
				throw new Error(`API Error: ${res.status} ${res.statusText} - ${text}`);
			}

			const json = await res.json();
			return json.choices?.[0]?.message?.content || null;
		} catch (err) {
			console.error("Refiner Plugin Error:", err);
			return null;
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class RefinerSettingTab extends PluginSettingTab {
	plugin: RefinerPlugin;

	constructor(app: App, plugin: RefinerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "Note Refiner Settings" });

		new Setting(containerEl)
			.setName("Use local Ollama")
			.setDesc("If enabled, sends requests to your local Ollama server instead of OpenAI")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.useOllama).onChange(async (value) => {
					this.plugin.settings.useOllama = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("OpenAI API Key")
			.setDesc("Only needed if not using Ollama")
			.addText((text) =>
				text
					.setPlaceholder("sk-...")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Model")
			.setDesc("e.g. gpt-4o, llama3, mistral")
			.addText((text) =>
				text
					.setPlaceholder("gpt-4o")
					.setValue(this.plugin.settings.model)
					.onChange(async (value) => {
						this.plugin.settings.model = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("API Endpoint")
			.setDesc("For OpenAI or local Ollama. E.g. https://api.openai.com/v1/chat/completions or http://localhost:11434/v1/chat/completions")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.apiUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiUrl = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Preferred Tags")
			.setDesc("Comma-separated tags like #todo, #meeting, #idea")
			.addText((text) =>
				text
					.setPlaceholder("#todo, #meeting")
					.setValue(this.plugin.settings.tags || "")
					.onChange(async (value) => {
						this.plugin.settings.tags = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Additional Prompt Instructions")
			.setDesc("Optional extra instructions sent to the model")
			.addTextArea((textArea) =>
				textArea
					.setPlaceholder("Add any additional instructions here...")
					.setValue(this.plugin.settings.additionalInstructions)
					.onChange(async (value) => {
						this.plugin.settings.additionalInstructions = value.trim();
						await this.plugin.saveSettings();
					}).inputEl.style.minWidth = "350px"
			)
			.settingEl.style.maxWidth = "100%";
	}
}

class LoadingModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createDiv({
			text: "Refining note...",
			cls: "refiner-loading-text",
		});
		contentEl.createDiv({ cls: "refiner-spinner" });
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
