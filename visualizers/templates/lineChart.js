/**
 * Line chart visualization generator
 */

export const generateLineChart = ({
  id,
  data,
  xKey,
  yKey,
  xLabel,
  yLabel,
  height = 400,
  colors,
  curveType = "curveLinear",
}) => {
  // Default color if not provided
  const chartColor = colors?.primary || "#4a6fa5";

  const dataJSON = JSON.stringify(data);

  return `
    <div class="line-chart" id="${id}-container" style="height: ${height}px;"></div>
    
    <script>
    (function() {
      // Parse the data
      const data = ${dataJSON};
      const xKey = "${xKey}";
      const yKey = "${yKey}";
      
      // Set up dimensions and margins
      const margin = {top: 20, right: 30, bottom: 60, left: 60};
      const width = document.getElementById('${id}-container').clientWidth - margin.left - margin.right;
      const height = ${height} - margin.top - margin.bottom;
      
      // Create the SVG container
      const svg = d3.select("#${id}-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      
      // Sort data by x value (important for proper line drawing)
      data.sort((a, b) => {
        const aVal = typeof a[xKey] === 'string' ? new Date(a[xKey]) : a[xKey];
        const bVal = typeof b[xKey] === 'string' ? new Date(b[xKey]) : b[xKey];
        return aVal - bVal;
      });
      
      // Set up scales
      const x = d3.scaleTime()
        .domain(d3.extent(data, d => typeof d[xKey] === 'string' ? new Date(d[xKey]) : d[xKey]))
        .range([0, width]);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yKey]) * 1.1]) // Add 10% padding at top
        .nice()
        .range([height, 0]);
      
      // Add x axis
      svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
      
      // Add y axis
      svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));
      
      // Add x axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text("${xLabel}");
      
      // Add y axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .text("${yLabel}");
      
      // Add the area
      svg.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", d3.area()
          .x(d => x(typeof d[xKey] === 'string' ? new Date(d[xKey]) : d[xKey]))
          .y0(height)
          .y1(d => y(d[yKey]))
          .curve(d3["${curveType}"])
        );
      
      // Add the line
      svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", d3.line()
          .x(d => x(typeof d[xKey] === 'string' ? new Date(d[xKey]) : d[xKey]))
          .y(d => y(d[yKey]))
          .curve(d3["${curveType}"])
        )
        .attr("stroke", "${chartColor}");
      
      // Add the points
      svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(typeof d[xKey] === 'string' ? new Date(d[xKey]) : d[xKey]))
        .attr("cy", d => y(d[yKey]))
        .attr("r", 4)
        .attr("fill", "${chartColor}")
        .attr("stroke", "white")
        .attr("stroke-width", 1.5)
        .append("title")
        .text(d => xKey + ": " + d[xKey] + "\n" + yKey + ": " + d[yKey]);
    })();
    </script>
  `;
};

export const generateMultiLineChart = ({
  id,
  data,
  lines,
  xKey,
  xLabel,
  yLabel,
  height = 400,
  colors,
}) => {
  // If no colors provided, use default color scheme
  const chartColors = colors || d3.schemeCategory10;

  const dataJSON = JSON.stringify(data);
  const linesJSON = JSON.stringify(lines);
  const colorsJSON = JSON.stringify(chartColors);

  return `
    <div class="line-chart" id="${id}-container" style="height: ${height}px;"></div>
    
    <script>
    (function() {
      // Parse the data
      const data = ${dataJSON};
      const lines = ${linesJSON};
      const colors = ${colorsJSON};
      const xKey = "${xKey}";
      
      // Set up dimensions and margins
      const margin = {top: 20, right: 150, bottom: 60, left: 60};
      const width = document.getElementById('${id}-container').clientWidth - margin.left - margin.right;
      const height = ${height} - margin.top - margin.bottom;
      
      // Create the SVG container
      const svg = d3.select("#${id}-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      
      // Sort data by x value (important for proper line drawing)
      data.sort((a, b) => {
        const aVal = typeof a[xKey] === 'string' ? new Date(a[xKey]) : a[xKey];
        const bVal = typeof b[xKey] === 'string' ? new Date(b[xKey]) : b[xKey];
        return aVal - bVal;
      });
      
      // Set up scales
      const x = d3.scaleTime()
        .domain(d3.extent(data, d => typeof d[xKey] === 'string' ? new Date(d[xKey]) : d[xKey]))
        .range([0, width]);
      
      // Find max y value across all lines
      const maxY = d3.max(lines, line => d3.max(data, d => d[line.key]));
      
      const y = d3.scaleLinear()
        .domain([0, maxY * 1.1]) // Add 10% padding at top
        .nice()
        .range([height, 0]);
      
      // Add x axis
      svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");
      
      // Add y axis
      svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));
      
      // Add x axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text("${xLabel}");
      
      // Add y axis label
      svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .text("${yLabel}");
      
      // Create color scale
      const color = d3.scaleOrdinal()
        .domain(lines.map(l => l.key))
        .range(colors);
      
      // Add the lines
      lines.forEach((line, i) => {
        svg.append("path")
          .datum(data)
          .attr("class", "line")
          .attr("d", d3.line()
            .x(d => x(typeof d[xKey] === 'string' ? new Date(d[xKey]) : d[xKey]))
            .y(d => y(d[line.key]))
            .curve(d3.curveMonotoneX)
          )
          .attr("stroke", color(line.key))
          .style("stroke-width", "2px");
        
        // Add points for this line
        svg.selectAll(\`circle-\${i}\`)
          .data(data.filter(d => d[line.key] !== null && d[line.key] !== undefined))
          .enter()
          .append("circle")
          .attr("cx", d => x(typeof d[xKey] === 'string' ? new Date(d[xKey]) : d[xKey]))
          .attr("cy", d => y(d[line.key]))
          .attr("r", 4)
          .attr("fill", color(line.key))
          .attr("stroke", "white")
          .attr("stroke-width", 1.5)
          .append("title")
          .text(d => xKey + ": " + d[xKey] + "\n" + line.label + ": " + d[line.key]);
      });
      
      // Add legend
      const legend = svg.append("g")
        .attr("transform", \`translate(\${width + 20}, 0)\`);
      
      lines.forEach((line, i) => {
        const legendRow = legend.append("g")
          .attr("transform", \`translate(0, \${i * 20})\`);
        
        legendRow.append("line")
          .attr("x1", 0)
          .attr("x2", 20)
          .attr("y1", 10)
          .attr("y2", 10)
          .attr("stroke", color(line.key))
          .style("stroke-width", "2px");
        
        legendRow.append("circle")
          .attr("cx", 10)
          .attr("cy", 10)
          .attr("r", 4)
          .attr("fill", color(line.key))
          .attr("stroke", "white")
          .attr("stroke-width", 1.5);
        
        legendRow.append("text")
          .attr("x", 25)
          .attr("y", 15)
          .text(line.label || line.key);
      });
    })();
    </script>
  `;
};
