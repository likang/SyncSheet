<!-- Main Documentation Container -->
<div class="mx-auto max-w-5xl space-y-8 bg-white px-4 py-8 sm:px-6 lg:px-8">
	<!-- Header Section -->
	<header class="border-b-2 border-gray-300 pb-6 text-center">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">SyncSheet Rules Guide</h1>
		<p class="text-base text-gray-600">
			Complete reference for sync configuration types and best practices
		</p>
	</header>

	<!-- Overview Section -->
	<section class="border-l-4 border-gray-400 bg-gray-50 p-6">
		<h2 class="mb-3 text-xl font-semibold text-gray-900">Overview</h2>
		<p class="leading-relaxed text-gray-700">
			SyncSheet enables powerful data synchronization between spreadsheet sheets with flexible
			matching rules. The configuration system supports advanced lookups similar to Excel's VLOOKUP,
			dynamic column matching, and complex conditional updates.
		</p>
	</section>

	<!-- SyncConfig Section -->
	<section class="border border-gray-200 bg-white p-6">
		<h2 class="mb-4 border-b border-gray-300 pb-2 text-2xl font-semibold text-gray-900">
			SyncConfig
		</h2>
		<p class="mb-4 text-gray-700">
			The root configuration object that defines the synchronization operation type and targets.
		</p>

		<!-- Type Definition Box -->
		<div class="mb-4 overflow-x-auto border-l-4 border-gray-400 bg-gray-50 p-4">
			<pre class="text-sm"><code class="text-gray-800"
					>{`type SyncConfig = {
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
};`}</code
				></pre>
		</div>
	</section>

	<!-- Sheet Section -->
	<section class="border border-gray-200 bg-white p-6">
		<h2 class="mb-4 border-b border-gray-300 pb-2 text-2xl font-semibold text-gray-900">Sheet</h2>
		<p class="mb-4 text-gray-700">
			Flexible reference to a worksheet in the spreadsheet, either by name or numeric index.
		</p>

		<!-- Type Definition -->
		<div class="mb-4 overflow-x-auto border-l-4 border-gray-400 bg-gray-50 p-4">
			<pre class="text-sm"><code class="text-gray-800"
					>{`type Sheet = string | number;
// string: sheet name
// number: sheet index (1-based)`}</code
				></pre>
		</div>
	</section>

	<!-- Column Section -->
	<section class="border border-gray-200 bg-white p-6">
		<h2 class="mb-4 border-b border-gray-300 pb-2 text-2xl font-semibold text-gray-900">Column</h2>
		<p class="mb-4 text-gray-700">
			Powerful and flexible column specification supporting three methods: letter notation, numeric
			index, or dynamic matching by cell values.
		</p>

		<!-- Type Definition -->
		<div class="mb-6 overflow-x-auto border-l-4 border-gray-400 bg-gray-50 p-4">
			<pre class="text-sm"><code class="text-gray-800"
					>{`type Column = 
  | string  // Column letter: "A", "B", "C", "AA"...
  | number  // Column index: 1, 2, 3... (1-based)
  | {       // Dynamic matching
      find_in_row: [row: number, value: any][];
    };`}</code
				></pre>
		</div>
	</section>

	<!-- SourceRow Section -->
	<section class="border border-gray-200 bg-white p-6">
		<h2 class="mb-4 border-b border-gray-300 pb-2 text-2xl font-semibold text-gray-900">
			SourceRow
		</h2>
		<p class="mb-4 text-gray-700">
			Determines which row in the source sheet to read data from. Implements VLOOKUP-like
			functionality with flexible matching strategies.
		</p>

		<!-- Type Definition -->
		<div class="mb-6 overflow-x-auto border-l-4 border-gray-400 bg-gray-50 p-4">
			<pre class="text-sm"><code class="text-gray-800"
					>{`type SourceRow =
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
	  };`}</code
				></pre>
		</div>
	</section>

	<!-- Complete Example Section -->
	<section class="border-2 border-gray-300 bg-white p-6">
		<h2 class="mb-4 border-b border-gray-300 pb-2 text-2xl font-semibold text-gray-900">
			Complete Real-World Example
		</h2>
		<p class="mb-4 text-gray-700">
			Here's a comprehensive configuration demonstrating all key features:
		</p>

		<!-- Full Example Code -->
		<div class="overflow-x-auto border border-gray-200 bg-gray-50 p-4">
			<pre class="text-sm"><code class="text-gray-800"
					>{`const config: SyncConfig = {
  // Step 1: Define the sync operation type
  sync_type: 'update_target',
  
  // Step 2: Define one or more update targets
  update_targets: [
    {
      // Use advanced rule type for complex matching
      rule_type: 'advanced',
      
      // Source: where to read data from
      source_sheet: "Products",
      
      // Target: where to write data to
      target_sheet: "Inventory",
      
      // Update rows 2 onwards (row 1 is typically headers)
      start_row: 2,
      
      // undefined = process all rows until end
      end_row: undefined,
      
      // Define which columns to update and how
      update_columns: [
        // First column update: Match by Product ID
        {
          // Update column C in target
          target_column: "C",
          
          source_value_coord: {
            // Find source row by matching Product IDs
            row: {
              find_in_column: [{
                // Look in source column A
                source_column: "A",
                // Match against target's column A (same row)
                target_value: { column_for_current_row: "A" }
              }]
            },
            // Once row is found, get value from source column B
            column: "B"
          }
        },
        
        // Second column update: Reuse previous match
        {
          // Update column D in target
          target_column: "D",
          
          source_value_coord: {
            // Efficiently reuse the row we just found
            row: "same_with_previous_column",
            // Get value from source column C
            column: "C"
          }
        },
        
        // Third column update: Dynamic column matching
        {
          // Find target column where row 1 = "Price"
          target_column: {
            find_in_row: [[1, "Price"]]
          },
          
          source_value_coord: {
            // Reuse the same matched row again
            row: "same_with_previous_column",
            // Find source column where row 1 = "Unit Price"
            column: {
              find_in_row: [[1, "Unit Price"]]
            }
          }
        },
        
        // Fourth column update: Multiple match conditions
        {
          target_column: "E",
          
          source_value_coord: {
            // Find source row matching BOTH conditions
            row: {
              find_in_column: [
                {
                  // Condition 1: Column A matches target's column A
                  source_column: "A",
                  target_value: { column_for_current_row: "A" }
                },
                {
                  // Condition 2: Column F must equal "Active"
                  source_column: "F",
                  target_value: { fixed: "Active" }
                }
              ]
            },
            column: "D"
          }
        }
      ]
    }
    // You can add more update_targets here for other sheets
  ]
};`}</code
				></pre>
		</div>

		<!-- Explanation Box -->
		<div class="mt-4 border-l-4 border-gray-400 bg-gray-50 p-4">
			<h4 class="mb-2 font-semibold text-gray-900">What This Configuration Does:</h4>
			<ol class="list-decimal space-y-2 pl-5 text-sm text-gray-700">
				<li>
					Syncs data from the <strong>"Products"</strong> sheet to the
					<strong>"Inventory"</strong> sheet
				</li>
				<li>Processes rows starting from row 2 (skipping headers in row 1)</li>
				<li>
					<strong>Column C:</strong> For each target row, finds the matching source row by comparing
					Product IDs in column A, then copies the value from source column B
				</li>
				<li>
					<strong>Column D:</strong> Uses the same matched source row (efficient!), copies from source
					column C
				</li>
				<li>
					<strong>Dynamic "Price" column:</strong> Finds the target column labeled "Price" and updates
					it with the source column labeled "Unit Price" (handles column reordering)
				</li>
				<li>
					<strong>Column E:</strong> Demonstrates multiple conditions - finds source row where column
					A matches AND column F equals "Active"
				</li>
			</ol>
		</div>
	</section>

	<!-- Tips & Best Practices Section -->
	<section class="border border-gray-300 bg-gray-50 p-6">
		<h2 class="mb-4 border-b border-gray-300 pb-2 text-2xl font-semibold text-gray-900">
			Tips & Best Practices
		</h2>

		<div class="space-y-3">
			<div class="border-l-4 border-gray-400 bg-white p-3">
				<h3 class="mb-1 text-sm font-semibold text-gray-900">Index Convention</h3>
				<p class="text-sm leading-relaxed text-gray-700">
					All row and column numbers are <strong>1-based</strong> (like Excel), not 0-based. The first
					row is 1, the first column is 1 or "A".
				</p>
			</div>

			<div class="border-l-4 border-gray-400 bg-white p-3">
				<h3 class="mb-1 text-sm font-semibold text-gray-900">Use Dynamic Column Matching</h3>
				<p class="text-sm leading-relaxed text-gray-700">
					When column positions might change but headers are stable, use
					<code class="rounded bg-gray-200 px-2 py-1 text-gray-800">find_in_row</code>
					to match columns by their header values instead of fixed positions.
				</p>
			</div>

			<div class="border-l-4 border-gray-400 bg-white p-3">
				<h3 class="mb-1 text-sm font-semibold text-gray-900">
					Optimize with same_with_previous_column
				</h3>
				<p class="text-sm leading-relaxed text-gray-700">
					When updating multiple columns from the same matched source row, use
					<code class="rounded bg-gray-200 px-2 py-1 text-gray-800"
						>"same_with_previous_column"</code
					>
					to avoid redundant lookups and improve performance dramatically.
				</p>
			</div>

			<div class="border-l-4 border-gray-400 bg-white p-3">
				<h3 class="mb-1 text-sm font-semibold text-gray-900">Skip Header Rows</h3>
				<p class="text-sm leading-relaxed text-gray-700">
					Set <code class="rounded bg-gray-200 px-2 py-1 text-gray-800">start_row: 2</code> to skip header
					rows and begin processing from the first data row.
				</p>
			</div>

			<div class="border-l-4 border-gray-400 bg-white p-3">
				<h3 class="mb-1 text-sm font-semibold text-gray-900">AND Logic for Multiple Conditions</h3>
				<p class="text-sm leading-relaxed text-gray-700">
					Multiple rules in <code class="rounded bg-gray-200 px-2 py-1 text-gray-800"
						>find_in_column</code
					>
					or
					<code class="rounded bg-gray-200 px-2 py-1 text-gray-800">find_in_row</code>
					work as AND conditions - <strong>all</strong> must match for a successful match.
				</p>
			</div>

			<div class="border-l-4 border-gray-400 bg-white p-3">
				<h3 class="mb-1 text-sm font-semibold text-gray-900">Process All Rows</h3>
				<p class="text-sm leading-relaxed text-gray-700">
					Leave <code class="rounded bg-gray-200 px-2 py-1 text-gray-800">end_row: undefined</code>
					to automatically process all rows with data, without needing to know the exact row count.
				</p>
			</div>

			<div class="border-l-4 border-gray-400 bg-white p-3">
				<h3 class="mb-1 text-sm font-semibold text-gray-900">Test with Small Datasets First</h3>
				<p class="text-sm leading-relaxed text-gray-700">
					Before running on large files, test your configuration with a few rows to ensure the
					matching logic works correctly. Set
					<code class="rounded bg-gray-200 px-2 py-1 text-gray-800">end_row: 5</code>
					for initial testing.
				</p>
			</div>

			<div class="border-l-4 border-gray-400 bg-white p-3">
				<h3 class="mb-1 text-sm font-semibold text-gray-900">Keep Backups</h3>
				<p class="text-sm leading-relaxed text-gray-700">
					Always keep backups of your original files before running sync operations. The tool
					generates new files with date prefixes, but it's good practice to maintain originals.
				</p>
			</div>

			<div class="border-l-4 border-gray-400 bg-white p-3">
				<h3 class="mb-1 text-sm font-semibold text-gray-900">Use Descriptive Sheet Names</h3>
				<p class="text-sm leading-relaxed text-gray-700">
					Reference sheets by name rather than index when possible for better readability and
					maintainability of your configuration files.
				</p>
			</div>

			<div class="border-l-4 border-gray-400 bg-white p-3">
				<h3 class="mb-1 text-sm font-semibold text-gray-900">Validate Match Results</h3>
				<p class="text-sm leading-relaxed text-gray-700">
					Use the "Clear target cell if no source value found" option to easily identify rows where
					matching failed, helping you debug your matching rules.
				</p>
			</div>
		</div>
	</section>

	<!-- Additional Examples Section -->
	<section class="border border-gray-200 bg-white p-6">
		<h2 class="mb-4 border-b border-gray-300 pb-2 text-2xl font-semibold text-gray-900">
			Additional Examples
		</h2>

		<!-- Example: Simple Update -->
		<div class="mb-6 border-l-4 border-gray-400 bg-gray-50 p-4">
			<h3 class="mb-2 font-semibold text-gray-900">Example 1: Simple Column Copy</h3>
			<p class="mb-3 text-sm text-gray-700">
				Copy column B from source to column C in target, matching rows by column A (Product ID):
			</p>
			<pre class="overflow-x-auto rounded bg-white p-3 text-xs"><code class="text-gray-800"
					>{`{
  sync_type: 'update_target',
  update_targets: [{
    rule_type: 'advanced',
    source_sheet: "Products",
    target_sheet: "Inventory",
    start_row: 2,
    end_row: undefined,
    update_columns: [{
      target_column: "C",
      source_value_coord: {
        row: {
          find_in_column: [{
            source_column: "A",
            target_value: { column_for_current_row: "A" }
          }]
        },
        column: "B"
      }
    }]
  }]
}`}</code
				></pre>
		</div>

		<!-- Example: Multiple Columns -->
		<div class="mb-6 border-l-4 border-gray-400 bg-gray-50 p-4">
			<h3 class="mb-2 font-semibold text-gray-900">
				Example 2: Update Multiple Columns Efficiently
			</h3>
			<p class="mb-3 text-sm text-gray-700">
				Update 3 target columns (C, D, E) from the same matched source row:
			</p>
			<pre class="overflow-x-auto rounded bg-white p-3 text-xs"><code class="text-gray-800"
					>{`{
  sync_type: 'update_target',
  update_targets: [{
    rule_type: 'advanced',
    source_sheet: 1,  // First sheet
    target_sheet: 1,
    start_row: 2,
    end_row: 100,  // Only update first 100 rows
    update_columns: [
      {
        target_column: "C",
        source_value_coord: {
          row: {
            find_in_column: [{
              source_column: "A",
              target_value: { column_for_current_row: "A" }
            }]
          },
          column: "B"
        }
      },
      {
        target_column: "D",
        source_value_coord: {
          row: "same_with_previous_column",  // Reuse!
          column: "C"
        }
      },
      {
        target_column: "E",
        source_value_coord: {
          row: "same_with_previous_column",  // Reuse again!
          column: "D"
        }
      }
    ]
  }]
}`}</code
				></pre>
		</div>

		<!-- Example: Dynamic Headers -->
		<div class="mb-6 border-l-4 border-gray-400 bg-gray-50 p-4">
			<h3 class="mb-2 font-semibold text-gray-900">
				Example 3: Dynamic Column Matching with Headers
			</h3>
			<p class="mb-3 text-sm text-gray-700">
				Match columns by their header names instead of fixed positions:
			</p>
			<pre class="overflow-x-auto rounded bg-white p-3 text-xs"><code class="text-gray-800"
					>{`{
  sync_type: 'update_target',
  update_targets: [{
    rule_type: 'advanced',
    source_sheet: "Sales",
    target_sheet: "Report",
    start_row: 2,
    end_row: undefined,
    update_columns: [{
      // Find target column with header "Total Price"
      target_column: {
        find_in_row: [[1, "Total Price"]]
      },
      source_value_coord: {
        row: {
          find_in_column: [{
            // Match by ID column
            source_column: { find_in_row: [[1, "ID"]] },
            target_value: {
              column_for_current_row: { find_in_row: [[1, "ID"]] }
            }
          }]
        },
        // Find source column with header "Price"
        column: { find_in_row: [[1, "Price"]] }
      }
    }]
  }]
}`}</code
				></pre>
		</div>

		<!-- Example: Filtered Update -->
		<div class="border-l-4 border-gray-400 bg-gray-50 p-4">
			<h3 class="mb-2 font-semibold text-gray-900">Example 4: Conditional Update with Filters</h3>
			<p class="mb-3 text-sm text-gray-700">
				Only update from source rows where status is "Active":
			</p>
			<pre class="overflow-x-auto rounded bg-white p-3 text-xs"><code class="text-gray-800"
					>{`{
  sync_type: 'update_target',
  update_targets: [{
    rule_type: 'advanced',
    source_sheet: "Products",
    target_sheet: "Active Products",
    start_row: 2,
    end_row: undefined,
    update_columns: [{
      target_column: "C",
      source_value_coord: {
        row: {
          find_in_column: [
            {
              // Match by Product ID
              source_column: "A",
              target_value: { column_for_current_row: "A" }
            },
            {
              // Filter: only "Active" products
              source_column: "E",
              target_value: { fixed: "Active" }
            }
          ]
        },
        column: "B"
      }
    }]
  }]
}`}</code
				></pre>
		</div>
	</section>
</div>
