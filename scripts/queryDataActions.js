#!/usr/bin/env node

/**
 * Data Actions Query Script
 * 
 * This script fetches data actions for players in a specific world
 * and displays the results in a formatted table.
 * 
 * Usage: 
 *   node queryDataActions.js --worldId=world_123 [--limit=100] [--dataActionType=filter]
 */

import { program } from 'commander';
import axios from 'axios';
import dotenv from 'dotenv';
import Table from 'cli-table3';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Set up command line options
program
  .option('--worldId <worldId>', 'World ID to analyze (required)')
  .option('--playerId <playerId>', 'Filter by player ID (optional)')
  .option('--dataActionType <type>', 'Filter by data action type (optional)')
  .option('--limit <limit>', 'Maximum number of results to return', '100')
  .option('--output <format>', 'Output format: table, json, or csv', 'table')
  .parse(process.argv);

const options = program.opts();

// Validate required parameters
if (!options.worldId) {
  console.error(chalk.red('Error: worldId is required'));
  process.exit(1);
}

// API endpoint and GraphQL query
const API_URL = process.env.GRAPHQL_API_URL || 'http://localhost:4000/graphql';
const API_KEY = process.env.GRAPHQL_API_KEY;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

// GraphQL query for data actions
const DATA_ACTIONS_QUERY = `
  query GetDataActions($worldId: String!, $playerId: String, $dataActionType: String, $limit: Int) {
    dataActions(
      worldId: $worldId, 
      playerId: $playerId, 
      dataActionType: $dataActionType, 
      limit: $limit
    ) {
      count
      results {
        id
        player_id
        player_name
        timestamp
        data_action_type
        data_table_name
        data_action_axis
        data_action_variable
        data_action_source
      }
    }
  }
`;

/**
 * Execute the GraphQL query against the API
 */
async function fetchDataActions() {
  try {
    // Configure headers
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add authorization if available
    if (AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    } else if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }
    
    // Set up query variables
    const variables = {
      worldId: options.worldId,
      limit: parseInt(options.limit, 10),
    };
    
    // Add optional filters if provided
    if (options.playerId) variables.playerId = options.playerId;
    if (options.dataActionType) variables.dataActionType = options.dataActionType;
    
    // Log authentication status
    if (!headers['Authorization']) {
      console.log(chalk.yellow('Warning: No authorization token provided'));
      console.log(chalk.gray('Set AUTH_TOKEN in your .env file for authenticated requests'));
    }
    
    console.log(chalk.blue(`Fetching data actions for world: ${options.worldId}`));
    
    // Make the GraphQL request
    const response = await axios.post(
      API_URL,
      {
        query: DATA_ACTIONS_QUERY,
        variables,
      },
      { headers }
    );
    
    // Check for errors
    if (response.data.errors) {
      console.error(chalk.red('GraphQL Errors:'), response.data.errors);
      throw new Error('GraphQL query failed');
    }
    
    return response.data.data.dataActions;
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
 * Format the data actions as a table
 */
function formatAsTable(dataActions) {
  const table = new Table({
    head: [
      chalk.cyan('Player'),
      chalk.cyan('Time'),
      chalk.cyan('Type'),
      chalk.cyan('Table'),
      chalk.cyan('Variable'),
      chalk.cyan('Source')
    ],
    colWidths: [20, 20, 15, 20, 20, 20]
  });
  
  dataActions.results.forEach(action => {
    table.push([
      chalk.green(action.player_name || action.player_id),
      new Date(action.timestamp).toLocaleString(),
      action.data_action_type,
      action.data_table_name,
      action.data_action_variable || '-',
      action.data_action_source || '-'
    ]);
  });
  
  return table.toString();
}

/**
 * Format the data actions as CSV
 */
function formatAsCSV(dataActions) {
  const headers = ['player_id', 'player_name', 'timestamp', 'data_action_type', 
                  'data_table_name', 'data_action_axis', 'data_action_variable', 'data_action_source'];
  
  const csvRows = [headers.join(',')];
  
  dataActions.results.forEach(action => {
    const row = [
      action.player_id,
      `"${action.player_name || ''}"`,
      action.timestamp,
      action.data_action_type,
      `"${action.data_table_name}"`,
      action.data_action_axis || '',
      `"${action.data_action_variable || ''}"`,
      `"${action.data_action_source || ''}"`
    ];
    
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

/**
 * Main function
 */
async function main() {
  try {
    // Fetch data actions
    const dataActions = await fetchDataActions();
    
    // Output basic stats
    console.log(chalk.green(`Found ${dataActions.count} data actions`));
    
    // Format and output the results based on specified format
    switch (options.output.toLowerCase()) {
      case 'json':
        console.log(JSON.stringify(dataActions, null, 2));
        break;
      case 'csv':
        console.log(formatAsCSV(dataActions));
        break;
      case 'table':
      default:
        console.log(formatAsTable(dataActions));
        break;
    }
    
    // Summary statistics
    if (dataActions.results.length > 0) {
      // Count by action type
      const actionTypeCounts = {};
      dataActions.results.forEach(action => {
        const type = action.data_action_type;
        actionTypeCounts[type] = (actionTypeCounts[type] || 0) + 1;
      });
      
      console.log(chalk.yellow('\nAction Types:'));
      Object.entries(actionTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`  ${type}: ${count} (${Math.round(count/dataActions.results.length*100)}%)`);
        });
      
      // Count by table name
      const tableNameCounts = {};
      dataActions.results.forEach(action => {
        const table = action.data_table_name;
        tableNameCounts[table] = (tableNameCounts[table] || 0) + 1;
      });
      
      console.log(chalk.yellow('\nData Tables:'));
      Object.entries(tableNameCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([table, count]) => {
          console.log(`  ${table}: ${count} (${Math.round(count/dataActions.results.length*100)}%)`);
        });
    }
  } catch (error) {
    console.error(chalk.red('Script execution failed:'), error);
    process.exit(1);
  }
}

// Run the script
main();