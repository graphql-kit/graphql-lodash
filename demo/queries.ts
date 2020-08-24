export const defaultQuery = `
# This is sample query with @_ directives which change the shape of response
# Run this query to see the resutls!
# More examples are hidden under Saved Queries dropdown above
{
  genderStats: allPeople @_(get: "people") {
    people @_(countBy: "gender") {
      gender
    }
  }
}`.trim();

const maxPopulationQuery = `
# Planet With Max Population
{
  planetWithMaxPopulation: allPlanets @_(get: "planets") {
    planets @_(maxBy: "population") {
      name
      population
    }
  }
}`.trim();

const genderStatsQuery = `
# Gender Stats
{
  genderStats: allPeople @_(get: "people") {
    people @_(countBy: "gender") {
      gender
    }
  }
}`.trim();

const mapPeopleToFilmsQuery = `
# Map People To Films
{
  peopleToFilms: allPeople @_(get: "people") {
    people @_(
      keyBy: "name"
      mapValues: "filmConnection.films"
    ) {
      name
      filmConnection {
        films @_(map: "title") {
          title
        }
      }
    }
  }
}`.trim();

export const savedQueries = [
  { query: maxPopulationQuery, variables: "" },
  { query: genderStatsQuery, variables: "" },
  { query: mapPeopleToFilmsQuery, variables: "" }
];
