/// <reference types="react-scripts" />

// File System Access API types
interface FileSystemFileHandle {
	readonly kind: "file";
	readonly name: string;
	createWritable(): Promise<FileSystemWritableFileStream>;
	getFile(): Promise<File>;
}

interface FileSystemWritableFileStream extends WritableStream {
	write(data: any): Promise<void>;
	close(): Promise<void>;
}

interface FilePickerOptions {
	types?: Array<{
		description: string;
		accept: Record<string, string[]>;
	}>;
	suggestedName?: string;
}

interface Window {
	showSaveFilePicker(
		options?: FilePickerOptions
	): Promise<FileSystemFileHandle>;
	showOpenFilePicker(
		options?: FilePickerOptions
	): Promise<FileSystemFileHandle[]>;
}
