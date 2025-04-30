/**
 * Base template for visualization reports
 */

export const generateBasePage = ({ title, description, content }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --primary-color: #4a6fa5;
      --secondary-color: #166088;
      --accent-color: #4caf50;
      --background-color: #f5f7fa;
      --text-color: #333;
      --section-bg-color: #fff;
      --border-color: #e0e0e0;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: var(--text-color);
      background-color: var(--background-color);
      margin: 0;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: var(--section-bg-color);
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 20px;
    }
    
    header {
      margin-bottom: 30px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 20px;
    }
    
    h1 {
      color: var(--primary-color);
      margin: 0 0 10px 0;
    }
    
    .description {
      color: #666;
      font-size: 1.1rem;
      margin-bottom: 10px;
    }
    
    .chart-container {
      background-color: var(--section-bg-color);
      border-radius: 8px;
      margin-bottom: 30px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .chart-title {
      color: var(--secondary-color);
      margin-top: 0;
      margin-bottom: 10px;
      font-size: 1.3rem;
    }
    
    .chart-description {
      color: #666;
      margin-bottom: 20px;
      font-size: 0.95rem;
    }
    
    .bar-chart, .line-chart {
      margin-top: 20px;
      overflow-x: auto;
    }
    
    .bar {
      fill: var(--primary-color);
      transition: fill 0.3s;
    }
    
    .bar:hover {
      fill: var(--secondary-color);
    }
    
    .line {
      fill: none;
      stroke: var(--primary-color);
      stroke-width: 2;
    }
    
    .area {
      fill: var(--primary-color);
      opacity: 0.1;
    }
    
    .axis {
      font-size: 12px;
    }
    
    .axis path,
    .axis line {
      stroke: #cccccc;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .data-table th {
      background-color: var(--primary-color);
      color: white;
      text-align: left;
      padding: 10px;
    }
    
    .data-table td {
      border-bottom: 1px solid var(--border-color);
      padding: 10px;
    }
    
    .data-table tr:nth-child(even) {
      background-color: rgba(0,0,0,0.02);
    }
    
    .metric-box {
      background-color: var(--section-bg-color);
      border-left: 4px solid var(--primary-color);
      padding: 15px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--primary-color);
      margin: 0;
    }
    
    .metric-label {
      color: #666;
      margin: 0;
    }
    
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .info-box {
      background-color: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 15px;
      margin-bottom: 20px;
    }
    
    .warning-box {
      background-color: #fff8e1;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin-bottom: 20px;
    }
    
    @media (max-width: 768px) {
      .metric-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${title}</h1>
      <div class="description">${description}</div>
    </header>
    <main>
      ${content}
    </main>
  </div>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script>
    // Any additional JavaScript can be added here
  </script>
</body>
</html>
  `;
};

export const generateChartContainer = ({ title, description, content }) => {
  return `
    <div class="chart-container">
      <h2 class="chart-title">${title}</h2>
      <div class="chart-description">${description}</div>
      ${content}
    </div>
  `;
};

export const generateMetricGrid = (metrics) => {
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

export const generateInfoBox = (content) => {
  return `
    <div class="info-box">
      ${content}
    </div>
  `;
};

export const generateWarningBox = (content) => {
  return `
    <div class="warning-box">
      ${content}
    </div>
  `;
};
