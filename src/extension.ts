import * as vscode from 'vscode';

class ExtensionFacade {
	private selectionLineNumber: number;
	private attributes: Array<string>;
	private startInsertLine: number = 0;

	public constructor() {
		const editor = this.getActiveEditor();

		if (editor?.document.languageId !== "php") {
			throw new Error("Este não é um arquivo PHP");
		}

		const selection = editor.selection;
		this.selectionLineNumber = selection.start.line;

		if (selection && selection.isEmpty) {
			throw new Error("Você precisa selecionar o nome de uma classe");
		}

		this.isClassVerification();

		this.attributes = this.getAttributes();
	}

	isClassVerification() {
		const editor = this.getActiveEditor();
		const isClass = editor?.document.lineAt(this.selectionLineNumber).text.includes("class");

		if (!isClass) {
			throw new Error("Esta seleção não corresponde a uma classe");
		}
	}

	getActiveEditor() {
		return vscode.window.activeTextEditor;
	}

	getAttributes() {
		const editor = this.getActiveEditor();
		const document = editor?.document;
		const lineCount = document?.lineCount || 0;

		const attributes: Array<string> = [];
		for (let i = this.selectionLineNumber + 1; i < lineCount; i++) {
			const currenteLineText = document?.lineAt(i).text.trim() || "";

			const pattern = /(?=^((?!\(|\)).)*$)(?=^(public|private|protected).*\$)/g;
			const isClassAttribute = pattern.test(currenteLineText);

			if (isClassAttribute) {
				const attributeNamePattern = /\$\w+/g;
				const matches = attributeNamePattern.exec(currenteLineText);

				if (matches && matches.length > 0) {
					const removeSignPattern = /\w+/g;
					const attributeNameMatches = removeSignPattern.exec(matches[0]) || "";

					attributes.push(attributeNameMatches[0]);
				}
			} else {
				this.startInsertLine = i;
				break;
			}
		}

		return attributes;
	}

	async insertGetter() {
		let content = "";

		this.attributes.forEach((attribute) => {
			content += this.getGetterString(attribute);
		});

		await this.render(content);
	}

	getGetterString(attribute: string) {
		const capitalizedAttribute = attribute[0].toUpperCase() + attribute.substring(1);
		return `\n\tpublic function get${capitalizedAttribute}() {\n\t\treturn $this->${attribute};\n\t}\n`
	}

	async insertSetter() {
		let content = "";

		this.attributes.forEach((attribute) => {
			content += this.getSetterString(attribute);
		});

		await this.render(content);
	}

	getSetterString(attribute: string) {
		const capitalizedAttribute = attribute[0].toUpperCase() + attribute.substring(1);
		return `\n\tpublic function set${capitalizedAttribute}($${attribute}) {\n\t\t$this->${attribute} = $${attribute};\n\t}\n`
	}

	async insertGetterAndSetter() {
		let content = "";

		this.attributes.forEach((attribute) => {
			content += this.getGetterString(attribute);
			content += this.getSetterString(attribute);
		});

		await this.render(content);
	}

	async render(content: string) {
		const editor = this.getActiveEditor();

		await editor?.edit((editBuilder) => {
			editBuilder.insert(
				new vscode.Position(this.startInsertLine, 0),
				content
			);
		});
	}
}

function activate(context: vscode.ExtensionContext) {
	let extensionFacade = new ExtensionFacade();

	let insertGetter = vscode.commands.registerCommand("classCraftPhp.insertGetter", () => extensionFacade.insertGetter());
	let insertSetter = vscode.commands.registerCommand("classCraftPhp.insertSetter", () => extensionFacade.insertSetter());
	let inserGetterAndSetter = vscode.commands.registerCommand("classCraftPhp.insertGetterAndSetter", () => extensionFacade.insertGetterAndSetter());

	context.subscriptions.push(insertGetter);
	context.subscriptions.push(insertSetter);
	context.subscriptions.push(inserGetterAndSetter);
}

export function deactivate() { }


exports.activate = activate;
