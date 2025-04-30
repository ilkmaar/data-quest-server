/**
 * HTML rendering utilities for visualization output
 */

import fs from 'fs';
import path from 'path';
import { generateBasePage } from '../templates/baseTemplate.js';

/**
 * Renders a complete HTML visualization and saves to file
 * @param {Object} options - Rendering options
 * @param {String} options.title - Visualization title
 * @param {String} options.description - Visualization description
 * @param {String} options.content - HTML content (charts, tables, etc)
 * @param {String} options.outputPath - Path to save rendered HTML
 * @returns {String} Path to saved file
 */
export const renderVisualization = ({ title, description, content, outputPath }) => {
  // Generate complete HTML document
  const html = generateBasePage({
    title,
    description,
    content
  });
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write HTML to file
  fs.writeFileSync(outputPath, html, 'utf8');
  
  return outputPath;
};

/**
 * Generates a data table in HTML format
 * @param {Array} data - Data array
 * @param {Array} columns - Column specifications [{ key, label }]
 * @returns {String} HTML for data table
 */
export const generateDataTable = (data, columns) => {
  if (!data || data.length === 0) {
    return '<div class="info-box">No data available</div>';
  }
  
  const headerRow = columns.map(col => `<th>${col.label || col.key}</th>`).join('');
  
  const rows = data.map(item => {
    const cells = columns.map(col => {
      let value = item[col.key];
      
      // Format value if needed
      if (col.format) {
        value = col.format(value, item);
      }
      
      return `<td>${value !== undefined && value !== null ? value : '-'}</td>`;
    }).join('');
    
    return `<tr>${cells}</tr>`;
  }).join('');
  
  return `
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>${headerRow}</tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

/**
 * Generates summary metrics in grid layout
 * @param {Array} metrics - Array of metrics [{ label, value }]
 * @returns {String} HTML for metrics grid
 */
export const generateMetrics = (metrics) => {
  if (!metrics || metrics.length === 0) {
    return '';
  }
  
  const metricBoxes = metrics.map(metric => `
    <div class="metric-box">
      <h3 class="metric-value">${metric.value}</h3>
      <p class="metric-label">${metric.label}</p>
    </div>
  `).join('');
  
  return `
    <div class="metric-grid">
      ${metricBoxes}
    </div>
  `;
};

/**
 * Creates a unique ID for chart elements
 * @returns {String} Unique chart ID
 */
export const generateChartId = () => {
  return `chart-${Math.random().toString(36).substring(2, 10)}`;
};
