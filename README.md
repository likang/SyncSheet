# SyncSheet

A powerful data synchronization tool for spreadsheets with flexible matching rules and VLOOKUP-like functionality.

## Overview

SyncSheet enables advanced data synchronization between spreadsheet sheets with:

- **Flexible matching rules** - Similar to Excel's VLOOKUP but more powerful
- **Dynamic column matching** - Match columns by headers instead of fixed positions
- **Complex conditional updates** - Multiple AND conditions for precise matching
- **Performance optimization** - Reuse matched rows across multiple column updates

## Quick Start

### Installation

```sh
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

### Usage

1. Open the SyncSheet application
2. Upload your source and target spreadsheet files
3. Configure sync rules using the visual builder or JSON editor
4. Preview the changes
5. Execute the sync operation
6. Download the updated spreadsheet

## Configuration Format

### Basic Structure

```typescript
type SyncConfig = {
  sync_type: 'update_target';
  update_targets: {
    rule_type: 'advanced';
    source_sheet: Sheet;        // Sheet name or index (1-based)
    target_sheet: Sheet;
    start_row: number;          // 1-based
    end_row: number | undefined;
    update_columns: {
      target_column: Column;	// Column in target sheet
      source_value_coord: {
        row: SourceRow;			// Row in source sheet
        column: Column;			// Column in source sheet
      };
    }[];
  }[];
};
```

### Sheet

```typescript
type Sheet = string | number; // sheet name or index (1-based)
```

### Column

```typescript
type Column =
	| string // column letter (A, B, C...)
	| number // column index (1-based)
	| {
			// the column is matched by the rules
			// row: 1-based
			// value: the value to match
			// all rules must be true for the column to be matched, false if the rules are empty or not specified
			find_in_row: [row: number, value: any][];
	  };
```

### SourceRow

```typescript
type SourceRow =
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
```

## Examples

### Example 1: Simple Column Copy

Copy column B from source to column C in target, matching by Product ID in column A:

```json
{
	"sync_type": "update_target",
	"update_targets": [
		{
			"rule_type": "advanced",
			"source_sheet": "Products",
			"target_sheet": "Inventory",
			"start_row": 2,
			"end_row": null,
			"update_columns": [
				{
					"target_column": "C",
					"source_value_coord": {
						"row": {
							"find_in_column": [
								{
									"source_column": "A",
									"target_value": { "column_for_current_row": "A" }
								}
							]
						},
						"column": "B"
					}
				}
			]
		}
	]
}
```

### Example 2: Update Multiple Columns Efficiently

Update 3 columns from the same matched source row:

```json
{
	"sync_type": "update_target",
	"update_targets": [
		{
			"rule_type": "advanced",
			"source_sheet": 1,
			"target_sheet": 1,
			"start_row": 2,
			"end_row": 100,
			"update_columns": [
				{
					"target_column": "C",
					"source_value_coord": {
						"row": {
							"find_in_column": [
								{
									"source_column": "A",
									"target_value": { "column_for_current_row": "A" }
								}
							]
						},
						"column": "B"
					}
				},
				{
					"target_column": "D",
					"source_value_coord": {
						"row": "same_with_previous_column",
						"column": "C"
					}
				},
				{
					"target_column": "E",
					"source_value_coord": {
						"row": "same_with_previous_column",
						"column": "D"
					}
				}
			]
		}
	]
}
```

### Example 3: Dynamic Column Matching

Match columns by header names instead of fixed positions:

```json
{
	"sync_type": "update_target",
	"update_targets": [
		{
			"rule_type": "advanced",
			"source_sheet": "Sales",
			"target_sheet": "Report",
			"start_row": 2,
			"end_row": null,
			"update_columns": [
				{
					"target_column": { "find_in_row": [[1, "Total Price"]] },
					"source_value_coord": {
						"row": {
							"find_in_column": [
								{
									"source_column": { "find_in_row": [[1, "ID"]] },
									"target_value": {
										"column_for_current_row": { "find_in_row": [[1, "ID"]] }
									}
								}
							]
						},
						"column": { "find_in_row": [[1, "Price"]] }
					}
				}
			]
		}
	]
}
```

### Example 4: Conditional Updates with Filters

Only update from source rows where status is "Active":

```json
{
	"sync_type": "update_target",
	"update_targets": [
		{
			"rule_type": "advanced",
			"source_sheet": "Products",
			"target_sheet": "Active Products",
			"start_row": 2,
			"end_row": null,
			"update_columns": [
				{
					"target_column": "C",
					"source_value_coord": {
						"row": {
							"find_in_column": [
								{
									"source_column": "A",
									"target_value": { "column_for_current_row": "A" }
								},
								{
									"source_column": "E",
									"target_value": { "fixed": "Active" }
								}
							]
						},
						"column": "B"
					}
				}
			]
		}
	]
}
```

## Best Practices

### Index Convention

All row and column numbers are **1-based** (like Excel), not 0-based. The first row is 1, the first column is 1 or "A".

### Use Dynamic Column Matching

When column positions might change but headers are stable, use `find_in_row` to match columns by their header values instead of fixed positions.

### Optimize with same_with_previous_column

When updating multiple columns from the same matched source row, use `"same_with_previous_column"` to avoid redundant lookups and improve performance dramatically.

### Skip Header Rows

Set `start_row: 2` to skip header rows and begin processing from the first data row.

### AND Logic for Multiple Conditions

Multiple rules in `find_in_column` or `find_in_row` work as AND conditions - **all** must match for a successful match.

### Process All Rows

Leave `end_row: undefined` (or `null`) to automatically process all rows with data, without needing to know the exact row count.

### Test with Small Datasets First

Before running on large files, test your configuration with a few rows. Set `end_row: 5` for initial testing.

### Keep Backups

Always keep backups of your original files before running sync operations. The tool generates new files with date prefixes, but it's good practice to maintain originals.

### Validate Match Results

Use the "Clear target cell if no source value found" option to easily identify rows where matching failed, helping you debug your matching rules.

## License

See [LICENSE](LICENSE) file for details.
