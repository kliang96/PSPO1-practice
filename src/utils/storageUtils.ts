import { UserProgress, StoragePreferences } from "../types";

// Check if File System Access API is supported
export const isFileSystemAccessSupported = (): boolean => {
	return "showSaveFilePicker" in window && "showOpenFilePicker" in window;
};

// Default storage preferences
export const defaultStoragePreferences: StoragePreferences = {
	useFileStorage: false,
	maxSessionHistory: 100,
	autoBackup: true,
};

// Storage class to handle both file system and localStorage
export class ProgressStorage {
	private storagePreferences: StoragePreferences;

	constructor(preferences: StoragePreferences = defaultStoragePreferences) {
		this.storagePreferences = preferences;
	}

	// Update storage preferences
	updatePreferences(newPreferences: Partial<StoragePreferences>): void {
		this.storagePreferences = { ...this.storagePreferences, ...newPreferences };
	}

	// Save user progress to selected storage method
	async saveProgress(progress: UserProgress): Promise<void> {
		try {
			// Limit session history to max allowed
			const limitedProgress = {
				...progress,
				sessionHistory: progress.sessionHistory.slice(
					-this.storagePreferences.maxSessionHistory
				),
			};

			if (
				this.storagePreferences.useFileStorage &&
				this.storagePreferences.fileHandle
			) {
				await this.saveToFile(limitedProgress);
			} else {
				await this.saveToLocalStorage(limitedProgress);
			}
		} catch (error) {
			console.error("Failed to save progress:", error);
			// Fallback to localStorage if file storage fails
			await this.saveToLocalStorage(progress);
		}
	}

	// Load user progress from selected storage method
	async loadProgress(): Promise<UserProgress | null> {
		try {
			if (
				this.storagePreferences.useFileStorage &&
				this.storagePreferences.fileHandle
			) {
				return await this.loadFromFile();
			} else {
				return await this.loadFromLocalStorage();
			}
		} catch (error) {
			console.error("Failed to load progress:", error);
			// Fallback to localStorage if file storage fails
			return await this.loadFromLocalStorage();
		}
	}

	// Save progress to file using File System Access API
	private async saveToFile(progress: UserProgress): Promise<void> {
		if (!this.storagePreferences.fileHandle) {
			throw new Error("No file handle available");
		}

		const writable = await this.storagePreferences.fileHandle.createWritable();
		await writable.write(JSON.stringify(progress, null, 2));
		await writable.close();
	}

	// Load progress from file using File System Access API
	private async loadFromFile(): Promise<UserProgress | null> {
		if (!this.storagePreferences.fileHandle) {
			throw new Error("No file handle available");
		}

		const file = await this.storagePreferences.fileHandle.getFile();
		const content = await file.text();

		if (!content.trim()) {
			return null;
		}

		const progress = JSON.parse(content);
		return this.parseProgressDates(progress);
	}

	// Save progress to localStorage
	private async saveToLocalStorage(progress: UserProgress): Promise<void> {
		localStorage.setItem("pspo-user-progress", JSON.stringify(progress));
	}

	// Load progress from localStorage
	private async loadFromLocalStorage(): Promise<UserProgress | null> {
		const savedProgress = localStorage.getItem("pspo-user-progress");
		if (!savedProgress) {
			return null;
		}

		const progress = JSON.parse(savedProgress);
		return this.parseProgressDates(progress);
	}

	// Parse date strings back to Date objects
	private parseProgressDates(progress: any): UserProgress {
		progress.lastUpdated = new Date(progress.lastUpdated);
		progress.streakData.lastStudyDate = new Date(
			progress.streakData.lastStudyDate
		);

		// Parse topic mastery dates
		Object.keys(progress.topicMastery).forEach((topic) => {
			progress.topicMastery[topic].lastAttempted = new Date(
				progress.topicMastery[topic].lastAttempted
			);
		});

		// Parse session history dates
		progress.sessionHistory = progress.sessionHistory.map((session: any) => ({
			...session,
			startTime: new Date(session.startTime),
			endTime: new Date(session.endTime),
		}));

		return progress;
	}

	// Select file for storage
	async selectFile(): Promise<FileSystemFileHandle | null> {
		if (!isFileSystemAccessSupported()) {
			throw new Error("File System Access API is not supported");
		}

		try {
			const fileHandle = await window.showSaveFilePicker({
				suggestedName: "pspo-exam-progress.json",
				types: [
					{
						description: "JSON files",
						accept: { "application/json": [".json"] },
					},
				],
			});

			this.storagePreferences.fileHandle = fileHandle;
			this.storagePreferences.useFileStorage = true;

			return fileHandle;
		} catch (error) {
			console.error("File selection cancelled or failed:", error);
			return null;
		}
	}

	// Open existing file for storage
	async openFile(): Promise<FileSystemFileHandle | null> {
		if (!isFileSystemAccessSupported()) {
			throw new Error("File System Access API is not supported");
		}

		try {
			const [fileHandle] = await window.showOpenFilePicker({
				types: [
					{
						description: "JSON files",
						accept: { "application/json": [".json"] },
					},
				],
			});

			this.storagePreferences.fileHandle = fileHandle;
			this.storagePreferences.useFileStorage = true;

			return fileHandle;
		} catch (error) {
			console.error("File opening cancelled or failed:", error);
			return null;
		}
	}

	// Export progress to a new file
	async exportProgress(progress: UserProgress): Promise<void> {
		if (!isFileSystemAccessSupported()) {
			// Fallback: download via blob
			const blob = new Blob([JSON.stringify(progress, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `pspo-progress-${
				new Date().toISOString().split("T")[0]
			}.json`;
			a.click();
			URL.revokeObjectURL(url);
			return;
		}

		try {
			const fileHandle = await window.showSaveFilePicker({
				suggestedName: `pspo-progress-${
					new Date().toISOString().split("T")[0]
				}.json`,
				types: [
					{
						description: "JSON files",
						accept: { "application/json": [".json"] },
					},
				],
			});

			const writable = await fileHandle.createWritable();
			await writable.write(JSON.stringify(progress, null, 2));
			await writable.close();
		} catch (error) {
			console.error("Export failed:", error);
		}
	}

	// Get storage preferences
	getPreferences(): StoragePreferences {
		return { ...this.storagePreferences };
	}
}

// Global storage instance
export const progressStorage = new ProgressStorage();

// Utility functions for storage preferences
export const saveStoragePreferences = (
	preferences: StoragePreferences
): void => {
	const preferencesToSave = {
		...preferences,
		// Don't save the file handle - it can't be serialized
		fileHandle: undefined,
	};
	localStorage.setItem(
		"pspo-storage-preferences",
		JSON.stringify(preferencesToSave)
	);
};

export const loadStoragePreferences = (): StoragePreferences => {
	const saved = localStorage.getItem("pspo-storage-preferences");
	if (!saved) {
		return defaultStoragePreferences;
	}

	try {
		return { ...defaultStoragePreferences, ...JSON.parse(saved) };
	} catch (error) {
		console.error("Failed to load storage preferences:", error);
		return defaultStoragePreferences;
	}
};

// Utility function to clean up corrupted user progress data
export const cleanupCorruptedProgress = async (): Promise<void> => {
	try {
		const progressData = localStorage.getItem("pspo-user-progress");
		if (!progressData) return;

		const progress = JSON.parse(progressData);

		// Fix totalSessions to match actual sessionHistory length
		const actualSessionCount = progress.sessionHistory?.length || 0;

		if (progress.totalSessions !== actualSessionCount) {
			console.log(
				`Fixing corrupted progress data: totalSessions was ${progress.totalSessions}, should be ${actualSessionCount}`
			);

			progress.totalSessions = actualSessionCount;

			// Remove any duplicate sessions (by ID)
			if (progress.sessionHistory) {
				const uniqueSessions = progress.sessionHistory.filter(
					(session: any, index: number, self: any[]) =>
						index === self.findIndex((s) => s.id === session.id)
				);

				if (uniqueSessions.length !== progress.sessionHistory.length) {
					console.log(
						`Removed ${
							progress.sessionHistory.length - uniqueSessions.length
						} duplicate sessions`
					);
					progress.sessionHistory = uniqueSessions;
					progress.totalSessions = uniqueSessions.length;
				}
			}

			// Save the cleaned up data
			localStorage.setItem("pspo-user-progress", JSON.stringify(progress));
		}
	} catch (error) {
		console.error("Failed to cleanup corrupted progress:", error);
	}
};
