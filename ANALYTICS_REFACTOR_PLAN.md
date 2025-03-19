# Game Analytics Report Refactoring Plan

## Priority 1: Tabbed Interface for Different Data Views

- Implement a tabbed navigation structure in the HTML report
- Each tab will focus on a specific aspect of the analytics:
  1. **Overview Tab**: Key metrics, insights, and high-level summaries
  2. **Player Engagement Tab**: Player-specific engagement metrics and patterns
  3. **Activity Analysis Tab**: Detailed breakdown of activity types and behaviors
  4. **Data Actions Tab**: Analysis of data-related activities
  5. **Social Dynamics Tab**: Co-presence and player collaboration patterns
  6. **Debug Tab**: Detailed session data for debugging

Implementation approach:

- Add tab navigation HTML/CSS at the top of the report
- Structure HTML generation to create content in separate div containers for each tab
- Add simple JavaScript to handle tab switching
- Ensure all existing data is preserved but organized more effectively

## Priority 2: Improved Session Action Sequence Visualization

- Create a detailed timeline view of player actions within sessions
- Focus on sequence patterns between:
  - Game actions (foraging, crafting, movement)
  - Data actions (visualization changes, data source selection, axis selection)

Implementation approach:

- Add a new `generateSessionTimelineView` function that:
  1. Processes `session.events` from existing data to extract chronological sequences
  2. Color-codes different action types (game vs data actions)
  3. Creates a visual timeline showing action sequences
  4. Includes timestamps to show timing between actions
  5. Groups similar consecutive actions to avoid clutter
  6. Adds filtering capabilities to focus on specific action types
- Create a dedicated section for this view in the "Player Engagement" tab
- Make the timeline expandable/collapsible per session for better usability

## Priority 3: Cross-Session Player Activity Timeline

- Implement a "swim lane" visualization showing player activities across time
- Each player will have their own horizontal lane on the y-axis
- Activities will be color-coded by type and shown chronologically

Implementation approach:

- Create a new `generatePlayerSwimlanesView` function that:
  1. Processes data from across all player sessions
  2. Creates a grid-based timeline with players on y-axis and time on x-axis
  3. Positions color-coded activity blocks based on timestamps
  4. Handles overlapping sessions appropriately
  5. Includes zoom/pan capabilities for navigating large timelines
  6. Adds tooltip information for each activity block
- Implement a date range selector to focus on specific time periods
- Add player filtering to show only selected players

## Technical Implementation Plan

1. Refactor the HTML report generation function into smaller, focused functions
2. Add CSS for new visualization components
3. Implement basic JavaScript for interactivity (tab switching, timeline navigation)
4. Ensure proper data processing in the analysis functions to support new visualizations
5. Update existing GraphQL queries if additional data is needed

This refactoring will enhance the analytics platform by providing better organization, more focused analysis, and improved visualization of player behavior patterns.
