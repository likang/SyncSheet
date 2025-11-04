export type SyncConfig = {
	sync_type: 'update_target'; // update the target file with the source file
	update_target: {
		rule_type: 'advanced';
		source: {
			sheet: Sheet;
		};
		target: {
			sheet: Sheet;
			start_row: number; // 1-based
			end_row: number | undefined; // 1-based
			update_columns: {
				column: Column; // column in target sheet
				source_value_coord: {
					row: SourceRow; // row in source sheet
					column: Column; // column in source sheet
				};
			}[];
		};
	};
};

export type Sheet = string | number; // sheet name or index (1-based)

export type Column =
	| string // column letter (A, B, C...)
	| number // column index (1-based)
	| {
			type: 'match'; // the column is matched by the rules
			rules: {
				row: number; // 1-based
				value: any; // the value to match
			}[]; // all rules must be true for the column to be matched, false if the rules are empty or not specified
	  };

// find source row by matching the target value in source column, like vlookup in excel
export type SourceRow =
	| 'same_with_previous_column' // the source row is the same row found previously
	| {
			type: 'match'; // the source row is matched by the rules
			rules: {
				source_column: Column; // which column to match the value in the source sheet
				target_value: // the target value to match in the source column
				| {
							type: 'current_row'; // target value in the same row as current target matching cell
							column: Column; // column in target sheet
					  }
					| {
							type: 'current_column'; // target value in the same column as current target matching cell
							row: number; // 1-based, the row to match the value in current target column
					  }
					| {
							type: 'fixed'; // target value is a fixed value
							value: any;
					  };
			}[];
	  };
