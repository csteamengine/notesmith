# 🪄 NoteSmith

Refine, clean, and organize your messy notes with a single command — powered by OpenAI or any OpenAI-compatible API.

This plugin sends your current note to an LLM and returns a cleaned-up version with improved formatting, structure, and clarity. Perfect for making quick notes or meeting jots readable and publish-ready.

---

## ✨ Features

- ✅ Cleans up Markdown formatting
- ✅ Fixes grammar, punctuation, and structure
- ✅ Converts bullet lists into tasks (`- [ ]`) when appropriate
- ✅ Applies proper heading structure
- ✅ Respects Obsidian Markdown conventions
- ✅ Optional tag annotations (e.g. `#todo`, `#idea` etc.)
- ✅ Supports additional user-defined prompt instructions
- ✅ Loading spinner and error handling
- ✅ Works via command palette or right-click file menu

---

## 🚀 Getting Started

### 1. Installation

1. Download the latest release from the Releases tab (coming soon).
2. Place the plugin folder inside `.obsidian/plugins/` in your vault.
3. Reload Obsidian and enable **Note Refiner** in the Settings → Community Plugins tab.

---

### 2. Configuration

Open the plugin settings and fill in:

- **OpenAI API Key** – Required for making requests.
- **Model** – e.g. `gpt-4o`, `gpt-3.5-turbo`, or any other supported model.
- **API Endpoint** – e.g. `https://api.openai.com/v1/chat/completions`. You can use alternatives like OpenRouter or a local LLM proxy.
- **Preferred Tags** – Optional. Tag labels (e.g. `#todo, #idea`) to annotate the refined output.
- **Additional Prompt Instructions** – Optional. Custom instructions appended to the main system prompt.

---

### 3. Usage

You can refine your notes via:

- **Command Palette**: `Refine Current Note`
- **Right-click menu** on any markdown file → `Refine with AI`

The plugin reads the note, formats and improves it using the language model, and overwrites the original file with the refined output. A spinner appears while refining, and a toast will confirm completion or failure.

---

## 💡 Prompt Behavior

The plugin uses a system prompt like the following:

> You are a helpful assistant that formats and improves Markdown notes for use in Obsidian.  
> Clean up grammar, structure, and formatting. Use proper headings, task checkboxes, and consistent lists. Preserve code blocks. Don’t wrap the entire response in a code block. Don’t start with a horizontal rule.

If you provide additional instructions, they'll be appended to that base prompt.

---

## 🛡️ Security Notice

Your API key is stored locally in Obsidian’s plugin settings on your device. It is **not** shared or sent anywhere other than your configured endpoint. Always use caution when entering sensitive credentials.

---

## 🧪 Example Use Cases

- Turning a meeting brain-dump into a structured note
- Organizing task checklists with tags like `#todo`
- Cleaning up voice-to-text input or copy/pasted content
- Making logs and bug reports readable

---

## 🛠️ License

MIT © [Your Name or Handle]
