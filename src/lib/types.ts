export type SyncConfig = {
	sync_type: 'update_target'; // update the target file with the source file
	update_targets: {
		rule_type: 'advanced';
		source_sheet: Sheet;
		target_sheet: Sheet;
		start_row: number; // 1-based
		end_row: number | undefined; // 1-based
		update_columns: {
			target_column: Column; // column in target sheet
			source_value_coord: {
				row: SourceRow; // row in source sheet
				column: Column; // column in source sheet
			};
		}[];
	}[];
};

export type Sheet = string | number; // sheet name or index (1-based)

export type Column =
	| string // column letter (A, B, C...)
	| number // column index (1-based)
	| {
			// the column is matched by the rules
			// row: 1-based
			// value: the value to match
			// all rules must be true for the column to be matched, false if the rules are empty or not specified
			find_in_row: [row: number, value: any][];
	  };

// find source row by matching the target value in source column, like vlookup in excel
export type SourceRow =
	| 'same_with_previous_column' // the source row is the same row found previously
	| {
			find_in_column: {
				// which column to match the value in the source sheet
				source_column: Column;

				// the target value to match in the source column
				target_value:
					| { column_for_current_row: Column } // target value in the same row as current target matching cell
					| { row_for_current_column: number } // target value in the same column as current target matching cell
					| { fixed: any }; // target value is a fixed value
			}[];
	  };
