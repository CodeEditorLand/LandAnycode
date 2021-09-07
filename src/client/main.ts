/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LanguageClientOptions } from 'vscode-languageclient';
import { LanguageClient } from 'vscode-languageclient/browser';
import { SupportedLanguages } from './supportedLanguages';

export function activate(context: vscode.ExtensionContext) {

	const supportedLanguages = new SupportedLanguages(context);

	// -- setup server
	const clientOptions: LanguageClientOptions = {
		documentSelector: supportedLanguages.getSupportedLanguagesAsSelector(),
		synchronize: {},
		initializationOptions: {
			// todo@jrieken same, same but different bug
			treeSitterWasmUri: vscode.Uri.joinPath(context.extensionUri, 'tree-sitter/tree-sitter.wasm').toString().replace(/^file:\/\//, 'vscode-file://vscode-app'),
			supportedLanguages: supportedLanguages.getSupportedLanguages()
		}
	};

	const serverMain = vscode.Uri.joinPath(context.extensionUri, 'dist/anycode.server.js');
	const worker = new Worker(serverMain.toString());
	const client = new LanguageClient('anycode', 'anycode', clientOptions, worker);

	const disposable = client.start();
	context.subscriptions.push(disposable);
	context.subscriptions.push({
		dispose() {
			// todo@jrieken what's the difference between Disposable returned from start()?
			client.stop();
		}
	});

	client.onReady().then(() => {

		const langPattern = `**/*.{${supportedLanguages.getSupportedLanguages().map(item => item.suffixes).flat().join(',')}}`;
		const size = Math.max(0, vscode.workspace.getConfiguration('anycode').get<number>('symbolIndexSize', 500));
		if (size > 0) {
			const p = Promise.resolve(vscode.workspace.findFiles(langPattern, undefined, 0).then(uris => {
				uris = uris.slice(0, size); // https://github.com/microsoft/vscode-remotehub/issues/255
				console.info(`FOUND ${uris.length} files for ${langPattern}`);

				return client.sendRequest('file/queue/init', uris.map(String));
			}));

			vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Building Index...' }, () => p);
		}

		const watcher = vscode.workspace.createFileSystemWatcher(langPattern);
		context.subscriptions.push(watcher);
		context.subscriptions.push(watcher.onDidCreate(uri => client.sendNotification('file/queue/add', [uri.toString()])));
		context.subscriptions.push(watcher.onDidDelete(uri => client.sendNotification('file/queue/remove', [uri.toString()])));
		context.subscriptions.push(watcher.onDidChange(uri => client.sendNotification('file/queue/update', [uri.toString()])));


		client.onRequest('file/read', async raw => {
			const uri = vscode.Uri.parse(raw);
			let languageId = '';
			for (let item of supportedLanguages.getSupportedLanguages()) {
				if (item.suffixes.some(suffix => uri.path.endsWith(`.${suffix}`))) {
					languageId = item.languageId;
					break;
				}
			}
			const data = await vscode.workspace.fs.readFile(uri);
			return { data, languageId };
		});

	});

	// -- status (NEW proposal)

	const item = vscode.languages.createLanguageStatusItem('info', supportedLanguages.getSupportedLanguagesAsSelector());
	context.subscriptions.push(item);
	item.text = `anycode`;
	let tooltip: string;
	if (vscode.extensions.getExtension('github.remotehub-insiders')) {
		tooltip = 'Only basic language support can be offered for this file. For better language support you can [continue working on](command:remoteHub.continueOn \'Continue working on this remote repository elsewhere\') this file elsewhere.';
	} else {
		tooltip = 'Only basic language support can be offered for this file.';
	}
	item.detail = tooltip;
}
