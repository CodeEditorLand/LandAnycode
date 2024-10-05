// ### declared modules
declare module "fff" {
	//             ^   ^
	export namespace env {
		//                   ^
		export const foo: number;
		//                   ^
		export function openExternal(target: Uri): Thenable<boolean>;
		//                      ^
	}
}
// ### type alias
type FooDooBarBazz = number;
//   ^
// ### class types
const nullReporter = new (class NullTelemetryReporter
	implements TelemetryReporter
{
	//    ^
	//                             ^
	sendTelemetryEvent() {
		/** noop */
	}
	//  ^
	dispose() {
		/** noop */
	}
	//  ^
})();
