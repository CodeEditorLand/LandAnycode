/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { DocumentStore } from '../documentStore';
import Languages from '../languages';
import { Trees } from '../trees';
import { SymbolIndex } from './symbolIndex';

export class CompletionItemProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
		private _symbols: SymbolIndex
	) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.CompletionRequest.type, { documentSelector: Languages.getSupportedLanguages('completions', ['identifiers', 'outline']) });
		connection.onRequest(lsp.CompletionRequest.type, this.provideCompletionItems.bind(this));
	}

	async provideCompletionItems(params: lsp.CompletionParams): Promise<lsp.CompletionItem[]> {

		const document = await this._documents.retrieve(params.textDocument.uri);
		const tree = this._trees.getParseTree(document);
		if (!tree) {
			return [];
		}

		const result = new Map<string, lsp.CompletionItem>();

		// (1) all identifiers that are used in this file
		const query = Languages.getQuery(document.languageId, 'identifiers');
		const captures = query.captures(tree.rootNode);
		for (let capture of captures) {
			const text = capture.node.text;
			result.set(text, { label: text });
		}


		// (2) all definitions that are known in this project (override less specific local identifiers)

		// don't wait for the whole index to be updated but use what we have right now,
		// it is very likely that the current has changed and that we already processed
		// await this._symbols.update();

		for (let [key, map] of this._symbols.definitions) {
			const [[, [firstKind]]] = map;
			result.set(key, {
				label: key,
				kind: CompletionItemProvider._kindMapping.get(firstKind)
			});
		}
		return Array.from(result.values());
	}

	private static _kindMapping = new Map<lsp.SymbolKind, lsp.CompletionItemKind>([
		[lsp.SymbolKind.Class, lsp.CompletionItemKind.Class],
		[lsp.SymbolKind.Interface, lsp.CompletionItemKind.Interface],
		[lsp.SymbolKind.Field, lsp.CompletionItemKind.Field],
		[lsp.SymbolKind.Property, lsp.CompletionItemKind.Property],
		[lsp.SymbolKind.Event, lsp.CompletionItemKind.Event],
		[lsp.SymbolKind.Constructor, lsp.CompletionItemKind.Constructor],
		[lsp.SymbolKind.Method, lsp.CompletionItemKind.Method],
		[lsp.SymbolKind.Enum, lsp.CompletionItemKind.Enum],
		[lsp.SymbolKind.EnumMember, lsp.CompletionItemKind.EnumMember],
		[lsp.SymbolKind.Function, lsp.CompletionItemKind.Function],
		[lsp.SymbolKind.Variable, lsp.CompletionItemKind.Variable],
	]);
}
