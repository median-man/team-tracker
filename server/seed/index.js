/* 
  Run this script to populate the database with example users, teams, and notes.
*/

(async () => {
  // Create users
  await Promise.all(
    seedData.map(async (userData) => {
      // Create teams belonging to the user
      // Create notes associated with the team
      // Create members associated with the team
    })
  );
})();
