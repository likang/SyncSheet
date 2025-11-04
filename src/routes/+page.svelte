<script lang="ts">
	import FileSpreadsheetIcon from 'lucide-svelte/icons/file-spreadsheet';
	import TargetIcon from 'lucide-svelte/icons/target';
	import CodeXmlIcon from 'lucide-svelte/icons/code-xml';
	import DownloadIcon from 'lucide-svelte/icons/download';
	import ExcelJS from 'exceljs';
	import type { Column, Sheet, SourceRow, SyncConfig } from '$lib/types';

	let sourceFile = $state.raw<FileList | undefined>(undefined);
	let targetFiles = $state.raw<FileList | undefined>(undefined);
	let fillEmptyOnNoMatch = $state<boolean>(true);
	let syncResult = $state<
		{ targetFileName: string; updatedCells: number; success: boolean; errorMessage?: string }[]
	>([]);

	let ruleText = $state.raw<string>('');

	let sourceWorkbook = $state.raw<ExcelJS.Workbook | undefined>(undefined);

	$effect(() => {
		if (sourceFile && sourceFile.length > 0) {
			loadWorkbook(sourceFile![0]).then((workbook) => {
				sourceWorkbook = workbook;
			});
		}
	});

	async function loadWorkbook(file: File): Promise<ExcelJS.Workbook | undefined> {
		const buffer = await file.arrayBuffer();
		if (!buffer) return undefined;
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer);
		return workbook;
	}

	function resolveSheet(workbook: ExcelJS.Workbook, sheet: Sheet): ExcelJS.Worksheet | undefined {
		if (typeof sheet === 'string') {
			return workbook.getWorksheet(sheet);
		}
		return workbook.worksheets[sheet - 1];
	}

	/** Converts Excel column letter (A, B, C...) to 1-based index (1, 2, 3...) */
	function columnLetterToNumber(letter: string): number {
		let column = 0;
		const length = letter.length;
		for (let i = 0; i < length; i++) {
			column += (letter.toUpperCase().charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
		}
		return column;
	}

	function resolveColumnIndex(worksheet: ExcelJS.Worksheet, column: Column): number {
		if (typeof column === 'number') {
			return column;
		}

		if (typeof column === 'string') {
			return columnLetterToNumber(column);
		}

		if (column.type === 'match' && column.rules && column.rules.length > 0) {
			for (var columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex++) {
				var matched = true;
				for (const rule of column.rules) {
					if (worksheet.getCell(rule.row, columnIndex).value !== rule.value) {
						matched = false;
						break;
					}
				}
				if (matched) {
					console.log(`Resolved column index ${columnIndex} for column ${JSON.stringify(column)}`);
					return columnIndex;
				}
			}
		}

		return 0; // Not found
	}

	function resolveSourceRowIndex(
		targetWorksheet: ExcelJS.Worksheet,
		targetRowNumber: number,
		targetColumnNumber: number,
		rowDef: Exclude<SourceRow, 'same_with_previous_column'>,
		sourceWorksheet: ExcelJS.Worksheet
	): number {
		if (rowDef.type === 'match' && rowDef.rules && rowDef.rules.length > 0) {
			for (let rowNumber = 1; rowNumber <= sourceWorksheet.rowCount; rowNumber++) {
				const row = sourceWorksheet.getRow(rowNumber);

				var matched = true;

				for (const rule of rowDef.rules) {
					let targetMatchValue: ExcelJS.CellValue | undefined = undefined;
					const targetMatchValueType = rule.target_value.type;
					if (targetMatchValueType === 'current_row') {
						targetMatchValue = targetWorksheet.getCell(
							targetRowNumber,
							rule.target_value.column as number
						).value;
						if (!targetMatchValue) {
							console.warn(
								`Resolve source row failed, target value at (${targetRowNumber}, ${rule.target_value.column as number}) is empty.`
							);
							return 0;
						}
					} else if (targetMatchValueType === 'current_column') {
						targetMatchValue = targetWorksheet.getCell(
							rule.target_value.row,
							targetColumnNumber
						).value;
						if (!targetMatchValue) {
							console.warn(
								`Resolve source row failed, target value at (${rule.target_value.row}, ${targetColumnNumber}) is empty.`
							);
							return 0;
						}
					} else if (targetMatchValueType === 'fixed') {
						targetMatchValue = rule.target_value.value;
						if (!targetMatchValue) {
							console.warn(`Resolve source row failed, fixed target value in rule is empty.`);
							return 0;
						}
					}
					if (targetMatchValue !== row.getCell(rule.source_column as number).value) {
						matched = false;
						break;
					}
				}
				if (matched) {
					return rowNumber;
				}
			}
		}

		return 0; // 0 means not found
	}

	/** Helper function to read all rules from the UI and validate them. */
	function getRulesFromUI(): SyncConfig {
		let rules;
		try {
			rules = JSON.parse(ruleText);
		} catch (e) {
			throw new Error('Invalid JSON format. Please check your rules syntax.');
		}
		return rules;
	}

	function getTargetConfigWithResolvedColumnIndexes({
		syncConfig,
		targetWorksheet,
		sourceWorksheet,
		targetFileName
	}: {
		syncConfig: SyncConfig;
		targetWorksheet: ExcelJS.Worksheet;
		sourceWorksheet: ExcelJS.Worksheet;
		targetFileName: string;
	}): typeof syncConfig.update_target.target {
		const targetConfig = structuredClone(syncConfig.update_target.target);
		for (const updateRule of targetConfig.update_columns) {
			var columnStr = JSON.stringify(updateRule.column);
			updateRule.column = resolveColumnIndex(targetWorksheet, updateRule.column);
			if (updateRule.column <= 0) {
				throw new Error(
					`Target column match failed for rule ${columnStr} in ${targetFileName}. Check your rules.`
				);
			}
			columnStr = JSON.stringify(updateRule.source_value_coord.column);
			updateRule.source_value_coord.column = resolveColumnIndex(
				sourceWorksheet,
				updateRule.source_value_coord.column
			);
			if (updateRule.source_value_coord.column <= 0) {
				throw new Error(
					`Source column match failed for rule ${columnStr} in source file. Check your rules.`
				);
			}
			if (updateRule.source_value_coord.row !== 'same_with_previous_column') {
				if (updateRule.source_value_coord.row.type === 'match') {
					for (const rule of updateRule.source_value_coord.row.rules) {
						columnStr = JSON.stringify(rule.source_column);
						rule.source_column = resolveColumnIndex(sourceWorksheet, rule.source_column);
						if (rule.source_column <= 0) {
							throw new Error(
								`Source column match failed for rule ${columnStr} in source file. Check your rules.`
							);
						}
						if (rule.target_value.type === 'current_row') {
							columnStr = JSON.stringify(rule.target_value.column);
							rule.target_value.column = resolveColumnIndex(
								targetWorksheet,
								rule.target_value.column
							);
							if (rule.target_value.column <= 0) {
								throw new Error(
									`Target column match failed for rule ${columnStr} in ${targetFileName}. Check your rules.`
								);
							}
						}
					}
				}
			}
		}
		return targetConfig;
	}

	/** Applies the rules and triggers downloads for all target files. */
	async function runSync() {
		if (!sourceWorkbook) {
			alert('Please upload a Source file first.');
			return;
		}
		if (targetFiles?.length === 0) {
			alert('Please upload at least one Target file first.');
			return;
		}

		let syncConfig: SyncConfig;
		try {
			syncConfig = getRulesFromUI();
		} catch (e) {
			alert((e as Error).message);
			return;
		}

		const sourceConfig = syncConfig.update_target.source;

		const sourceWorksheet = resolveSheet(sourceWorkbook, sourceConfig.sheet);
		if (!sourceWorksheet) {
			throw new Error(
				`Could not find the specified source sheet in ${sourceFile![0].name}. Check your rules.`
			);
		}

		// 2. Iterate through each target file, process it, and trigger download
		for (const targetFile of targetFiles!) {
			let fileUpdatedCells = 0;

			try {
				// Load Target Workbook
				const buffer = await targetFile.arrayBuffer();
				const workbook = new ExcelJS.Workbook();
				await workbook.xlsx.load(buffer);

				// Get Target Worksheet
				const targetWorksheet = resolveSheet(workbook, syncConfig.update_target.target.sheet);
				if (!targetWorksheet) {
					throw new Error(
						`Could not find the specified target sheet in ${targetFile.name}. Check your rules.`
					);
				}

				const targetConfig = getTargetConfigWithResolvedColumnIndexes({
					syncConfig,
					targetWorksheet,
					sourceWorksheet,
					targetFileName: targetFile.name
				});

				// 3. Iterate through target rows and apply rules IN PLACE
				for (
					let rowNumber = targetConfig.start_row;
					rowNumber <= (targetConfig.end_row || targetWorksheet.rowCount);
					rowNumber++
				) {
					let lastRuleSourceRow: number = 0; // Memory for "same_with_previous_column" within the row

					for (const updateRule of targetConfig.update_columns) {
						// A. Resolve Source Row
						const sourceRowDef = updateRule.source_value_coord.row;
						let sourceRowIndex;

						if (sourceRowDef === 'same_with_previous_column') {
							sourceRowIndex = lastRuleSourceRow;
						} else {
							sourceRowIndex = resolveSourceRowIndex(
								targetWorksheet,
								rowNumber,
								updateRule.column as number,
								sourceRowDef,
								sourceWorksheet
							);
							// This is the crucial step: store the resolved row for subsequent rules
							lastRuleSourceRow = sourceRowIndex;
						}

						if (sourceRowIndex <= 0) {
							// not found
							if (fillEmptyOnNoMatch) {
								targetWorksheet.getRow(rowNumber).getCell(updateRule.column as number).value = null;
							} else {
								// Source row match failed for this rule, skip update for this column/row.
								console.warn(
									`Skipped: (${rowNumber}, ${updateRule.column}) in ${targetFile.name}, can not find matched row in source file.`
								);
							}
						} else {
							const sourceCell = sourceWorksheet
								.getRow(sourceRowIndex)
								.getCell(updateRule.source_value_coord.column as number);
							const targetCell = targetWorksheet
								.getRow(rowNumber)
								.getCell(updateRule.column as number);

							targetCell.value = sourceCell.value;
							fileUpdatedCells++;
						}
					}
				}

				syncResult.push({
					targetFileName: targetFile.name,
					updatedCells: fileUpdatedCells,
					success: true
				});
				// 4. Convert the updated workbook back to a buffer
				const newBuffer = await workbook.xlsx.writeBuffer();

				// 5. Trigger download for this file
				downloadFile(newBuffer, `Advanced_Updated_${targetFile.name}`);
			} catch (err) {
				syncResult.push({
					targetFileName: targetFile.name,
					updatedCells: 0,
					success: false,
					errorMessage: (err as Error).message
				});
			}
		}
	}

	/** Downloads a generated Excel file from a buffer. */
	function downloadFile(buffer: ExcelJS.Buffer, fileName: string) {
		try {
			const blob = new Blob([buffer], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			});
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.style.display = 'none';
			a.href = url;
			a.download = fileName;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			alert(`Error triggering download ${fileName}: ${error}`);
		}
	}
</script>

<div class="mx-auto my-8 max-w-4xl rounded-2xl bg-white p-6 shadow-xl lg:p-10">
	<header class="mb-10 text-center">
		<h1 class="mb-2 text-4xl font-extrabold text-blue-600">SyncSheet</h1>
		<p class="text-lg text-gray-500">Sync your spreadsheets with ease.</p>
	</header>

	<!-- Step 1: File Uploads -->
	<div class="mb-8 grid gap-6 border-b border-gray-200 pb-8 md:grid-cols-2">
		<div class="rounded-xl border border-blue-200 bg-gray-50 p-5">
			<h2 class="mb-3 flex items-center text-xl font-semibold text-gray-700">
				<FileSpreadsheetIcon class="mr-2 h-6 w-6 text-blue-500" />
				1. Upload Source File
			</h2>
			<input
				bind:files={sourceFile}
				type="file"
				accept=".xlsx, .xls"
				class="block w-full text-sm text-gray-500
				file:mr-4 file:rounded-full file:border-0
				file:bg-blue-50 file:px-4
				file:py-2 file:text-sm
				file:font-semibold file:text-blue-700
				hover:file:bg-blue-100
			"
			/>
		</div>

		<div class="rounded-xl border border-blue-200 bg-gray-50 p-5">
			<h2 class="mb-3 flex items-center text-xl font-semibold text-gray-700">
				<TargetIcon class="mr-2 h-6 w-6 text-blue-500" />
				2. Upload Target File(s)
			</h2>
			<input
				bind:files={targetFiles}
				type="file"
				accept=".xlsx, .xls"
				multiple
				class="block w-full text-sm text-gray-500
				file:mr-4 file:rounded-full file:border-0
				file:bg-blue-50 file:px-4
				file:py-2 file:text-sm
				file:font-semibold file:text-blue-700
				hover:file:bg-blue-100
			"
			/>
		</div>
	</div>

	<!-- Step 2: Rule Configuration -->
	<div class="mb-8 border-b border-gray-200 pb-8">
		<h2 class="mb-4 flex items-center text-xl font-semibold text-gray-700">
			<CodeXmlIcon class="mr-2 h-6 w-6 text-blue-500" />
			3. Define Rules
		</h2>

		<div class="mb-4">
			<textarea
				bind:value={ruleText}
				rows="10"
				class="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:border-blue-500 focus:ring-blue-500"
			></textarea>
			<div class="flex items-center">
				<input
					id="fill-empty-on-no-match"
					type="checkbox"
					bind:checked={fillEmptyOnNoMatch}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<label for="fill-empty-on-no-match" class="ml-3 text-sm font-medium text-gray-700">
					Clear target cell if not found source value.
				</label>
			</div>
		</div>
	</div>

	<!-- Step 3: Run -->
	<div>
		<button
			class="flex w-full items-center justify-center gap-2
			rounded-xl bg-blue-600 px-6 py-3 text-lg font-bold text-white
			shadow-lg transition hover:bg-blue-700 hover:shadow-xl focus:ring-4 focus:ring-blue-300 focus:outline-none"
			onclick={runSync}
		>
			<DownloadIcon class="mr-2 inline h-5 w-5" />
			4. Run Sync & Download
		</button>
	</div>

	<!-- Status Message Box -->
	<div>
		{#each syncResult as result}
			<div class="mb-4 rounded-lg border border-gray-200 p-4">
				<h3 class="text-lg font-semibold text-gray-700">{result.targetFileName}</h3>
				<p class="text-sm text-gray-500">{result.updatedCells} cells updated</p>
				{#if result.success}
					<p class="text-green-500">Success</p>
				{:else}
					<p class="text-red-500">Error: {result.errorMessage}</p>
				{/if}
			</div>
		{/each}
	</div>
</div>
