/**
 * Timeline visualization generator
 */

export const generateTimeline = ({
  id,
  data,
  entityKey,
  startKey,
  endKey,
  labelKey,
  categoryKey,
  height = 400,
  colors,
}) => {
  // Default colors if not provided
  const categoryColors = colors || {
    data: "#9c27b0", // purple
    movement: "#808080", // light grey
    gathering: "#4caf50", // green
    treatment: "#e91e63", // pink
    giving: "#00bcd4", // cyan
    game: "#ff9800", // orange
    default: "#2196f3", // blue
  };

  const dataJSON = JSON.stringify(data);
  const colorsJSON = JSON.stringify(categoryColors);

  return `
    <div class="timeline" id="${id}-container" style="height: ${height}px;"></div>
    
    <script>
    (function() {
      // Parse the data
      const data = ${dataJSON};
      const entityKey = "${entityKey}";
      const startKey = "${startKey}";
      const endKey = "${endKey}";
      const labelKey = "${labelKey}";
      const categoryKey = "${categoryKey}";
      const categoryColors = ${colorsJSON};
      
      // Set up dimensions and margins
      const margin = {top: 40, right: 30, bottom: 40, left: 100};
      const width = document.getElementById('${id}-container').clientWidth - margin.left - margin.right;
      const height = ${height} - margin.top - margin.bottom;
      
      // Create the SVG container
      const svg = d3.select("#${id}-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      
      // Convert dates to Date objects if they are strings
      data.forEach(d => {
        if (typeof d[startKey] === 'string') d[startKey] = new Date(d[startKey]);
        if (typeof d[endKey] === 'string') d[endKey] = new Date(d[endKey]);
      });
      
      // Get unique entities and determine the time domain
      const entities = [...new Set(data.map(d => d[entityKey]))];
      const timeMin = d3.min(data, d => d[startKey]);
      const timeMax = d3.max(data, d => d[endKey]);
      
      // Set up scales
      const y = d3.scaleBand()
        .domain(entities)
        .range([0, height])
        .padding(0.2);
      
      const x = d3.scaleTime()
        .domain([timeMin, timeMax])
        .range([0, width]);
      
      // Add x axis (time)
      svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));
      
      // Add y axis (entities)
      svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));
      
      // Create timeline bars
      svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d[startKey]))
        .attr("y", d => y(d[entityKey]))
        .attr("width", d => Math.max(2, x(d[endKey]) - x(d[startKey]))) // Min width of 2px for visibility
        .attr("height", y.bandwidth())
        .attr("fill", d => {
          // Use the category color if available, otherwise use default
          const category = d[categoryKey];
          return category && categoryColors[category] ? categoryColors[category] : categoryColors.default;
        })
        .attr("rx", 3) // Rounded corners
        .attr("ry", 3)
        .append("title")
        .text(d => {
          const label = d[labelKey] ? \`\${d[labelKey]}\\n\` : '';
          const duration = (d[endKey] - d[startKey]) / 1000; // in seconds
          return \`\${label}\${d[entityKey]}\\n\` +
            \`Start: \${d[startKey].toLocaleString()}\\n\` +
            \`End: \${d[endKey].toLocaleString()}\\n\` +
            \`Duration: \${duration.toFixed(1)}s\\n\` +
            \`\${categoryKey}: \${d[categoryKey] || 'N/A'}\`;
        });
      
      // Add category legend if categoryKey is provided
      if (categoryKey) {
        // Get unique categories from data
        const categories = [...new Set(data.map(d => d[categoryKey]).filter(Boolean))];
        
        // Create legend
        const legend = svg.append("g")
          .attr("transform", \`translate(\${width - 150}, -30)\`);
        
        categories.forEach((category, i) => {
          const color = categoryColors[category] || categoryColors.default;
          
          const legendRow = legend.append("g")
            .attr("transform", \`translate(0, \${i * 20})\`);
          
          legendRow.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("rx", 3)
            .attr("ry", 3)
            .attr("fill", color);
          
          legendRow.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(category);
        });
      }
    })();
    </script>
  `;
};

export const generateGanttChart = ({
  id,
  data,
  taskKey,
  startKey,
  endKey,
  groupKey,
  progressKey,
  height = 400,
  colors,
}) => {
  // Default colors if not provided
  const chartColors = colors || {
    bar: "#4a6fa5",
    progress: "#166088",
    milestone: "#e91e63",
    group1: "#4caf50",
    group2: "#ff9800",
    group3: "#9c27b0",
  };

  const dataJSON = JSON.stringify(data);
  const colorsJSON = JSON.stringify(chartColors);

  return `
    <div class="gantt-chart" id="${id}-container" style="height: ${height}px;"></div>
    
    <script>
    (function() {
      // Parse the data
      const data = ${dataJSON};
      const taskKey = "${taskKey}";
      const startKey = "${startKey}";
      const endKey = "${endKey}";
      const groupKey = "${groupKey}";
      const progressKey = "${progressKey}";
      const chartColors = ${colorsJSON};
      
      // Convert dates to Date objects if they are strings
      data.forEach(d => {
        if (typeof d[startKey] === 'string') d[startKey] = new Date(d[startKey]);
        if (typeof d[endKey] === 'string') d[endKey] = new Date(d[endKey]);
        // Set default progress to 0 if not provided
        if (progressKey && !d[progressKey]) d[progressKey] = 0;
      });
      
      // Set up dimensions and margins
      const margin = {top: 40, right: 120, bottom: 40, left: 200};
      const width = document.getElementById('${id}-container').clientWidth - margin.left - margin.right;
      const height = ${height} - margin.top - margin.bottom;
      
      // Create the SVG container
      const svg = d3.select("#${id}-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      
      // Get unique tasks and determine the time domain
      const tasks = data.map(d => d[taskKey]);
      const timeMin = d3.min(data, d => d[startKey]);
      const timeMax = d3.max(data, d => d[endKey]);
      
      // Set up scales
      const y = d3.scaleBand()
        .domain(tasks)
        .range([0, height])
        .padding(0.2);
      
      const x = d3.scaleTime()
        .domain([timeMin, timeMax])
        .range([0, width]);
      
      // Create a color scale for groups if groupKey is provided
      let colorScale;
      if (groupKey) {
        const groups = [...new Set(data.map(d => d[groupKey]))].filter(Boolean);
        colorScale = d3.scaleOrdinal()
          .domain(groups)
          .range(Object.values(chartColors).slice(2)); // Use the group colors
      }
      
      // Add x axis (time)
      svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));
      
      // Add y axis (tasks)
      svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));
      
      // Add horizontal grid lines
      svg.append("g")
        .attr("class", "grid")
        .selectAll("line")
        .data(tasks)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", d => y(d) + y.bandwidth())
        .attr("y2", d => y(d) + y.bandwidth())
        .attr("stroke", "#e0e0e0")
        .attr("stroke-dasharray", "3,3");
      
      // Create task bars container
      const bars = svg.append("g")
        .selectAll(".task-bar")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "task-bar");
      
      // Add task bars
      bars.append("rect")
        .attr("x", d => x(d[startKey]))
        .attr("y", d => y(d[taskKey]))
        .attr("width", d => Math.max(3, x(d[endKey]) - x(d[startKey]))) // Min width of 3px
        .attr("height", y.bandwidth())
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("fill", d => {
          if (groupKey && d[groupKey]) {
            return colorScale(d[groupKey]);
          }
          return chartColors.bar;
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .append("title")
        .text(d => {
          const duration = (d[endKey] - d[startKey]) / (1000 * 60 * 60 * 24); // in days
          return \`\${d[taskKey]}\\n\` +
            \`Start: \${d[startKey].toLocaleDateString()}\\n\` +
            \`End: \${d[endKey].toLocaleDateString()}\\n\` +
            \`Duration: \${duration.toFixed(1)} days\` +
            (progressKey ? \`\\nProgress: \${d[progressKey]}%\` : '') +
            (groupKey && d[groupKey] ? \`\\nGroup: \${d[groupKey]}\` : '');
        });
      
      // Add progress bars if progressKey is provided
      if (progressKey) {
        bars.append("rect")
          .attr("x", d => x(d[startKey]))
          .attr("y", d => y(d[taskKey]))
          .attr("width", d => {
            const fullWidth = x(d[endKey]) - x(d[startKey]);
            return Math.max(0, (d[progressKey] / 100) * fullWidth);
          })
          .attr("height", y.bandwidth())
          .attr("rx", 3)
          .attr("ry", 3)
          .attr("fill", chartColors.progress);
      }
      
      // Add group legend if groupKey is provided
      if (groupKey) {
        const groups = [...new Set(data.map(d => d[groupKey]))].filter(Boolean);
        
        const legend = svg.append("g")
          .attr("transform", \`translate(\${width + 20}, 0)\`);
        
        groups.forEach((group, i) => {
          const legendRow = legend.append("g")
            .attr("transform", \`translate(0, \${i * 20})\`);
          
          legendRow.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("rx", 3)
            .attr("ry", 3)
            .attr("fill", colorScale(group));
          
          legendRow.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(group);
        });
      }
    })();
    </script>
  `;
};
