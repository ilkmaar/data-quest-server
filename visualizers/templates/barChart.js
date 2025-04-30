/**
 * Bar chart visualization generator
 */

export const generateBarChart = ({
  id,
  data,
  xKey,
  yKey,
  xLabel,
  yLabel,
  height = 400,
  colors,
}) => {
  // Default color if not provided
  const chartColor = colors?.primary || "#4a6fa5";

  const dataJSON = JSON.stringify(data);

  return `
    <div class="bar-chart" id="${id}-container" style="height: ${height}px;"></div>
    
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
      
      // Set up scales
      const x = d3.scaleBand()
        .domain(data.map(d => d[xKey]))
        .range([0, width])
        .padding(0.2);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yKey])])
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
      
      // Create bars
      svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[xKey]))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d[yKey]))
        .attr("height", d => height - y(d[yKey]))
        .attr("fill", "${chartColor}")
        .append("title")
        .text(d => \`\${d[xKey]}: \${d[xKey]}\\n\${yKey}: \${d[yKey]}\`);
    })();
    </script>
  `;
};

export const generateGroupedBarChart = ({
  id,
  data,
  groups,
  categories,
  xLabel,
  yLabel,
  height = 500,
  colors,
}) => {
  // If no colors provided, use default color scheme
  const chartColors = colors || d3.schemeCategory10;

  const dataJSON = JSON.stringify(data);
  const groupsJSON = JSON.stringify(groups);
  const categoriesJSON = JSON.stringify(categories);
  const colorsJSON = JSON.stringify(chartColors);

  return `
    <div class="bar-chart" id="${id}-container" style="height: ${height}px;"></div>
    
    <script>
    (function() {
      // Parse the data
      const data = ${dataJSON};
      const groups = ${groupsJSON};
      const categories = ${categoriesJSON};
      const colors = ${colorsJSON};
      
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
      
      // Set up scales
      const x0 = d3.scaleBand()
        .domain(groups)
        .range([0, width])
        .padding(0.2);
      
      const x1 = d3.scaleBand()
        .domain(categories)
        .range([0, x0.bandwidth()])
        .padding(0.05);
      
      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d3.max(categories, c => d[c]))])
        .nice()
        .range([height, 0]);
      
      const color = d3.scaleOrdinal()
        .domain(categories)
        .range(colors);
      
      // Add x axis
      svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x0))
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
      
      // Create grouped bars
      svg.append("g")
        .selectAll("g")
        .data(data)
        .enter()
        .append("g")
        .attr("transform", d => "translate(" + x0(d.group) + ",0)")
        .selectAll("rect")
        .data(d => categories.map(key => ({key, value: d[key]})))
        .enter()
        .append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => color(d.key))
        .append("title")
        .text(d => d.key + ": " + d.value);
      
      // Add legend
      const legend = svg.append("g")
        .attr("transform", \`translate(\${width + 20}, 0)\`);
      
      categories.forEach((category, i) => {
        const legendRow = legend.append("g")
          .attr("transform", \`translate(0, \${i * 20})\`);
        
        legendRow.append("rect")
          .attr("width", 10)
          .attr("height", 10)
          .attr("fill", color(category));
        
        legendRow.append("text")
          .attr("x", 15)
          .attr("y", 10)
          .text(category);
      });
    })();
    </script>
  `;
};
