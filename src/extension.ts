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
			let decorations = [] as {
				decoration: vscode.TextEditorDecorationType,
				rangeReference: vscode.Range,
				replacedText: string
			}[];
			let decorationsHightlight = [] as vscode.TextEditorDecorationType[];

			editor.visibleRanges.forEach((range) => {
				for (let lineIndex = range.start.line; lineIndex <= range.end.line; lineIndex++) {
					const lineContent = editor.document.lineAt(lineIndex).text;

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

			editor.edit((editBuilder) => {
				coordsMetadata.forEach((metadata) => {
					const rangeCoords = new vscode.Range(
						metadata.coords.line,
						metadata.coords.character,
						metadata.coords.line,
						metadata.coords.character + metadata.label.length
					);

					const codeToBeReplaced = editor.document.getText(rangeCoords);
					editBuilder.replace(rangeCoords, metadata.label);

					const decorator = vscode.window.createTextEditorDecorationType({
						color: "cyan",
						textDecoration: "position: absolute; translateY(50px)",
					});

					editor.setDecorations(decorator, [rangeCoords]);
					decorations.push({
						decoration: decorator,
						rangeReference: rangeCoords,
						replacedText: codeToBeReplaced,
					});
				})
			});

			position.forEach((pos) => {
				const lineContent = editor.document.lineAt(pos.line).text;
				const decorator = vscode.window.createTextEditorDecorationType({
					color: "#ffffff57"
				});

				editor.setDecorations(decorator, [
					new vscode.Range(
						pos.line,
						0,
						pos.line,
						lineContent.length
					)
				]);
				decorationsHightlight.push(decorator);
			});

			const cleanUpDecorations = () => {
				editor.edit((editBuilder) => {
					decorations.forEach((decorator) => {
						decorator.decoration.dispose();
						editBuilder.replace(decorator.rangeReference, decorator.replacedText);
					});
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