/**
 * API Connector for Ilkmaar Data API
 * Provides functions to fetch data from the external API endpoints
 */

import axios from "axios";

const API_BASE_URL = "https://ilkmaar-data.fablevision-dev.com/api";

/**
 * Fetch data from a specific API endpoint with optional parameters
 * @param {String} endpoint - The API endpoint path (without leading slash)
 * @param {Object} params - Optional query parameters
 * @returns {Promise<Object>} The API response data
 */
export async function fetchFromEndpoint(endpoint, params = {}) {
  try {
    const url = `${API_BASE_URL}/${endpoint}`;

    // Add format=json to all requests
    const paramsWithFormat = {
      ...params,
      format: "json",
    };

    console.log(`Fetching data from ${url} with params:`, paramsWithFormat);

    const response = await axios.get(url, { params: paramsWithFormat });

    // Ensure response has the required fields for GraphQL schema
    const data = response.data;

    // If the response is missing a count field (required by GraphQL schema), add it
    if (data && typeof data.count === "undefined") {
      if (Array.isArray(data.results)) {
        data.count = data.results.length;
      } else if (Array.isArray(data)) {
        // If the data is an array, wrap it in the expected format
        return {
          count: data.length,
          next: null,
          previous: null,
          results: data,
        };
      } else {
        // Default count if we can't determine it
        data.count = 0;
      }
    }

    return data;
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error.message);

    // Provide more detailed error information for debugging
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    }

    throw new Error(`API fetch error: ${error.message}`);
  }
}

/**
 * Fetch data with pagination support
 * @param {String} endpoint - The API endpoint path
 * @param {Object} params - Query parameters
 * @param {Number} pageSize - Number of items per page
 * @returns {Promise<Array>} All data from paginated requests
 */
export async function fetchAllPages(endpoint, params = {}, pageSize = 100) {
  const allData = [];
  let page = 1;
  let hasMoreData = true;

  // Add pagination parameters
  const paginatedParams = {
    ...params,
    page_size: pageSize,
  };

  while (hasMoreData) {
    paginatedParams.page = page;
    const response = await fetchFromEndpoint(endpoint, paginatedParams);

    if (response.results && response.results.length > 0) {
      allData.push(...response.results);

      // Check if there's another page of data
      hasMoreData = response.next !== null;
      page++;
    } else {
      hasMoreData = false;
    }
  }

  return allData;
}

/**
 * Check if the API is accessible
 * @returns {Promise<Boolean>} True if API is accessible
 */
export async function checkApiStatus() {
  try {
    await axios.get(API_BASE_URL);
    return true;
  } catch (error) {
    console.error("API status check failed:", error.message);
    return false;
  }
}

/**
 * Get available API endpoints
 * @returns {Promise<Array>} List of available endpoints
 */
export async function getAvailableEndpoints() {
  try {
    const response = await axios.get(API_BASE_URL);
    return Object.keys(response.data);
  } catch (error) {
    console.error("Failed to fetch available endpoints:", error.message);
    return [];
  }
}
