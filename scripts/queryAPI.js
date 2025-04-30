#!/usr/bin/env node

/**
 * Direct API Query Script
 * 
 * This script queries the external Ilkmaar API directly to fetch data.
 * It allows easy access to player data without going through GraphQL.
 * 
 * Usage: 
 *   node queryAPI.js --endpoint=data-actions --worldId=world_123 [--limit=100]
 */

import { program } from 'commander';
import axios from 'axios';
import Table from 'cli-table3';
import chalk from 'chalk';
import fs from 'fs';

// Set up command line options
program
  .option('--endpoint <endpoint>', 'API endpoint to query (required)', 'data-actions')
  .option('--worldId <worldId>', 'World ID to filter by (required)')
  .option('--playerId <playerId>', 'Player ID to filter by (optional)')
  .option('--limit <limit>', 'Maximum number of results to return', '100')
  .option('--output <format>', 'Output format: table, json, or csv', 'table')
  .option('--saveFile <filename>', 'Save results to file (optional)')
  .parse(process.argv);

const options = program.opts();

// Validate required parameters
if (!options.endpoint) {
  console.error(chalk.red('Error: endpoint is required'));
  process.exit(1);
}

if (!options.worldId) {
  console.error(chalk.red('Error: worldId is required'));
  process.exit(1);
}

// API base URL
const API_BASE_URL = 'https://ilkmaar-data.fablevision-dev.com/api';

/**
 * Fetch data from the API
 */
async function fetchFromAPI() {
  try {
    // Construct the URL
    const url = `${API_BASE_URL}/${options.endpoint}/`;
    
    // Configure parameters
    const params = {
      world_id: options.worldId,
      limit: parseInt(options.limit, 10),
    };
    
    // Add optional filters if provided
    if (options.playerId) params.player_id = options.playerId;
    
    console.log(chalk.blue(`Fetching from ${url}`));
    console.log(chalk.gray(`Parameters: ${JSON.stringify(params)}`));
    
    // Make the request
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    console.error(chalk.red('Error fetching data:'), error.message);
    if (error.response) {
      console.error(chalk.red('Response status:'), error.response.status);
      console.error(chalk.red('Response data:'), error.response.data);
    }
    throw error;
  }
}

/**
 * Format results as a table
 */
function formatAsTable(data) {
  // If no results, return a message
  if (!data.results || data.results.length === 0) {
    return 'No results found';
  }
  
  // Get column names from the first result
  const firstItem = data.results[0];
  const columns = Object.keys(firstItem).filter(key => 
    // Exclude overly complex columns
    !Array.isArray(firstItem[key]) && 
    typeof firstItem[key] !== 'object'
  );
  
  // Create table with headers
  const table = new Table({
    head: columns.map(col => chalk.cyan(col)),
    colWidths: columns.map(col => 
      col === 'id' ? 12 : // ID column
      col.includes('time') ? 22 : // Timestamp columns
      Math.min(20, col.length + 5) // Other columns
    )
  });
  
  // Add rows to the table
  data.results.slice(0, 20).forEach(item => {
    const row = columns.map(col => {
      // Format based on column type
      if (col.includes('time') && item[col] && item[col].length > 10) {
        // Format timestamps
        return new Date(item[col]).toLocaleString();
      }
      return String(item[col] ?? '-');
    });
    table.push(row);
  });
  
  // Add message if results were truncated
  let tableStr = table.toString();
  if (data.results.length > 20) {
    tableStr += `\n${chalk.yellow(`... ${data.results.length - 20} more rows (showing first 20 only)`)}`;
  }
  
  return tableStr;
}

/**
 * Format results as CSV
 */
function formatAsCSV(data) {
  // If no results, return headers only
  if (!data.results || data.results.length === 0) {
    return 'No results found';
  }
  
  // Get column names from the first result
  const columns = Object.keys(data.results[0]);
  
  // Create CSV headers
  const csvRows = [columns.join(',')];
  
  // Add rows to CSV
  data.results.forEach(item => {
    const row = columns.map(col => {
      const val = item[col];
      
      // Format based on type and escape strings
      if (val === null || val === undefined) {
        return '';
      } else if (typeof val === 'string') {
        // Escape quotes and wrap in quotes
        return `"${val.replace(/"/g, '""')}"`;
      } else if (typeof val === 'object') {
        // Stringify objects and wrap in quotes
        return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      }
      
      return val;
    });
    
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

/**
 * Main function
 */
async function main() {
  try {
    // Fetch data from API
    const data = await fetchFromAPI();
    
    // Output basic stats
    console.log(chalk.green(`Found ${data.count} results`));
    
    // Format output
    let output;
    switch (options.output.toLowerCase()) {
      case 'json':
        output = JSON.stringify(data, null, 2);
        console.log(output);
        break;
      case 'csv':
        output = formatAsCSV(data);
        console.log(output);
        break;
      case 'table':
      default:
        output = formatAsTable(data);
        console.log(output);
        
        // Show pagination info
        if (data.next) {
          console.log(chalk.yellow(`\nMore results available. Next page: ${data.next}`));
        }
        break;
    }
    
    // Save to file if requested
    if (options.saveFile) {
      fs.writeFileSync(options.saveFile, output);
      console.log(chalk.green(`\nResults saved to ${options.saveFile}`));
    }
  } catch (error) {
    console.error(chalk.red('Script execution failed:'), error);
    process.exit(1);
  }
}

// Run the script
main();