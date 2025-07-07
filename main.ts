import { App, Plugin, PluginSettingTab, Setting, TFile, Notice, Modal } from "obsidian";

interface RefinerSettings {
	apiKey: string;
	model: string;
	apiUrl: string;
	tags: string;
	additionalInstructions: string;
}

const DEFAULT_SETTINGS: RefinerSettings = {
	apiKey: "",
	model: "gpt-4o",
	apiUrl: "https://api.openai.com/v1/chat/completions",
	tags: "",
	additionalInstructions: "",
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
  - Use \`#\` or \`##\` or \`###\` or \`####\` for section headings where appropriate
  - Format lists using \`-\` or \`1.\` consistently
  - Convert any tasks into \`[ ]\` or \`[x]\` checkboxes
  - Preserve and reformat code blocks, blockquotes, and inline formatting correctly
  - Don't output the response in a code block. Parts of the notes can be in code blocks, but the entire response should not be in a code block.
  - Avoid inserting a horizontal rule at the very beginning of the note (\`---\`) as it breaks rendering in Obsidian

Keep all important content, but reword or reformat for clarity where helpful.`;

			const prompt = `${baseInstructions}
${tagInstruction ? `\n- ${tagInstruction}` : ""}
${this.settings.additionalInstructions ? `\n\nHere are additional instructions for how to modify the document. These are not part of the document:\n${this.settings.additionalInstructions}` : ""}
\n\n### Here is the contents of the document to edit:\n\n${original}`;

			const refined = await this.callLLM(prompt);

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

	async callLLM(content: string): Promise<string | null> {
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
		containerEl.createEl("h2", { text: "NoteSmith Settings" });

		new Setting(containerEl)
			.setName("OpenAI API Key")
			.setDesc("Paste your OpenAI (or compatible) API key here")
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
			.setDesc("Example: gpt-4o, gpt-3.5-turbo, or llama3")
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
			.setDesc("OpenAI-compatible URL. Default: https://api.openai.com/v1/chat/completions")
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
			.setDesc("Optional: Comma-separated tags (e.g. #todo, #meeting, #idea). Used to label parts of the refined note.")
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
			.setDesc("Optional: Extra instructions passed to the language model.")
			.addTextArea((textArea) => {
					textArea
						.setPlaceholder("Add any additional instructions here...")
						.setValue(this.plugin.settings.additionalInstructions)
						.onChange(async (value) => {
							this.plugin.settings.additionalInstructions = value.trim();
							await this.plugin.saveSettings();
						}).inputEl.className = "refiner-textarea"

					textArea.inputEl.rows = 5;
					return textArea
				}
			).settingEl.className = "refiner-setting";
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
