import * as vscode from 'vscode';

type Position = {
	line: number;
	content: string,
	character: number;
};

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('hop', async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showErrorMessage("No active editor found.");
			return;
		}

		if (editor) {
			let position = [] as Position[];
			let decorations = [] as vscode.TextEditorDecorationType[];
			let decorationsHightlight = [] as vscode.TextEditorDecorationType[];

			editor.visibleRanges.forEach((range) => {
				for (let lineIndex = range.start.line; lineIndex <= range.end.line; lineIndex++) {
					const lineContent = editor.document.lineAt(lineIndex).text;

					const decorator = vscode.window.createTextEditorDecorationType({
						color: "#ffffff57"
					});

					editor.setDecorations(decorator, [
						new vscode.Range(
							lineIndex,
							0,
							lineIndex,
							lineContent.length
						)
					]);
					decorationsHightlight.push(decorator);

					const wordRegex = /[a-zA-Z0-9_]+/g;
					let match;
					while ((match = wordRegex.exec(lineContent)) !== null) {
						position.push({
							line: lineIndex,
							character: match.index,
							content: match[0],
						});
					}
				}
			});

			let keybindings = ((positions: number) => {
				let labels = [] as string[];
				let bindings = "abcdefghijklmnopqrstuvwxyz";

				let interactionTimes = parseInt(Math.ceil(positions / 26).toFixed(0));
				interactionTimes = !interactionTimes ? 1 : interactionTimes;

				for (let x = 0; x < interactionTimes; x++) {
					for (let i = 0; i < (positions < 26 ? positions : 26); i++) {
						if (labels.length >= positions) break;

						let prefix = x > 0 ? labels[x] : "";
						labels.push(`${prefix}${bindings[i]}`);
					}
				}
				return labels
			})(position.length);

			let coordsMetadata = keybindings.map((label, index) => ({
				label,
				coords: position[index],
			}));

			coordsMetadata.forEach((metadata) => {
				const decorator = vscode.window.createTextEditorDecorationType({
					after: {
						contentText: metadata.label,
						color: "cyan",
						backgroundColor: "rgba(0, 0, 0, 0.1)",
						margin: "0 0 0 0",
					},
					textDecoration: "position: absolute; translateY(50px)",
				});

				editor.setDecorations(decorator, [
					new vscode.Range(
						metadata.coords.line,
						metadata.coords.character,
						metadata.coords.line,
						metadata.coords.character
					)
				]);
				decorations.push(decorator);
			});

			const cleanUpDecorations = () => {
				decorations.forEach((decorator) => {
					decorator.dispose();
				});
				decorationsHightlight.forEach((decorator) => {
					decorator.dispose();
				});
				decorations = [];
				decorationsHightlight = [];
			}

			const pickedLabel = await vscode.window.showInputBox({
				placeHolder: "Enter the label to jump to",
			});

			if (!pickedLabel) {
				cleanUpDecorations();
				return;
			}

			const [foundLabel] = coordsMetadata.filter((metadata) => metadata.label === pickedLabel.toLowerCase());

			if (!foundLabel) {
				vscode.window.showErrorMessage("Invalid label.");
				cleanUpDecorations();
				return;
			}

			const selection = new vscode.Selection(
				foundLabel.coords.line,
				foundLabel.coords.character,
				foundLabel.coords.line,
				foundLabel.coords.character,
			);
			editor.selection = selection
			editor.revealRange(new vscode.Range(
				selection.start,
				selection.end,
			));

			cleanUpDecorations();
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }