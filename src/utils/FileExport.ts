/*
 * File export helper.
 *
 * On Capacitor (Android), writes the file to cache via @capacitor/filesystem
 * and opens the system share sheet via @capacitor/share so the user picks
 * the destination through SAF (Files, Drive, email, etc.). Falls back to a
 * browser download via FileSaver on web/desktop. Avoids landing files in
 * the WebView's invisible download dir on Android.
 */
export function exportTextFile(content: string, fileName: string, mimeType: string = 'application/json'): void {
	let capacitor: any = (window as any).Capacitor;
	let fsPlugin: any = capacitor && capacitor.Plugins ? capacitor.Plugins.Filesystem : null;
	let sharePlugin: any = capacitor && capacitor.Plugins ? capacitor.Plugins.Share : null;

	if (fsPlugin !== null && sharePlugin !== null) {
		fsPlugin.writeFile({
			path: fileName,
			data: content,
			directory: 'CACHE',
			encoding: 'utf8'
		}).then(function (result: any) {
			let uri = result && typeof result.uri === 'string' ? result.uri : null;
			if (uri === null)
				return;
			return sharePlugin.share({
				title: fileName,
				url: uri,
				dialogTitle: fileName
			});
		}).catch(function (e: any) {
			console.error('SAF export failed, falling back to browser download', e);
			let blob = new Blob([content], { type: mimeType });
			saveAs(blob, fileName);
		});
		return;
	}

	let blob = new Blob([content], { type: mimeType });
	saveAs(blob, fileName);
}
