/**
 * Heatmap visualization generator
 */

export const generateHeatmap = ({
  id,
  data,
  xKey,
  yKey,
  valueKey,
  xLabel,
  yLabel,
  height = 400,
  colors,
}) => {
  // Default colors if not provided
  const colorScheme = colors?.scheme || ["#f7fbff", "#4292c6", "#08306b"];

  const dataJSON = JSON.stringify(data);

  return `
    <div class="heatmap" id="${id}-container" style="height: ${height}px;"></div>
    
    <script>
    (function() {
      // Parse the data
      const data = ${dataJSON};
      const xKey = "${xKey}";
      const yKey = "${yKey}";
      const valueKey = "${valueKey}";
      
      // Set up dimensions and margins
      const margin = {top: 40, right: 50, bottom: 80, left: 80};
      const width = document.getElementById('${id}-container').clientWidth - margin.left - margin.right;
      const height = ${height} - margin.top - margin.bottom;
      
      // Create the SVG container
      const svg = d3.select("#${id}-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      
      // Extract unique x and y values for our domain
      const xValues = [...new Set(data.map(d => d[xKey]))];
      const yValues = [...new Set(data.map(d => d[yKey]))];
      
      // Sort if they are numeric/dates
      if (typeof data[0][xKey] === 'number') {
        xValues.sort((a, b) => a - b);
      } else if (!isNaN(new Date(data[0][xKey]))) {
        xValues.sort((a, b) => new Date(a) - new Date(b));
      }
      
      if (typeof data[0][yKey] === 'number') {
        yValues.sort((a, b) => a - b);
      } else if (!isNaN(new Date(data[0][yKey]))) {
        yValues.sort((a, b) => new Date(a) - new Date(b));
      }
      
      // Set up scales
      const x = d3.scaleBand()
        .domain(xValues)
        .range([0, width])
        .padding(0.05);
      
      const y = d3.scaleBand()
        .domain(yValues)
        .range([height, 0])
        .padding(0.05);
      
      // Find min and max values for the color scale
      const minValue = d3.min(data, d => d[valueKey]);
      const maxValue = d3.max(data, d => d[valueKey]);
      
      // Color scale
      const colorScale = d3.scaleLinear()
        .domain([minValue, (minValue + maxValue) / 2, maxValue])
        .range(${JSON.stringify(colorScheme)});
      
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
      
      // Create heatmap cells
      svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d[xKey]))
        .attr("y", d => y(d[yKey]))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d[valueKey]))
        .append("title")
        .text(d => \`\${d[xKey]}: \${d[xKey]}\\n\${d[yKey]}: \${d[yKey]}\\n\${d[valueKey]}: \${d[valueKey]}\`);
      
      // Add color legend
      const legendWidth = 20;
      const legendHeight = height / 2;
      
      // Create gradient for legend
      const defs = svg.append("defs");
      const gradient = defs.append("linearGradient")
        .attr("id", "color-gradient-${id}")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");
      
      // Add color stops
      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(minValue));
        
      gradient.append("stop")
        .attr("offset", "50%")
        .attr("stop-color", colorScale((minValue + maxValue) / 2));
        
      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(maxValue));
      
      // Draw the legend rectangle and fill with gradient
      const legend = svg.append("g")
        .attr("transform", \`translate(\${width + 20}, \${height/4})\`);
        
      legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", \`url(#color-gradient-${id})\`);
      
      // Add legend axis
      const legendScale = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([legendHeight, 0]);
        
      const legendAxis = d3.axisRight(legendScale)
        .ticks(5);
        
      legend.append("g")
        .attr("transform", \`translate(\${legendWidth}, 0)\`)
        .call(legendAxis);
      
      // Add legend title
      legend.append("text")
        .attr("transform", \`translate(\${legendWidth/2}, -10)\`)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("${valueKey}");
    })();
    </script>
  `;
};
