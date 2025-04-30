/**
 * Schema validation utilities for LLM-generated content
 */

/**
 * Validates GraphQL query against schema rules
 * @param {String} query - GraphQL query string
 * @returns {Object} Validation result {valid, errors}
 */
export const validateGraphQLQuery = (query) => {
  // Basic validation for now - we can expand this later
  const errors = [];
  
  // Check for required fields
  if (!query.includes('worldId')) {
    errors.push('Query is missing required worldId parameter');
  }
  
  // Check for basic query structure
  if (!query.includes('query') && !query.includes('{')) {
    errors.push('Invalid GraphQL query structure');
  }
  
  // Check for common syntax errors
  if ((query.match(/\{/g) || []).length !== (query.match(/\}/g) || []).length) {
    errors.push('Unbalanced braces in query');
  }
  
  // Check for valid endpoints
  const validEndpoints = [
    'playerSessionAnalytics',
    'playerActivityTimeline'
  ];
  
  const hasValidEndpoint = validEndpoints.some(endpoint => 
    query.includes(endpoint)
  );
  
  if (!hasValidEndpoint) {
    errors.push(`Query must use one of these endpoints: ${validEndpoints.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validates visualization specification
 * @param {Object} spec - Visualization specification
 * @returns {Object} Validation result {valid, errors}
 */
export const validateVisualizationSpec = (spec) => {
  const errors = [];
  
  // Required fields
  const requiredFields = [
    'visualizationType',
    'dataRequirements',
    'suggestedTitle'
  ];
  
  requiredFields.forEach(field => {
    if (!spec[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Valid visualization type
  const validTypes = [
    'bar chart',
    'line chart',
    'heatmap',
    'timeline',
    'gantt chart'
  ];
  
  if (spec.visualizationType && !validTypes.some(type => 
    spec.visualizationType.toLowerCase().includes(type)
  )) {
    errors.push(`Invalid visualization type: ${spec.visualizationType}. Must be one of: ${validTypes.join(', ')}`);
  }
  
  // Data requirements should be an array
  if (spec.dataRequirements && !Array.isArray(spec.dataRequirements)) {
    errors.push('dataRequirements must be an array');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validates transformation specification
 * @param {Object} spec - Transformation specification
 * @returns {Object} Validation result {valid, errors}
 */
export const validateTransformationSpec = (spec) => {
  const errors = [];
  
  // Required fields
  const requiredFields = [
    'transformationSteps',
    'expectedDataStructure',
    'visualizationParameters'
  ];
  
  requiredFields.forEach(field => {
    if (!spec[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Transformation steps should be an array
  if (spec.transformationSteps && !Array.isArray(spec.transformationSteps)) {
    errors.push('transformationSteps must be an array');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
